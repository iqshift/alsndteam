import { Injectable, NotFoundException, ConflictException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import * as bcrypt from 'bcryptjs';

@Injectable()
export class RestaurantsService {
  constructor(private prisma: PrismaService) {}

  // ─── Admin: Create Restaurant ───
  async create(data: {
    name: string;
    phone: string;
    password: string;
    lat: number;
    lng: number;
    adminId: string;
    imageUrl?: string;
    billingMode?: string;
    subscriptionExpiresAt?: string | null;
    restaurantZoneId?: string | null;
  }) {
    const existing = await this.prisma.restaurant.findUnique({
      where: { phone: data.phone },
    });
    if (existing) throw new ConflictException('Phone already registered');

    const passwordHash = await bcrypt.hash(data.password, 12);

    const restaurant = await this.prisma.restaurant.create({
      data: {
        name: data.name,
        phone: data.phone,
        passwordHash,
        lat: data.lat,
        lng: data.lng,
        imageUrl: data.imageUrl,
        billingMode: data.billingMode || undefined,
        subscriptionExpiresAt: data.subscriptionExpiresAt
          ? new Date(data.subscriptionExpiresAt)
          : data.billingMode === 'subscription'
            ? (() => { const d = new Date(); d.setDate(d.getDate() + 30); return d; })()
            : null,
        restaurantZoneId: data.restaurantZoneId || null,
      },
    });

    // Audit log
    await this.prisma.auditLog.create({
      data: {
        actorType: 'admin',
        actorId: data.adminId,
        action: 'restaurant.created',
        entityType: 'restaurant',
        entityId: restaurant.id,
        metadata: { name: data.name, phone: data.phone },
      },
    });

    return { id: restaurant.id, name: restaurant.name, phone: restaurant.phone, imageUrl: restaurant.imageUrl };
  }

  async getProfile(restaurantId: string) {
    const restaurant = await this.prisma.restaurant.findUnique({
      where: { id: restaurantId },
      select: {
        id: true,
        name: true,
        phone: true,
        lat: true,
        lng: true,
        status: true,
        imageUrl: true,
        billingMode: true,
        subscriptionExpiresAt: true,
        restaurantZoneId: true,
        restaurantZone: { select: { id: true, name: true } },
        createdAt: true,
      },
    });
    if (!restaurant) throw new NotFoundException('Restaurant not found');
    return restaurant;
  }

  // ─── Restaurant: Get Zones with Dynamic Pricing ───
  async getZones(restaurantId: string) {
    const restaurant = await this.prisma.restaurant.findUnique({
      where: { id: restaurantId },
      select: { restaurantZoneId: true },
    });

    const usages = await this.prisma.restaurantZoneUsage.findMany({
      where: { restaurantId },
      orderBy: { usageCount: 'desc' },
      include: {
        zone: {
          select: { id: true, name: true, deliveryPrice: true, driverDeduction: true, isActive: true, isGroup: true, parentId: true },
        },
      },
    });

    let targetZoneId = restaurant?.restaurantZoneId;
    if (!targetZoneId) {
      const defaultRZone = await this.prisma.restaurantZone.findFirst({
        where: { name: 'السيديه' },
      }) || await this.prisma.restaurantZone.findFirst();
      if (defaultRZone) {
        targetZoneId = defaultRZone.id;
      }
    }

    if (!targetZoneId) {
      return [];
    }

    // للمطاعم المربوطة بمنطقة مطعم: نمرر حصرياً الأحياء المسعرة لتلك المنطقة + مجموعاتها الرئيسية
    const dynamicPrices = await this.prisma.restaurantZonePrice.findMany({
      where: { restaurantZoneId: targetZoneId },
      include: {
        deliveryZone: {
          select: { id: true, name: true, isActive: true, isGroup: true, parentId: true },
        },
      },
    });

    const activePricedZoneMap = new Map<string, any>();
    const parentIdsToInclude = new Set<string>();

    dynamicPrices.forEach((p) => {
      if (p.deliveryZone && p.deliveryZone.isActive) {
        activePricedZoneMap.set(p.deliveryZoneId, {
          id: p.deliveryZone.id,
          name: p.deliveryZone.name,
          deliveryPrice: Number(p.deliveryPrice),
          driverDeduction: Number(p.driverDeduction),
          isGroup: p.deliveryZone.isGroup,
          parentId: p.deliveryZone.parentId,
        });
        if (p.deliveryZone.parentId) {
          parentIdsToInclude.add(p.deliveryZone.parentId);
        }
      }
    });

    // جلب المجموعات الرئيسية التابعة للأحياء المسعرة
    if (parentIdsToInclude.size > 0) {
      const parentGroups = await this.prisma.zone.findMany({
        where: { id: { in: Array.from(parentIdsToInclude) }, isActive: true, isGroup: true },
        select: { id: true, name: true, deliveryPrice: true, driverDeduction: true, isGroup: true, parentId: true },
      });
      parentGroups.forEach((g) => {
        if (!activePricedZoneMap.has(g.id)) {
          activePricedZoneMap.set(g.id, {
            ...g,
            deliveryPrice: 0,
            driverDeduction: 0,
          });
        }
      });
    }

    // فرز حسب الاستخدام الأكثر تكراراً للمطعم
    const usedMap = new Map(usages.map((u) => [u.zoneId, u]));
    const result = Array.from(activePricedZoneMap.values()).map((zone) => {
      const usage = usedMap.get(zone.id);
      return {
        ...zone,
        usageCount: usage ? usage.usageCount : 0,
        lastUsedAt: usage ? usage.lastUsedAt : null,
      };
    });

    return result;
  }

  async findAll() {
    return this.prisma.restaurant.findMany({
      select: {
        id: true,
        name: true,
        phone: true,
        status: true,
        imageUrl: true,
        lat: true,
        lng: true,
        billingMode: true,
        subscriptionExpiresAt: true,
        restaurantZoneId: true,
        restaurantZone: { select: { id: true, name: true } },
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async updateStatus(restaurantId: string, status: string) {
    return this.prisma.restaurant.update({
      where: { id: restaurantId },
      data: { status },
    });
  }

  async getRestaurantOrdersForAdmin(restaurantId: string, from?: string, to?: string) {
    const where: any = { restaurantId };
    
    if (from || to) {
      where.createdAt = {};
      if (from) {
        where.createdAt.gte = new Date(from);
      }
      if (to) {
        const toDate = new Date(to);
        toDate.setDate(toDate.getDate() + 1);
        where.createdAt.lte = toDate;
      }
    }

    return this.prisma.order.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        restaurant: { select: { id: true, name: true, phone: true } },
        driver: { select: { id: true, name: true, phone: true } },
        zone: { select: { id: true, name: true } },
      },
    });
  }

  async updateRestaurant(
    id: string,
    data: {
      name?: string;
      phone?: string;
      password?: string;
      lat?: number;
      lng?: number;
      imageUrl?: string;
      billingMode?: string;
      subscriptionExpiresAt?: string | null;
      restaurantZoneId?: string | null;
    },
  ) {
    const updateData: any = {};
    if (data.name !== undefined) updateData.name = data.name;
    if (data.phone !== undefined) updateData.phone = data.phone;
    if (data.lat !== undefined) updateData.lat = data.lat;
    if (data.lng !== undefined) updateData.lng = data.lng;
    if (data.imageUrl !== undefined) updateData.imageUrl = data.imageUrl;
    if (data.billingMode !== undefined) updateData.billingMode = data.billingMode;
    if (data.restaurantZoneId !== undefined) updateData.restaurantZoneId = data.restaurantZoneId || null;
    if (data.subscriptionExpiresAt !== undefined) {
      updateData.subscriptionExpiresAt = data.subscriptionExpiresAt ? new Date(data.subscriptionExpiresAt) : null;
    } else if (data.billingMode === 'subscription') {
      const d = new Date();
      d.setDate(d.getDate() + 30);
      updateData.subscriptionExpiresAt = d;
    }

    if (data.password) {
      updateData.passwordHash = await bcrypt.hash(data.password, 12);
    }

    return this.prisma.restaurant.update({
      where: { id },
      data: updateData,
    });
  }

  async deleteRestaurant(id: string) {
    // Delete usages
    await this.prisma.restaurantZoneUsage.deleteMany({
      where: { restaurantId: id },
    });

    // Delete broadcasts for this restaurant's orders
    await this.prisma.orderBroadcast.deleteMany({
      where: { order: { restaurantId: id } },
    });

    // Delete wallet transactions for this restaurant's orders
    await this.prisma.walletTransaction.deleteMany({
      where: { order: { restaurantId: id } },
    });

    // Delete orders
    await this.prisma.order.deleteMany({
      where: { restaurantId: id },
    });

    return this.prisma.restaurant.delete({
      where: { id },
    });
  }

  // ═══════════════════════════════════════════════════════════
  //  إدارة أسعار التوصيل الديناميكية (Restaurant Zone Pricing)
  // ═══════════════════════════════════════════════════════════

  // جلب كل أسعار التوصيل لمنطقة انطلاق محددة
  async getZonePrices(restaurantZoneId: string) {
    const rZone = await this.prisma.restaurantZone.findUnique({ where: { id: restaurantZoneId } });
    if (!rZone) throw new NotFoundException('منطقة المطعم غير موجودة');

    const prices = await this.prisma.restaurantZonePrice.findMany({
      where: { restaurantZoneId },
      include: {
        deliveryZone: { select: { id: true, name: true, isGroup: true, parentId: true, isActive: true } },
      },
      orderBy: { createdAt: 'asc' },
    });

    return prices;
  }

  // جلب كل مناطق الانطلاق التي لها أسعار مُعرَّفة (للعرض في الـ dropdown)
  async getAllZonePriceGroups() {
    return this.prisma.restaurantZone.findMany({
      orderBy: { name: 'asc' },
    });
  }

  // إنشاء أو تحديث سعر توصيل لزوج (منطقة المطعم ← حي التوصيل)
  async upsertZonePrice(data: {
    restaurantZoneId: string;
    deliveryZoneId: string;
    deliveryPrice: number;
    driverDeduction: number;
  }) {
    const [originZone, deliveryZone] = await Promise.all([
      this.prisma.restaurantZone.findUnique({ where: { id: data.restaurantZoneId } }),
      this.prisma.zone.findUnique({ where: { id: data.deliveryZoneId } }),
    ]);
    if (!originZone) throw new NotFoundException('منطقة المطعم غير موجودة');
    if (!deliveryZone) throw new NotFoundException('منطقة التوصيل غير موجودة');

    return this.prisma.restaurantZonePrice.upsert({
      where: {
        restaurantZoneId_deliveryZoneId: {
          restaurantZoneId: data.restaurantZoneId,
          deliveryZoneId: data.deliveryZoneId,
        },
      },
      create: {
        restaurantZoneId: data.restaurantZoneId,
        deliveryZoneId: data.deliveryZoneId,
        deliveryPrice: data.deliveryPrice,
        driverDeduction: data.driverDeduction,
      },
      update: {
        deliveryPrice: data.deliveryPrice,
        driverDeduction: data.driverDeduction,
      },
    });
  }

  // حذف سعر توصيل معين
  async deleteZonePrice(restaurantZoneId: string, deliveryZoneId: string) {
    return this.prisma.restaurantZonePrice.delete({
      where: {
        restaurantZoneId_deliveryZoneId: {
          restaurantZoneId,
          deliveryZoneId,
        },
      },
    });
  }
}
