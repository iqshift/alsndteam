import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { EventsGateway } from '../events/events.gateway';

@Injectable()
export class WalletService {
  constructor(
    private prisma: PrismaService,
    private events: EventsGateway,
  ) {}

  // ─── Get Code Settings ───
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

  // ─── Driver: Get Balance ───
  async getBalance(driverId: string) {
    const driver = await this.prisma.driver.findUnique({
      where: { id: driverId },
      select: { walletBalance: true },
    });
    if (!driver) throw new NotFoundException('Driver not found');
    return { balance: driver.walletBalance };
  }

  // ─── Driver: Recharge with Code ───
  async recharge(driverId: string, code: string) {
    const result = await this.prisma.$transaction(async (tx) => {
      // Find and validate code
      const rechargeCode = await tx.rechargeCode.findUnique({
        where: { code },
      });

      if (!rechargeCode) {
        throw new BadRequestException('Invalid recharge code');
      }
      if (rechargeCode.isUsed) {
        throw new BadRequestException('Code already used');
      }

      // Mark code as used
      await tx.rechargeCode.update({
        where: { id: rechargeCode.id },
        data: {
          isUsed: true,
          usedByDriverId: driverId,
          usedAt: new Date(),
        },
      });

      // Update driver balance
      const driver = await tx.driver.update({
        where: { id: driverId },
        data: {
          walletBalance: {
            increment: rechargeCode.value,
          },
        },
      });

      // Record transaction
      await tx.walletTransaction.create({
        data: {
          driverId,
          type: 'recharge',
          amount: rechargeCode.value,
          rechargeCodeId: rechargeCode.id,
          balanceAfter: driver.walletBalance,
        },
      });

      return driver.walletBalance;
    });

    return { balance: result, message: 'Recharge successful' };
  }

  // ─── Driver: Get Transaction History ───
  async getTransactions(driverId: string) {
    return this.prisma.walletTransaction.findMany({
      where: { driverId },
      orderBy: { createdAt: 'desc' },
      include: {
        order: {
          select: {
            id: true,
            orderNumber: true,
            orderValue: true,
            deliveryPrice: true,
            driverDeduction: true,
            restaurantCommission: true,
            restaurant: {
              select: {
                name: true,
                phone: true,
              },
            },
            zone: {
              select: {
                name: true,
              },
            },
          },
        },
        rechargeCode: { select: { code: true } },
      },
    });
  }

  // ─── Admin: Generate Recharge Codes ───
  async generateCodes(
    adminId: string,
    data: { value: number; count: number },
  ) {
    const settings = await this.getCodeSettings();
    const codes: string[] = [];
    for (let i = 0; i < data.count; i++) {
      const code = this.generateCode(settings);
      codes.push(code);
    }

    await this.prisma.rechargeCode.createMany({
      data: codes.map((code) => ({
        code,
        value: data.value,
      })),
    });

    // Audit log
    await this.prisma.auditLog.create({
      data: {
        actorType: 'admin',
        actorId: adminId,
        action: 'wallet.codes_generated',
        entityType: 'recharge_code',
        metadata: { count: data.count, value: data.value },
      },
    });

    return { codes, count: codes.length };
  }

  async getAllCodes() {
    return this.prisma.rechargeCode.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        createdByEmployee: {
          select: {
            id: true,
            name: true,
            phone: true,
          },
        },
        walletTransactions: {
          select: {
            driverId: true,
            createdAt: true,
            driver: {
              select: {
                id: true,
                name: true,
                phone: true,
                status: true,
                walletBalance: true,
                photo: true,
              },
            },
          },
        },
      },
    });
  }

  // ─── Admin: Get Driver Wallet Overview ───
  async getDriverWallets() {
    return this.prisma.driver.findMany({
      select: {
        id: true,
        name: true,
        phone: true,
        walletBalance: true,
        status: true,
      },
      orderBy: { walletBalance: 'desc' },
    });
  }

  // ─── Admin: Give Reward to Driver ───
  async rewardDriver(adminId: string, data: { driverId: string; amount: number; message: string }) {
    const result = await this.prisma.$transaction(async (tx) => {
      const driver = await tx.driver.findUnique({ where: { id: data.driverId } });
      if (!driver) throw new NotFoundException('Driver not found');

      const updated = await tx.driver.update({
        where: { id: data.driverId },
        data: {
          walletBalance: {
            increment: data.amount,
          },
        },
      });

      await tx.walletTransaction.create({
        data: {
          driverId: data.driverId,
          type: 'recharge',
          amount: data.amount,
          balanceAfter: updated.walletBalance,
        },
      });

      return updated.walletBalance;
    });

    // Send socket notification to the driver
    this.events.notifyDriverReward(data.driverId, {
      amount: data.amount,
      message: data.message,
    });

    // Audit log
    await this.prisma.auditLog.create({
      data: {
        actorType: 'admin',
        actorId: adminId,
        action: 'wallet.driver_rewarded',
        entityType: 'driver',
        entityId: data.driverId,
        metadata: { amount: data.amount, message: data.message },
      },
    });

    return { balance: result, message: 'Reward given successfully' };
  }

  private generateCode(settings: { codeLength: number; codeChars: string; codeSeparator: string; codeSeparatorEvery: number }): string {
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
