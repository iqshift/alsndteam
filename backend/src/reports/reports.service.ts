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
}
