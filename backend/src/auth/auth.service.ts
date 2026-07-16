import { Injectable, UnauthorizedException, ConflictException, BadRequestException } from '@nestjs/common';
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
}
