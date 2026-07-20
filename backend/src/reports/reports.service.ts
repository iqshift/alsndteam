import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ReportsService {
  constructor(private prisma: PrismaService) {}

  async getSummary(from: string, to: string) {
    const result = await this.prisma.$queryRaw`
      SELECT
        COUNT(*) as total_orders,
        COALESCE(SUM(delivery_price), 0) as total_delivery_revenue,
        COALESCE(SUM(driver_deduction), 0) as total_driver_deductions,
        COALESCE(
          AVG(EXTRACT(EPOCH FROM (delivered_at - created_at)) / 60),
          0
        ) as avg_delivery_time_minutes
      FROM orders
      WHERE created_at >= ${from}::timestamptz
        AND created_at <= ${to}::timestamptz + INTERVAL '1 day'
        AND status = 'delivered'
    `;

    const row = (result as any[])[0];
    return {
      totalOrders: parseInt(row.total_orders),
      totalDeliveryRevenue: parseFloat(row.total_delivery_revenue),
      totalDriverDeductions: parseFloat(row.total_driver_deductions),
      avgDeliveryTime: Math.round(parseFloat(row.avg_delivery_time_minutes)),
    };
  }

  async getDriversReport(from: string, to: string) {
    return this.prisma.$queryRaw`
      SELECT
        d.id,
        d.name,
        d.phone,
        COUNT(o.id) as total_deliveries,
        COALESCE(SUM(o.driver_deduction), 0) as total_earned,
        COALESCE(
          AVG(EXTRACT(EPOCH FROM (o.delivered_at - o.created_at)) / 60),
          0
        ) as avg_delivery_time
      FROM drivers d
      LEFT JOIN orders o ON o.driver_id = d.id
        AND o.status = 'delivered'
        AND o.created_at >= ${from}::timestamptz
        AND o.created_at <= ${to}::timestamptz + INTERVAL '1 day'
      GROUP BY d.id, d.name, d.phone
      ORDER BY total_deliveries DESC
    `;
  }

  async getZonesReport(from: string, to: string) {
    return this.prisma.$queryRaw`
      SELECT
        z.id,
        z.name,
        COUNT(o.id) as total_orders,
        COALESCE(SUM(o.delivery_price), 0) as total_revenue
      FROM zones z
      LEFT JOIN orders o ON o.zone_id = z.id
        AND o.created_at >= ${from}::timestamptz
        AND o.created_at <= ${to}::timestamptz + INTERVAL '1 day'
      GROUP BY z.id, z.name
      ORDER BY total_orders DESC
    `;
  }

  async getPlatformRevenue(from?: string, to?: string) {
    const orderWhere: any = {};
    const codeWhere: any = {};
    const txWhere: any = { type: 'deduction' };

    if (from && to) {
      const startDate = new Date(from);
      const endDate = new Date(to);
      endDate.setHours(23, 59, 59, 999);

      orderWhere.createdAt = { gte: startDate, lte: endDate };
      codeWhere.createdAt = { gte: startDate, lte: endDate };
      txWhere.createdAt = { gte: startDate, lte: endDate };
    }

    // 1. Fetch Orders
    const orders = await this.prisma.order.findMany({
      where: {
        ...orderWhere,
        OR: [
          { status: 'delivered' },
          { deliveryPrice: { gt: 0 } },
          { driverDeduction: { gt: 0 } },
        ],
      },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        orderNumber: true,
        deliveryPrice: true,
        driverDeduction: true,
        restaurantCommission: true,
        createdAt: true,
        restaurant: { select: { id: true, name: true } },
        driver: { select: { id: true, name: true, phone: true } },
        zone: { select: { id: true, name: true } },
      },
    });

    // 2. Fetch Recharge Codes
    const rechargeCodes = await this.prisma.rechargeCode.findMany({
      where: codeWhere,
      orderBy: { createdAt: 'desc' },
      include: {
        createdByEmployee: {
          select: { id: true, name: true },
        },
      },
    });

    const driverIds = rechargeCodes
      .map((c) => c.usedByDriverId)
      .filter((id): id is string => Boolean(id));

    const drivers = driverIds.length > 0
      ? await this.prisma.driver.findMany({
          where: { id: { in: driverIds } },
          select: { id: true, name: true, phone: true },
        })
      : [];

    const driverMap = new Map(drivers.map((d) => [d.id, d]));

    // 3. Fetch Driver Wallet Deductions (WalletTransaction table)
    const walletDeductions = await this.prisma.walletTransaction.findMany({
      where: txWhere,
      orderBy: { createdAt: 'desc' },
      include: {
        driver: { select: { id: true, name: true, phone: true } },
        order: {
          select: {
            id: true,
            orderNumber: true,
            restaurantCommission: true,
            driverDeduction: true,
            deliveryPrice: true,
            restaurant: { select: { id: true, name: true } },
            zone: { select: { id: true, name: true } },
          },
        },
      },
    });

    // Fetch System Settings for default ratio
    const adminSettings = await this.prisma.adminSettings.findUnique({
      where: { id: 'default' },
    });
    const settings = (adminSettings?.settings as any) || {};
    const defaultDriverD = settings.driverDeduction ?? 500;
    const defaultRestC = settings.restaurantCommission ?? 500;

    let rechargeCodesRevenue = 0;
    rechargeCodes.forEach((c) => {
      if (c.isUsed) {
        rechargeCodesRevenue += Number(c.value);
      }
    });

    let restaurantCommissions = 0;
    let driverDeductions = 0;

    // Process Orders
    orders.forEach((o) => {
      restaurantCommissions += Number(o.restaurantCommission || o.deliveryPrice || 0);
      driverDeductions += Number(o.driverDeduction || 0);
    });

    // Process Wallet Deductions (which combine Driver Deduction + Restaurant Commission)
    const deductionLogs = walletDeductions.map((tx) => {
      const amt = Number(tx.amount);
      let restComm = 0;
      let drivDed = 0;

      if (tx.order) {
        restComm = Number(tx.order.restaurantCommission || tx.order.deliveryPrice || 0);
        drivDed = Number(tx.order.driverDeduction || 0);
        if (restComm === 0 && drivDed === 0) {
          restComm = amt / 2;
          drivDed = amt / 2;
        }
      } else {
        if (defaultDriverD + defaultRestC > 0) {
          const ratio = defaultRestC / (defaultDriverD + defaultRestC);
          restComm = Math.round(amt * ratio);
          drivDed = amt - restComm;
        } else {
          restComm = Math.round(amt / 2);
          drivDed = amt - restComm;
        }
      }

      restaurantCommissions += restComm;
      driverDeductions += drivDed;

      return {
        id: tx.id,
        type: 'driver_deduction' as const,
        orderNumber: tx.order?.orderNumber || null,
        driver: tx.driver ? { id: tx.driver.id, name: tx.driver.name, phone: tx.driver.phone } : null,
        restaurantName: tx.order?.restaurant?.name || 'عمولة توصيل (مستقطعة عبر المحفظة)',
        zoneName: tx.order?.zone?.name || 'عموم بغداد',
        restaurantCommission: restComm,
        driverDeduction: drivDed,
        totalOrderRevenue: amt,
        createdAt: tx.createdAt,
      };
    });

    const totalRevenue = rechargeCodesRevenue + restaurantCommissions + driverDeductions;

    const rechargeLogs = rechargeCodes.map((c) => {
      const driver = c.usedByDriverId ? driverMap.get(c.usedByDriverId) || null : null;
      return {
        id: c.id,
        type: 'recharge_code' as const,
        amount: Number(c.value),
        code: c.code,
        isUsed: c.isUsed,
        createdByEmployee: c.createdByEmployee
          ? { id: c.createdByEmployee.id, name: c.createdByEmployee.name }
          : { id: 'admin', name: 'الأدمن الرئيسي' },
        usedByDriver: driver
          ? { id: driver.id, name: driver.name, phone: driver.phone }
          : null,
        createdAt: c.createdAt,
        usedAt: c.usedAt,
      };
    });

    const orderLogs = orders.map((o) => {
      const comm = Number(o.restaurantCommission || o.deliveryPrice || 0);
      const ded = Number(o.driverDeduction || 0);
      return {
        id: o.id,
        type: 'order' as const,
        orderNumber: o.orderNumber,
        driver: o.driver ? { id: o.driver.id, name: o.driver.name, phone: o.driver.phone } : null,
        restaurantName: o.restaurant?.name || 'غير معروف',
        zoneName: o.zone?.name || 'غير محدد',
        restaurantCommission: comm,
        driverDeduction: ded,
        totalOrderRevenue: comm + ded,
        createdAt: o.createdAt,
      };
    });

    const combinedOrderAndDeductionLogs = [...orderLogs, ...deductionLogs];

    return {
      summary: {
        totalRevenue,
        rechargeCodesRevenue,
        restaurantCommissions,
        driverDeductions,
        totalRechargeCodesCount: rechargeCodes.length,
        usedRechargeCodesCount: rechargeCodes.filter((c) => c.isUsed).length,
        totalDeliveredOrdersCount: orders.length > 0 ? orders.length : walletDeductions.length,
      },
      rechargeLogs,
      orderLogs: combinedOrderAndDeductionLogs,
      deductionLogs,
    };
  }
}
