import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Queue, Worker, Job } from 'bullmq';
import { PrismaService } from '../prisma/prisma.service';
import { EventsGateway } from '../events/events.gateway';

@Injectable()
export class DispatchService implements OnModuleInit {
  private readonly logger = new Logger(DispatchService.name);
  private queue: Queue;
  private worker: Worker;
  readonly redis: any;

  // Configurable broadcast settings
  private readonly broadcastDelayMs: number;
  private readonly maxTiers: number;
  private readonly redisUrl: string;

  constructor(
    private prisma: PrismaService,
    private events: EventsGateway,
    private config: ConfigService,
  ) {
    this.redisUrl = this.config.get('REDIS_URL', 'redis://localhost:6379');
    this.broadcastDelayMs = this.config.get('BROADCAST_DELAY_MS', 3000); // 3 ثوانٍ بدلاً من 30 ثانية للتسريع التجريبي
    this.maxTiers = this.config.get('MAX_TIERS', 5);
  }

  onModuleInit() {
    const connection = { connection: { url: this.redisUrl } };

    this.queue = new Queue('order-broadcast', {
      ...connection,
      defaultJobOptions: {
        removeOnComplete: true,
        removeOnFail: true,
      },
    });

    this.worker = new Worker(
      'order-broadcast',
      async (job: Job) => {
        await this.handleBroadcastJob(job.data.orderId, job.data.tier);
      },
      {
        ...connection,
        concurrency: 10,
      },
    );

    this.worker.on('failed', (job, err) => {
      this.logger.error(`Broadcast job ${job?.id} failed: ${err.message}`);
    });
  }

  // ─── Broadcast to Nearby Drivers ───
  async broadcastOrder(orderId: string, tier: number = 1) {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: { restaurant: true },
    });

    if (!order || order.status !== 'searching_driver') return;

    // جلب الإعدادات من قاعدة البيانات
    const adminSettings = await this.prisma.adminSettings.findUnique({
      where: { id: 'default' },
    });
    const settings = (adminSettings?.settings as any) || {};
    const maxSearchDuration = settings.maxSearchDuration ?? 20; // بالدقائق
    const maxSearchRadius = settings.maxSearchRadius ?? 10;   // بالكيلومترات
    const driverDecisionDuration = settings.driverDecisionDuration ?? 30; // بالثواني

    // 1. التحقق من انتهاء دورة حياة الطلب (الوقت المنقضي)
    const elapsedMs = Date.now() - order.createdAt.getTime();
    if (elapsedMs >= maxSearchDuration * 60 * 1000) {
      this.logger.log(`Order ${orderId} search duration expired (${maxSearchDuration} min). Cancelling.`);
      await this.prisma.order.update({
        where: { id: orderId },
        data: { status: 'no_drivers_available', cancelledAt: new Date() },
      });
      // تحديث الحالة لتطبيق المطعم
      this.events.broadcastOrderStatus(orderId, 'no_drivers_available');
      // إخبار السائقين بإلغاء الإشعار العالق
      this.events.notifyOrderAccepted(orderId, null);
      return;
    }

    // 2. حساب المدى الحالي بناءً على الـ Tier الحالي
    const currentRadius = Math.min(maxSearchRadius, (maxSearchRadius / this.maxTiers) * tier);
    // حساب الاستقطاع الكلي المطلوب (استقطاع السائق + عمولة المطعم)
    const totalRequiredDeduction = Number(order.driverDeduction) + Number(order.restaurantCommission);

    // Find available drivers
    const allDrivers = await this.prisma.driver.findMany({
      where: {
        availabilityStatus: 'available',
        status: 'active',
        walletBalance: { gte: totalRequiredDeduction },
        locationUpdatedAt: {
          gte: new Date(Date.now() - 15 * 60 * 1000), // 15 minutes ago
        },
      },
      select: {
        id: true,
        name: true,
        phone: true,
        walletBalance: true,
        lat: true,
        lng: true,
      },
    });

    // Filter out drivers who already received this order
    const existingBroadcasts = await this.prisma.orderBroadcast.findMany({
      where: { orderId },
      select: { driverId: true },
    });
    const broadcastedDriverIds = new Set(
      existingBroadcasts.map((b) => b.driverId),
    );

    const filteredDrivers = allDrivers.filter(
      (d) => !broadcastedDriverIds.has(d.id),
    );

    // Calculate distance and sort
    const driversWithDistance = filteredDrivers
      .map((d) => ({
        ...d,
        distance: this.calculateDistance(
          Number(order.restaurant.lat),
          Number(order.restaurant.lng),
          Number(d.lat),
          Number(d.lng),
        ),
      }))
      .filter((d) => d.distance <= currentRadius) // فقط السائقين داخل النطاق الحالي
      .sort((a, b) => a.distance - b.distance);

    const slicedDrivers = driversWithDistance.slice(0, tier === 1 ? 5 : 10);

    if (slicedDrivers.length === 0) {
      // طالما لم تنتهِ مدة الـ 20 دقيقة، نستمر بالجدولة وتوسيع النطاق
      this.scheduleBroadcast(orderId, tier + 1);
      return;
    }

    // Record broadcasts
    for (const driver of slicedDrivers) {
      await this.prisma.orderBroadcast.create({
        data: {
          orderId,
          driverId: driver.id,
          tier,
        },
      });

      this.events.notifyDriverNewOrder(driver.id, {
        orderId,
        restaurantName: order.restaurant.name,
        deliveryPrice: order.deliveryPrice,
        driverDeduction: order.driverDeduction,
        restaurantCommission: order.restaurantCommission,
        orderValue: order.orderValue,
        customerAddress: order.customerAddress,
        tier,
        decisionDuration: driverDecisionDuration,
      });
    }

    this.scheduleBroadcast(orderId, tier + 1);

    this.logger.log(
      `Broadcast tier ${tier} (radius: ${currentRadius.toFixed(1)}km): order ${orderId} sent to ${slicedDrivers.length} drivers`,
    );
  }

  // ─── Calculate Distance (Haversine formula) ───
  private calculateDistance(
    lat1: number,
    lng1: number,
    lat2: number,
    lng2: number,
  ): number {
    const R = 6371; // Earth radius in km
    const dLat = this.toRad(lat2 - lat1);
    const dLng = this.toRad(lng2 - lng1);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.toRad(lat1)) *
        Math.cos(this.toRad(lat2)) *
        Math.sin(dLng / 2) *
        Math.sin(dLng / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  private toRad(deg: number): number {
    return deg * (Math.PI / 180);
  }

  // ─── Schedule Delayed Broadcast ───
  private async scheduleBroadcast(orderId: string, nextTier: number) {
    await this.queue.add(
      'next-tier',
      { orderId, tier: nextTier },
      {
        delay: this.broadcastDelayMs,
        jobId: `broadcast_${orderId}_tier_${nextTier}`,
      },
    );
  }

  // ─── Handle Broadcast Job ───
  private async handleBroadcastJob(orderId: string, tier?: number) {
    const order = await this.prisma.order.findUnique({ where: { id: orderId } });
    if (!order || order.status !== 'searching_driver') return;

    let nextTier = tier;
    if (!nextTier) {
      const lastBroadcast = await this.prisma.orderBroadcast.findFirst({
        where: { orderId },
        orderBy: { tier: 'desc' },
      });
      nextTier = (lastBroadcast?.tier || 0) + 1;
    }

    await this.broadcastOrder(orderId, nextTier);
  }


  // ─── Cancel Broadcast Job ───
  async cancelBroadcastJob(orderId: string) {
    const jobs = await this.queue.getJobs(['waiting', 'delayed']);
    for (const job of jobs) {
      if (job.data.orderId === orderId) {
        await job.remove();
      }
    }
  }
}
