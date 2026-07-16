import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { DispatchService } from '../dispatch/dispatch.service';
import { EventsGateway } from '../events/events.gateway';
import { CreateOrderDto } from './dto/orders.dto';

@Injectable()
export class OrdersService {
  private readonly logger = new Logger(OrdersService.name);
  private readonly locks = new Map<string, string>();

  constructor(
    private prisma: PrismaService,
    private dispatch: DispatchService,
    private events: EventsGateway,
  ) {}

  // ─── Restaurant: Create Order ───
  async createOrder(restaurantId: string, dto: CreateOrderDto) {
    const zone = await this.prisma.zone.findUnique({ where: { id: dto.zoneId } });
    if (!zone || !zone.isActive) {
      throw new BadRequestException('Invalid or inactive zone');
    }

    const restaurant = await this.prisma.restaurant.findUnique({
      where: { id: restaurantId },
    });
    if (!restaurant) throw new NotFoundException('Restaurant not found');

    const adminSettings = await this.prisma.adminSettings.findUnique({
      where: { id: 'default' },
    });
    const settings = (adminSettings?.settings as any) || {};
    const driverDeduction = settings.driverDeduction ?? 500;

    let restaurantCommission = settings.restaurantCommission ?? 500;
    if (restaurant.billingMode === 'subscription') {
      const now = new Date();
      if (!restaurant.subscriptionExpiresAt || new Date(restaurant.subscriptionExpiresAt) > now) {
        restaurantCommission = 0;
      }
    }

    // Generate a unique 6-digit order number
    let orderNumber = 0;
    let exists = true;
    while (exists) {
      orderNumber = Math.floor(100000 + Math.random() * 900000); // 100000 to 999999
      const existingOrder = await this.prisma.order.findFirst({
        where: { orderNumber },
      });
      if (!existingOrder) {
        exists = false;
      }
    }

    let customerAddress = zone.name;
    if (zone.parentId) {
      const parentZone = await this.prisma.zone.findUnique({ where: { id: zone.parentId } });
      if (parentZone) {
        customerAddress = `${parentZone.name} - ${zone.name}`;
      }
    }

    const order = await this.prisma.order.create({
      data: {
        orderNumber,
        restaurantId,
        customerPhone: dto.customerPhone,
        customerAddress: customerAddress, // حفظ العنوان بصيغة (المنطقة - الحي) إن وجد قسم رئيسي تابع له
        nearestLandmark: dto.nearestLandmark,
        orderValue: dto.orderValue,
        zoneId: dto.zoneId,
        deliveryPrice: zone.deliveryPrice,
        driverDeduction: driverDeduction,
        restaurantCommission: restaurantCommission,
        status: 'searching_driver',
      },
    });

    // Update zone usage
    await this.prisma.restaurantZoneUsage.upsert({
      where: {
        restaurantId_zoneId: { restaurantId, zoneId: dto.zoneId },
      },
      update: {
        usageCount: { increment: 1 },
        lastUsedAt: new Date(),
      },
      create: { restaurantId, zoneId: dto.zoneId },
    });

    // Start dispatch cycle
    this.dispatch.broadcastOrder(order.id);

    return order;
  }

  // ─── Restaurant: Get Orders ───
  async getRestaurantOrders(restaurantId: string) {
    return this.prisma.order.findMany({
      where: { restaurantId },
      orderBy: { createdAt: 'desc' },
      include: {
        driver: { select: { id: true, name: true, phone: true, photo: true } },
        zone: { select: { name: true } },
      },
    });
  }

  // ─── Restaurant: Cancel Order ───
  async cancelOrder(restaurantId: string, orderId: string) {
    const order = await this.prisma.order.findUnique({ where: { id: orderId } });

    if (!order) throw new NotFoundException('Order not found');
    if (order.restaurantId !== restaurantId)
      throw new BadRequestException('Not your order');
    if (!['searching_driver', 'no_drivers_available'].includes(order.status))
      throw new BadRequestException('Cannot cancel order after a driver has accepted it');

    const cancelled = await this.prisma.order.update({
      where: { id: orderId },
      data: { status: 'cancelled', cancelledAt: new Date() },
    });

    // إلغاء jobs المعلقة في قائمة البث
    this.dispatch.cancelBroadcastJob(orderId);

    // إعلام السائقين بأن الطلب لم يعد متاحاً
    this.events.notifyOrderAccepted(orderId, null);

    // إرسال تحديث الحالة عبر Socket لتحديث واجهة المطعم
    this.events.broadcastOrderStatus(orderId, 'cancelled');

    this.logger.log(`Order ${orderId} cancelled by restaurant ${restaurantId}`);
    return cancelled;
  }

  // ─── Driver: Get My Orders ───
  async getDriverOrders(driverId: string) {
    return this.prisma.order.findMany({
      where: { driverId },
      orderBy: { createdAt: 'desc' },
      include: {
        restaurant: { select: { id: true, name: true, phone: true, lat: true, lng: true } },
        zone: { select: { name: true } },
      },
    });
  }

  // ─── Driver: Accept Order ───
  async acceptOrder(driverId: string, orderId: string) {
    // Simple in-memory lock to prevent race conditions
    const lockKey = `order_lock:${orderId}`;
    if (this.locks.has(lockKey)) {
      throw new BadRequestException('Order is no longer available');
    }
    this.locks.set(lockKey, driverId);

    try {
      const result = await this.prisma.$transaction(async (tx) => {
        // Verify order is still searching
        const order = await tx.order.findUnique({ where: { id: orderId } });
        if (!order || order.status !== 'searching_driver') {
          throw new BadRequestException('Order is no longer available');
        }

        // Update order
        const updatedOrder = await tx.order.update({
          where: { id: orderId },
          data: {
            driverId,
            status: 'assigned',
            assignedAt: new Date(),
          },
        });

        // Update driver availability
        await tx.driver.update({
          where: { id: driverId },
          data: { availabilityStatus: 'on_delivery' },
        });

        // Mark this broadcast as accepted
        await tx.orderBroadcast.updateMany({
          where: { orderId, driverId },
          data: { response: 'accepted', respondedAt: new Date() },
        });

        // Mark other pending broadcasts as expired
        await tx.orderBroadcast.updateMany({
          where: {
            orderId,
            driverId: { not: driverId },
            response: null,
          },
          data: { response: 'expired', respondedAt: new Date() },
        });

        return updatedOrder;
      });

      // Notify all other drivers that order is taken
      this.events.notifyOrderAccepted(orderId, driverId);

      // Cancel delayed job for this order
      this.dispatch.cancelBroadcastJob(orderId);

      return result;
    } catch (error) {
      this.locks.delete(lockKey);
      throw error;
    }
  }

  // ─── Driver: Reject Order ───
  async rejectOrder(driverId: string, orderId: string) {
    await this.prisma.orderBroadcast.updateMany({
      where: { orderId, driverId },
      data: { response: 'rejected', respondedAt: new Date() },
    });
    return { success: true };
  }

  // ─── Driver: Update Order Status ───
  async updateOrderStatus(
    orderId: string,
    driverId: string,
    status: string,
  ) {
    const order = await this.prisma.order.findUnique({ where: { id: orderId } });
    if (!order) throw new NotFoundException('Order not found');
    if (order.driverId !== driverId) throw new BadRequestException('Not your order');

    const validTransitions: Record<string, string[]> = {
      assigned: ['arrived_at_restaurant', 'cancelled'],
      arrived_at_restaurant: ['heading_to_customer'],
      heading_to_customer: ['delivered'],
    };

    if (!validTransitions[order.status]?.includes(status)) {
      throw new BadRequestException(`Cannot transition from ${order.status} to ${status}`);
    }

    const timestampField: Record<string, string> = {
      assigned: 'assignedAt',
      arrived_at_restaurant: 'arrivedRestaurantAt',
      heading_to_customer: 'pickedUpAt',
      delivered: 'deliveredAt',
      cancelled: 'cancelledAt',
    };

    const updateData: any = { status };
    if (timestampField[status]) {
      updateData[timestampField[status]] = new Date();
    }

    // If delivered, deduct from wallet
    if (status === 'delivered') {
      await this.prisma.$transaction(async (tx) => {
        const driver = await tx.driver.findUnique({ where: { id: driverId } });
        const totalDeduction = order.driverDeduction.toNumber() + order.restaurantCommission.toNumber();
        if (driver.walletBalance.toNumber() < totalDeduction) {
          throw new BadRequestException('Insufficient wallet balance');
        }

        const newBalance = driver.walletBalance.toNumber() - totalDeduction;

        const nextStatus = driver.availabilityStatus === 'offline' ? 'offline' : 'available';

        await tx.driver.update({
          where: { id: driverId },
          data: { walletBalance: newBalance, availabilityStatus: nextStatus },
        });

        await tx.order.update({
          where: { id: orderId },
          data: updateData,
        });

        await tx.walletTransaction.create({
          data: {
            driverId,
            type: 'deduction',
            amount: totalDeduction,
            orderId,
            balanceAfter: newBalance,
          },
        });
      });
    } else {
      await this.prisma.order.update({ where: { id: orderId }, data: updateData });
    }

    // Broadcast status update to room
    this.events.broadcastOrderStatus(orderId, status);

    return this.prisma.order.findUnique({ where: { id: orderId } });
  }

  // ─── Admin: Get All Orders ───
  async getAllOrders(filters?: { status?: string; restaurantId?: string; driverId?: string }) {
    const where: any = {};
    if (filters?.status) where.status = filters.status;
    if (filters?.restaurantId) where.restaurantId = filters.restaurantId;
    if (filters?.driverId) where.driverId = filters.driverId;

    return this.prisma.order.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        restaurant: { select: { id: true, name: true } },
        driver: {
          select: {
            id: true,
            name: true,
            phone: true,
            walletBalance: true,
            status: true,
            availabilityStatus: true,
          },
        },
        zone: { select: { id: true, name: true } },
      },
    });
  }

  // ─── Admin: Manually Assign ───
  async manuallyAssign(orderId: string, driverId: string, adminId: string) {
    const lockKey = `order_lock:${orderId}`;

    // Simple in-memory lock
    if (this.locks.has(lockKey)) {
      throw new BadRequestException('Order is currently being processed');
    }
    this.locks.set(lockKey, adminId);

    try {
      const result = await this.prisma.$transaction(async (tx) => {
        const order = await tx.order.findUnique({ where: { id: orderId } });
        if (!order || !['searching_driver', 'no_drivers_available'].includes(order.status)) {
          throw new BadRequestException('Order cannot be assigned');
        }

        const driver = await tx.driver.findUnique({ where: { id: driverId } });
        if (!driver || driver.status !== 'active') {
          throw new BadRequestException('Driver not available');
        }

        await tx.order.update({
          where: { id: orderId },
          data: {
            driverId,
            status: 'assigned',
            assignedManually: true,
            assignedByAdminId: adminId,
            assignedAt: new Date(),
          },
        });

        await tx.driver.update({
          where: { id: driverId },
          data: { availabilityStatus: 'on_delivery' },
        });

        // Expire all pending broadcasts
        await tx.orderBroadcast.updateMany({
          where: { orderId, response: null },
          data: { response: 'expired', respondedAt: new Date() },
        });

        // Log audit
        await tx.auditLog.create({
          data: {
            actorType: 'admin',
            actorId: adminId,
            action: 'order.manually_assigned',
            entityType: 'order',
            entityId: orderId,
            metadata: { driverId },
          },
        });

        return tx.order.findUnique({ where: { id: orderId } });
      });

      this.events.notifyOrderAccepted(orderId, driverId);
      this.dispatch.cancelBroadcastJob(orderId);

      return result;
    } catch (error) {
      this.locks.delete(lockKey);
      throw error;
    }
  }
}
