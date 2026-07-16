import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class OtpService {
  private readonly logger = new Logger(OtpService.name);
  private readonly otpStore = new Map<string, { code: string; expiresAt: number }>();

  constructor(private prisma: PrismaService) {}

  async generateOtp(phone: string): Promise<string> {
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    this.otpStore.set(phone, {
      code,
      expiresAt: Date.now() + 5 * 60 * 1000, // 5 minutes
    });
    this.logger.log(`OTP for ${phone}: ${code}`);
    // TODO: Integrate with SMS provider (e.g., Twilio, Unifonic)
    return code;
  }

  async verifyOtp(phone: string, code: string): Promise<boolean> {
    const stored = this.otpStore.get(phone);
    if (!stored) return false;
    if (Date.now() > stored.expiresAt) {
      this.otpStore.delete(phone);
      return false;
    }
    if (stored.code !== code) return false;
    this.otpStore.delete(phone);
    return true;
  }
}
