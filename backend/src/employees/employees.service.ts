import { Injectable, BadRequestException, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import * as bcrypt from 'bcryptjs';

@Injectable()
export class EmployeesService {
  constructor(private prisma: PrismaService) {}

  // ─── Admin: Create Employee ───
  async createEmployee(data: { name: string; phone: string; password: string }) {
    const existing = await this.prisma.employee.findUnique({
      where: { phone: data.phone },
    });
    if (existing) throw new ConflictException('رقم الهاتف مسجل مسبقاً');

    const passwordHash = await bcrypt.hash(data.password, 12);

    return this.prisma.employee.create({
      data: {
        name: data.name,
        phone: data.phone,
        passwordHash,
      },
      select: {
        id: true,
        name: true,
        phone: true,
        status: true,
        createdAt: true,
      },
    });
  }

  // ─── Admin: Get All Employees ───
  async getAllEmployees() {
    const employees = await this.prisma.employee.findMany({
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        name: true,
        phone: true,
        status: true,
        createdAt: true,
        _count: {
          select: { rechargeCodes: true },
        },
      },
    });

    // Add today's codes count
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const results = await Promise.all(
      employees.map(async (emp) => {
        const todayCount = await this.prisma.rechargeCode.count({
          where: {
            createdByEmployeeId: emp.id,
            createdAt: { gte: todayStart },
          },
        });
        const todayValue = await this.prisma.rechargeCode.aggregate({
          where: {
            createdByEmployeeId: emp.id,
            createdAt: { gte: todayStart },
          },
          _sum: { value: true },
        });
        return {
          ...emp,
          totalCodes: emp._count.rechargeCodes,
          todayCodes: todayCount,
          todayValue: todayValue._sum.value || 0,
        };
      }),
    );

    return results;
  }

  // ─── Admin: Get Employee By ID ───
  async getEmployeeById(id: string) {
    const employee = await this.prisma.employee.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        phone: true,
        status: true,
        createdAt: true,
        _count: {
          select: { rechargeCodes: true },
        },
      },
    });
    if (!employee) throw new NotFoundException('الموظف غير موجود');
    return employee;
  }

  // ─── Admin: Update Employee Status ───
  async updateEmployeeStatus(id: string, status: string) {
    const employee = await this.prisma.employee.findUnique({ where: { id } });
    if (!employee) throw new NotFoundException('الموظف غير موجود');

    return this.prisma.employee.update({
      where: { id },
      data: { status },
      select: {
        id: true,
        name: true,
        phone: true,
        status: true,
      },
    });
  }

  // ─── Admin: Get Employee Report ───
  async getEmployeeReport(employeeId: string, period: 'daily' | 'weekly' | 'monthly') {
    const employee = await this.prisma.employee.findUnique({ where: { id: employeeId } });
    if (!employee) throw new NotFoundException('الموظف غير موجود');

    const dateRange = this.getDateRange(period);

    const codes = await this.prisma.rechargeCode.findMany({
      where: {
        createdByEmployeeId: employeeId,
        createdAt: { gte: dateRange.from, lte: dateRange.to },
      },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        code: true,
        value: true,
        isUsed: true,
        usedAt: true,
        createdAt: true,
      },
    });

    const stats = await this.prisma.rechargeCode.aggregate({
      where: {
        createdByEmployeeId: employeeId,
        createdAt: { gte: dateRange.from, lte: dateRange.to },
      },
      _count: true,
      _sum: { value: true },
    });

    const usedCount = await this.prisma.rechargeCode.count({
      where: {
        createdByEmployeeId: employeeId,
        createdAt: { gte: dateRange.from, lte: dateRange.to },
        isUsed: true,
      },
    });

    return {
      employee: {
        id: employee.id,
        name: employee.name,
        phone: employee.phone,
      },
      period,
      from: dateRange.from,
      to: dateRange.to,
      stats: {
        totalCodes: stats._count,
        totalValue: stats._sum.value || 0,
        usedCodes: usedCount,
        availableCodes: stats._count - usedCount,
      },
      codes,
    };
  }

  // ─── Admin: All Employees Summary Report ───
  async getAllEmployeesReport(period: 'daily' | 'weekly' | 'monthly') {
    const dateRange = this.getDateRange(period);

    const employees = await this.prisma.employee.findMany({
      where: { status: 'active' },
      select: { id: true, name: true, phone: true },
    });

    const results = await Promise.all(
      employees.map(async (emp) => {
        const stats = await this.prisma.rechargeCode.aggregate({
          where: {
            createdByEmployeeId: emp.id,
            createdAt: { gte: dateRange.from, lte: dateRange.to },
          },
          _count: true,
          _sum: { value: true },
        });
        return {
          ...emp,
          totalCodes: stats._count,
          totalValue: stats._sum.value || 0,
        };
      }),
    );

    const overall = await this.prisma.rechargeCode.aggregate({
      where: {
        createdByEmployeeId: { not: null },
        createdAt: { gte: dateRange.from, lte: dateRange.to },
      },
      _count: true,
      _sum: { value: true },
    });

    return {
      period,
      from: dateRange.from,
      to: dateRange.to,
      overall: {
        totalCodes: overall._count,
        totalValue: overall._sum.value || 0,
      },
      employees: results,
    };
  }

  // ─── Employee: Create Code ───
  async createCode(employeeId: string, value: number) {
    if (value < 1000) throw new BadRequestException('الحد الأدنى للبطاقة 1000 د.ع');

    const settings = await this.getCodeSettings();
    const code = this.generateCode(settings);

    const rechargeCode = await this.prisma.rechargeCode.create({
      data: {
        code,
        value,
        createdByEmployeeId: employeeId,
      },
    });

    return {
      id: rechargeCode.id,
      code: rechargeCode.code,
      value: rechargeCode.value,
      createdAt: rechargeCode.createdAt,
    };
  }

  // ─── Employee: Get Profile ───
  async getProfile(employeeId: string) {
    const employee = await this.prisma.employee.findUnique({
      where: { id: employeeId },
      select: {
        id: true,
        name: true,
        phone: true,
        status: true,
      },
    });
    if (!employee) throw new NotFoundException('الموظف غير موجود');
    return employee;
  }

  // ─── Employee: Get My Codes Today ───
  async getMyCodesToday(employeeId: string) {
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    return this.prisma.rechargeCode.findMany({
      where: {
        createdByEmployeeId: employeeId,
        createdAt: { gte: todayStart },
      },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        code: true,
        value: true,
        isUsed: true,
        createdAt: true,
      },
    });
  }

  // ─── Helpers ───
  private getDateRange(period: 'daily' | 'weekly' | 'monthly') {
    const now = new Date();
    const to = new Date(now);
    to.setHours(23, 59, 59, 999);

    const from = new Date(now);
    from.setHours(0, 0, 0, 0);

    if (period === 'weekly') {
      from.setDate(from.getDate() - 6);
    } else if (period === 'monthly') {
      from.setDate(from.getDate() - 29);
    }

    return { from, to };
  }

  private async getCodeSettings() {
    const settings = await this.prisma.adminSettings.findUnique({
      where: { id: 'default' },
    });
    const s = (settings?.settings as any) || {};
    return {
      codeLength: s.codeLength !== undefined && s.codeLength !== null ? s.codeLength : 12,
      codeChars: s.codeChars !== undefined && s.codeChars !== null ? s.codeChars : 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789',
      codeSeparator: s.codeSeparator !== undefined && s.codeSeparator !== null ? s.codeSeparator : '-',
      codeSeparatorEvery: s.codeSeparatorEvery !== undefined && s.codeSeparatorEvery !== null ? s.codeSeparatorEvery : 4,
    };
  }

  private generateCode(settings: {
    codeLength: number;
    codeChars: string;
    codeSeparator: string;
    codeSeparatorEvery: number;
  }): string {
    const { codeLength, codeChars, codeSeparator, codeSeparatorEvery } = settings;
    let code = '';
    for (let i = 0; i < codeLength; i++) {
      if (codeSeparator && codeSeparatorEvery > 0 && i > 0 && i % codeSeparatorEvery === 0) {
        code += codeSeparator;
      }
      code += codeChars.charAt(Math.floor(Math.random() * codeChars.length));
    }
    return code;
  }
}
