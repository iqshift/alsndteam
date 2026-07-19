import { Injectable, UnauthorizedException, ConflictException, BadRequestException, NotFoundException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcryptjs';
import { PrismaService } from '../prisma/prisma.service';
import { OtpService } from './otp.service';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwt: JwtService,
    private config: ConfigService,
    private otp: OtpService,
  ) {}

  // ─── Restaurant Registration ───
  async registerRestaurant(data: {
    name: string;
    phone: string;
    password: string;
    lat: number;
    lng: number;
  }) {
    const existing = await this.prisma.restaurant.findUnique({
      where: { phone: data.phone },
    });
    if (existing) throw new ConflictException('Phone already registered');

    const passwordHash = await bcrypt.hash(data.password, 10);

    const restaurant = await this.prisma.restaurant.create({
      data: {
        name: data.name,
        phone: data.phone,
        passwordHash,
        lat: data.lat,
        lng: data.lng,
      },
    });

    return this.generateTokens(restaurant.id, 'restaurant');
  }

  // ─── Driver Registration ───
  async registerDriver(data: {
    name: string;
    phone: string;
    password: string;
  }) {
    const existing = await this.prisma.driver.findUnique({
      where: { phone: data.phone },
    });
    if (existing) throw new ConflictException('Phone already registered');

    const passwordHash = await bcrypt.hash(data.password, 10);

    const driver = await this.prisma.driver.create({
      data: {
        name: data.name,
        phone: data.phone,
        passwordHash,
      },
    });

    return this.generateTokens(driver.id, 'driver');
  }

  // ─── Admin Registration (admin only) ───
  async registerAdmin(data: {
    name: string;
    phone: string;
    password: string;
  }) {
    const existing = await this.prisma.admin.findUnique({
      where: { phone: data.phone },
    });
    if (existing) throw new ConflictException('Phone already registered');

    const passwordHash = await bcrypt.hash(data.password, 10);

    const admin = await this.prisma.admin.create({
      data: {
        name: data.name,
        phone: data.phone,
        passwordHash,
      },
    });

    return this.generateTokens(admin.id, 'admin');
  }

  // ─── Login (all user types) ───
  async login(phone: string, password: string, userType: 'restaurant' | 'driver' | 'admin' | 'employee') {
    let user: any;

    if (userType === 'restaurant') {
      user = await this.prisma.restaurant.findUnique({ where: { phone } });
    } else if (userType === 'driver') {
      user = await this.prisma.driver.findUnique({ where: { phone } });
    } else if (userType === 'employee') {
      user = await this.prisma.employee.findUnique({ where: { phone } });
    } else {
      user = await this.prisma.admin.findUnique({ where: { phone } });
    }

    if (!user) throw new UnauthorizedException('Invalid credentials');
    if (user.status && user.status !== 'active') throw new UnauthorizedException('Account suspended');

    const passwordValid = await bcrypt.compare(password, user.passwordHash);
    if (!passwordValid) throw new UnauthorizedException('Invalid credentials');

    return this.generateTokens(user.id, userType);
  }

  // ─── Refresh Token ───
  async refreshToken(refreshToken: string) {
    try {
      const payload = this.jwt.verify(refreshToken, {
        secret: this.config.get('JWT_REFRESH_SECRET', this.config.get('JWT_SECRET')),
      });

      const stored = await this.prisma.refreshToken.findUnique({
        where: { token: refreshToken },
      });

      if (!stored || stored.expiresAt < new Date()) {
        throw new Error('Invalid refresh token');
      }

      await this.prisma.refreshToken.delete({ where: { token: refreshToken } });

      return this.generateTokens(payload.sub, payload.userType);
    } catch {
      throw new UnauthorizedException('Invalid refresh token');
    }
  }

  // ─── OTP Flow ───
  async sendOtp(phone: string) {
    await this.otp.generateOtp(phone);
    return { message: 'OTP sent successfully' };
  }

  async verifyOtpLogin(phone: string, code: string, userType: 'restaurant' | 'driver') {
    const valid = await this.otp.verifyOtp(phone, code);
    if (!valid) throw new BadRequestException('Invalid or expired OTP');

    let user: any;
    if (userType === 'restaurant') {
      user = await this.prisma.restaurant.findUnique({ where: { phone } });
    } else {
      user = await this.prisma.driver.findUnique({ where: { phone } });
    }

    if (!user) throw new UnauthorizedException('Phone not registered');

    return this.generateTokens(user.id, userType);
  }

  private async generateTokens(userId: string, userType: string) {
    const payload = { 
      sub: userId, 
      userType,
      nonce: Math.random().toString(36).substring(7) + Date.now()
    };

    const accessToken = this.jwt.sign(payload, {
      expiresIn: this.config.get('JWT_EXPIRES_IN', '15m'),
    });

    const refreshToken = this.jwt.sign(payload, {
      secret: this.config.get('JWT_REFRESH_SECRET', this.config.get('JWT_SECRET')),
      expiresIn: this.config.get('JWT_REFRESH_EXPIRES_IN', '7d'),
    });

    await this.prisma.refreshToken.create({
      data: {
        token: refreshToken,
        userId,
        userType,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      },
    });

    return { accessToken, refreshToken };
  }

  async updateAdminProfile(adminId: string, data: { name?: string; phone?: string; password?: string }) {
    if (data.phone) {
      const existing = await this.prisma.admin.findFirst({
        where: {
          phone: data.phone,
          NOT: { id: adminId }
        }
      });
      if (existing) throw new ConflictException('رقم الهاتف مسجل بالفعل لدى مشرف آخر');
    }

    const updateData: any = {};
    if (data.name) updateData.name = data.name;
    if (data.phone) updateData.phone = data.phone;
    if (data.password) {
      updateData.passwordHash = await bcrypt.hash(data.password, 10);
    }

    const updated = await this.prisma.admin.update({
      where: { id: adminId },
      data: updateData,
    });

    return {
      id: updated.id,
      name: updated.name,
      phone: updated.phone,
      role: updated.role,
    };
  }

  async getAllStaff() {
    return this.prisma.admin.findMany({
      where: { role: 'staff' },
      select: {
        id: true,
        name: true,
        phone: true,
        role: true,
        permissions: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async createStaff(data: { name: string; phone: string; password: string; permissions?: any }) {
    const existing = await this.prisma.admin.findUnique({
      where: { phone: data.phone },
    });
    if (existing) throw new ConflictException('رقم الهاتف مسجل مسبقاً لمشرف أو مساعد آخر');

    const passwordHash = await bcrypt.hash(data.password, 10);

    return this.prisma.admin.create({
      data: {
        name: data.name,
        phone: data.phone,
        passwordHash,
        role: 'staff',
        permissions: data.permissions || {},
      },
      select: {
        id: true,
        name: true,
        phone: true,
        role: true,
        permissions: true,
      },
    });
  }

  async updateStaff(id: string, data: { name?: string; phone?: string; password?: string; permissions?: any }) {
    const staff = await this.prisma.admin.findUnique({ where: { id } });
    if (!staff || staff.role !== 'staff') {
      throw new NotFoundException('حساب المساعد غير موجود');
    }

    if (data.phone) {
      const existing = await this.prisma.admin.findFirst({
        where: {
          phone: data.phone,
          NOT: { id },
        },
      });
      if (existing) throw new ConflictException('رقم الهاتف مسجل لمستخدم آخر');
    }

    const updateData: any = {};
    if (data.name) updateData.name = data.name;
    if (data.phone) updateData.phone = data.phone;
    if (data.permissions) updateData.permissions = data.permissions;
    if (data.password) {
      updateData.passwordHash = await bcrypt.hash(data.password, 10);
    }

    return this.prisma.admin.update({
      where: { id },
      data: updateData,
      select: {
        id: true,
        name: true,
        phone: true,
        role: true,
        permissions: true,
      },
    });
  }

  async deleteStaff(id: string) {
    const staff = await this.prisma.admin.findUnique({ where: { id } });
    if (!staff || staff.role !== 'staff') {
      throw new NotFoundException('حساب المساعد غير موجود');
    }

    await this.prisma.admin.delete({ where: { id } });
    return { message: 'تم حذف المساعد بنجاح' };
  }
}
