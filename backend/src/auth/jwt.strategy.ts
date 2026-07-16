import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    config: ConfigService,
    private prisma: PrismaService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: config.get('JWT_SECRET'),
    });
  }

  async validate(payload: { sub: string; userType: string }) {
    const { sub: userId, userType } = payload;

    if (userType === 'restaurant') {
      const restaurant = await this.prisma.restaurant.findUnique({
        where: { id: userId },
      });
      if (!restaurant || restaurant.status !== 'active') {
        throw new UnauthorizedException();
      }
      return { id: userId, userType: 'restaurant', ...restaurant };
    }

    if (userType === 'driver') {
      const driver = await this.prisma.driver.findUnique({
        where: { id: userId },
      });
      if (!driver || driver.status !== 'active') {
        throw new UnauthorizedException();
      }
      return { id: userId, userType: 'driver', ...driver };
    }

    if (userType === 'admin') {
      const admin = await this.prisma.admin.findUnique({
        where: { id: userId },
      });
      if (!admin) {
        throw new UnauthorizedException();
      }
      return { id: userId, userType: 'admin', ...admin };
    }

    if (userType === 'employee') {
      const employee = await this.prisma.employee.findUnique({
        where: { id: userId },
      });
      if (!employee || employee.status !== 'active') {
        throw new UnauthorizedException();
      }
      return { id: userId, userType: 'employee', ...employee };
    }

    throw new UnauthorizedException();
  }
}
