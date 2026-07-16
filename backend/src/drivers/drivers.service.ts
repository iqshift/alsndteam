import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { EventsGateway } from '../events/events.gateway';

@Injectable()
export class DriversService {
  constructor(
    private prisma: PrismaService,
    private eventsGateway: EventsGateway,
  ) {}

  // ─── Driver: Update Availability ───
  async updateAvailability(driverId: string, status: 'available' | 'offline') {
    const updated = await this.prisma.driver.update({
      where: { id: driverId },
      data: { availabilityStatus: status },
    });

    // إرسال حدث فوري للمشرفين عبر السوكت
    this.eventsGateway.server.emit('driver_availability_changed', {
      driverId,
      status,
    });

    if (status === 'available' && updated.lat && updated.lng) {
      // البحث عن الطلبات النشطة القريبة
      try {
        const adminSettings = await this.prisma.adminSettings.findUnique({
          where: { id: 'default' },
        });
        const settings = (adminSettings?.settings as any) || {};
        const maxSearchRadius = settings.maxSearchRadius ?? 10;
        const driverDecisionDuration = settings.driverDecisionDuration ?? 30;

        const activeOrders = await this.prisma.order.findMany({
          where: {
            status: 'searching_driver',
          },
          include: {
            restaurant: true,
          },
        });

        let bestOrder = null;
        let minDistance = Infinity;

        for (const order of activeOrders) {
          const totalRequiredDeduction = Number(order.driverDeduction) + Number(order.restaurantCommission);
          if (Number(updated.walletBalance) < totalRequiredDeduction) continue;

          // حساب المسافة
          const dist = this.calculateDistance(
            Number(order.restaurant.lat),
            Number(order.restaurant.lng),
            Number(updated.lat),
            Number(updated.lng),
          );

          if (dist <= maxSearchRadius && dist < minDistance) {
            // التحقق من عدم بث الطلب لهذا السائق من قبل
            const alreadyBroadcasted = await this.prisma.orderBroadcast.findFirst({
              where: {
                orderId: order.id,
                driverId: driverId,
              },
            });

            if (!alreadyBroadcasted) {
              minDistance = dist;
              bestOrder = order;
            }
          }
        }

        if (bestOrder) {
          // تسجيل البث في قاعدة البيانات
          await this.prisma.orderBroadcast.create({
            data: {
              orderId: bestOrder.id,
              driverId: driverId,
              tier: 1,
            },
          });

          // إرسال الطلب فوراً للسائق عبر السوكت
          this.eventsGateway.notifyDriverNewOrder(driverId, {
            orderId: bestOrder.id,
            restaurantName: bestOrder.restaurant.name,
            deliveryPrice: bestOrder.deliveryPrice,
            driverDeduction: bestOrder.driverDeduction,
            restaurantCommission: bestOrder.restaurantCommission,
            orderValue: bestOrder.orderValue,
            customerAddress: bestOrder.customerAddress,
            tier: 1,
            decisionDuration: driverDecisionDuration,
          });
        }
      } catch (err) {
        console.error('Error auto-dispatching order to newly online driver:', err);
      }
    }

    return updated;
  }

  // ─── Calculate Distance (Haversine formula) ───
  private calculateDistance(
    lat1: number,
    lng1: number,
    lat2: number,
    lng2: number,
  ): number {
    const R = 6371; // Earth radius in km
    const dLat = (lat2 - lat1) * (Math.PI / 180);
    const dLng = (lng2 - lng1) * (Math.PI / 180);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1 * (Math.PI / 180)) *
        Math.cos(lat2 * (Math.PI / 180)) *
        Math.sin(dLng / 2) *
        Math.sin(dLng / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  // ─── Driver: Update Location ───
  async updateLocation(driverId: string, lat: number, lng: number) {
    return this.prisma.driver.update({
      where: { id: driverId },
      data: {
        lat,
        lng,
        locationUpdatedAt: new Date(),
      },
    });
  }

  // ─── Driver: Get Profile ───
  async getProfile(driverId: string) {
    const driver = await this.prisma.driver.findUnique({
      where: { id: driverId },
      select: {
        id: true,
        name: true,
        phone: true,
        availabilityStatus: true,
        walletBalance: true,
        status: true,
        photo: true,
      },
    });
    if (!driver) throw new NotFoundException('Driver not found');
    return driver;
  }

  // ─── Driver: Update Photo ───
  async updatePhoto(driverId: string, photo: string) {
    return this.prisma.driver.update({
      where: { id: driverId },
      data: { photo },
    });
  }

  // ─── Admin: Get All Drivers ───
  async findAll() {
    return this.prisma.driver.findMany({
      select: {
        id: true,
        name: true,
        phone: true,
        availabilityStatus: true,
        walletBalance: true,
        status: true,
        lat: true,
        lng: true,
        locationUpdatedAt: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  // ─── Admin: Get Available Drivers ───
  async findAvailable() {
    return this.prisma.driver.findMany({
      where: {
        availabilityStatus: 'available',
        status: 'active',
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
  }

  // ─── Admin: Suspend/Activate Driver ───
  async updateStatus(driverId: string, status: string) {
    return this.prisma.driver.update({
      where: { id: driverId },
      data: { status },
    });
  }

  // ─── Admin: Get Detailed Driver View ───
  async getDriverDetailsForAdmin(driverId: string) {
    const driver = await this.prisma.driver.findUnique({
      where: { id: driverId },
      include: {
        orders: {
          orderBy: { createdAt: 'desc' },
          take: 20,
          include: {
            restaurant: { select: { name: true } },
          },
        },
        walletTransactions: {
          orderBy: { createdAt: 'desc' },
          take: 20,
        },
      },
    });

    if (!driver) throw new NotFoundException('Driver not found');

    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    
    // Start of week (Sunday)
    const sunday = new Date(now);
    sunday.setDate(now.getDate() - now.getDay());
    sunday.setHours(0, 0, 0, 0);
    
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    const allCompletedOrders = await this.prisma.order.findMany({
      where: {
        driverId,
        status: 'delivered',
      },
      select: {
        createdAt: true,
        deliveryPrice: true,
      },
    });

    let ordersTodayCount = 0;
    let earningsToday = 0;
    let ordersWeekCount = 0;
    let earningsWeek = 0;
    let ordersMonthCount = 0;
    let earningsMonth = 0;
    let totalOrders = allCompletedOrders.length;
    let totalEarnings = 0;

    for (const order of allCompletedOrders) {
      const orderTime = new Date(order.createdAt);
      const deliveryPrice = Number(order.deliveryPrice);
      totalEarnings += deliveryPrice;

      if (orderTime >= todayStart) {
        ordersTodayCount++;
        earningsToday += deliveryPrice;
      }
      if (orderTime >= sunday) {
        ordersWeekCount++;
        earningsWeek += deliveryPrice;
      }
      if (orderTime >= monthStart) {
        ordersMonthCount++;
        earningsMonth += deliveryPrice;
      }
    }

    return {
      driver: {
        id: driver.id,
        name: driver.name,
        phone: driver.phone,
        availabilityStatus: driver.availabilityStatus,
        walletBalance: driver.walletBalance,
        status: driver.status,
        photo: driver.photo,
        createdAt: driver.createdAt,
      },
      stats: {
        today: { count: ordersTodayCount, earnings: earningsToday },
        week: { count: ordersWeekCount, earnings: earningsWeek },
        month: { count: ordersMonthCount, earnings: earningsMonth },
        allTime: { count: totalOrders, earnings: totalEarnings },
      },
      orders: driver.orders,
      transactions: driver.walletTransactions,
    };
  }
}

