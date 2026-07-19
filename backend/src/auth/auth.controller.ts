import { Controller, Post, Body, HttpCode, HttpStatus, Put, Request, UnauthorizedException, Get, Delete, Param } from '@nestjs/common';
import { AuthService } from './auth.service';
import {
  RegisterRestaurantDto,
  RegisterDriverDto,
  LoginDto,
  SendOtpDto,
  VerifyOtpDto,
  RefreshTokenDto,
  UpdateAdminProfileDto,
  CreateStaffDto,
  UpdateStaffDto,
} from './dto/auth.dto';
import { Public } from '../common/decorators/public.decorator';

@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Public()
  @Post('register/restaurant')
  registerRestaurant(@Body() dto: RegisterRestaurantDto) {
    return this.authService.registerRestaurant(dto);
  }

  @Public()
  @Post('register/driver')
  registerDriver(@Body() dto: RegisterDriverDto) {
    return this.authService.registerDriver(dto);
  }

  @Public()
  @Post('login')
  @HttpCode(HttpStatus.OK)
  login(@Body() dto: LoginDto) {
    return this.authService.login(dto.phone, dto.password, dto.userType);
  }

  @Public()
  @Post('otp/send')
  sendOtp(@Body() dto: SendOtpDto) {
    return this.authService.sendOtp(dto.phone);
  }

  @Public()
  @Post('otp/verify')
  verifyOtp(@Body() dto: VerifyOtpDto) {
    return this.authService.verifyOtpLogin(dto.phone, dto.code, dto.userType);
  }

  @Public()
  @Post('refresh')
  refresh(@Body() dto: RefreshTokenDto) {
    return this.authService.refreshToken(dto.refreshToken);
  }

  @Get('profile')
  getProfile(@Request() req) {
    if (!req.user) {
      throw new UnauthorizedException('يجب تسجيل الدخول');
    }
    return req.user;
  }

  @Put('profile')
  updateProfile(@Request() req, @Body() dto: UpdateAdminProfileDto) {
    if (!req.user || req.user.userType !== 'admin') {
      throw new UnauthorizedException('يجب تسجيل الدخول كمشرف لتعديل الملف الشخصي');
    }
    return this.authService.updateAdminProfile(req.user.id, dto);
  }

  @Get('staff')
  getAllStaff(@Request() req) {
    if (!req.user || req.user.userType !== 'admin' || req.user.role !== 'admin') {
      throw new UnauthorizedException('هذه الصلاحية للمشرف الرئيسي فقط');
    }
    return this.authService.getAllStaff();
  }

  @Post('staff')
  createStaff(@Request() req, @Body() dto: CreateStaffDto) {
    if (!req.user || req.user.userType !== 'admin' || req.user.role !== 'admin') {
      throw new UnauthorizedException('هذه الصلاحية للمشرف الرئيسي فقط');
    }
    return this.authService.createStaff(dto);
  }

  @Put('staff/:id')
  updateStaff(@Request() req, @Param('id') id: string, @Body() dto: UpdateStaffDto) {
    if (!req.user || req.user.userType !== 'admin' || req.user.role !== 'admin') {
      throw new UnauthorizedException('هذه الصلاحية للمشرف الرئيسي فقط');
    }
    return this.authService.updateStaff(id, dto);
  }

  @Delete('staff/:id')
  deleteStaff(@Request() req, @Param('id') id: string) {
    if (!req.user || req.user.userType !== 'admin' || req.user.role !== 'admin') {
      throw new UnauthorizedException('هذه الصلاحية للمشرف الرئيسي فقط');
    }
    return this.authService.deleteStaff(id);
  }
}
