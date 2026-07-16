import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
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
        createdAt: true,
      },
    });
    if (!restaurant) throw new NotFoundException('Restaurant not found');
    return restaurant;
  }

  async getZones(restaurantId: string) {
    const usages = await this.prisma.restaurantZoneUsage.findMany({
      where: { restaurantId },
      orderBy: { usageCount: 'desc' },
      include: {
        zone: {
          select: { id: true, name: true, deliveryPrice: true, driverDeduction: true, isActive: true, isGroup: true, parentId: true },
        },
      },
    });

    // Get all active zones
    const allZones = await this.prisma.zone.findMany({
      where: { isActive: true },
      select: { id: true, name: true, deliveryPrice: true, driverDeduction: true, isGroup: true, parentId: true },
    });

    // Merge: used zones first (sorted by usage), then unused zones
    const usedZoneIds = new Set(usages.map((u) => u.zoneId));
    const unusedZones = allZones.filter((z) => !usedZoneIds.has(z.id));

    return [
      ...usages.map((u) => ({
        ...u.zone,
        usageCount: u.usageCount,
        lastUsedAt: u.lastUsedAt,
      })),
      ...unusedZones,
    ];
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
    },
  ) {
    const updateData: any = {};
    if (data.name !== undefined) updateData.name = data.name;
    if (data.phone !== undefined) updateData.phone = data.phone;
    if (data.lat !== undefined) updateData.lat = data.lat;
    if (data.lng !== undefined) updateData.lng = data.lng;
    if (data.imageUrl !== undefined) updateData.imageUrl = data.imageUrl;
    if (data.billingMode !== undefined) updateData.billingMode = data.billingMode;
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
}

