import { IsString, MinLength, IsNumber, IsOptional, IsObject } from 'class-validator';

export class RegisterRestaurantDto {
  @IsString()
  @MinLength(2)
  name: string;

  @IsString()
  phone: string;

  @IsString()
  @MinLength(6)
  password: string;

  @IsNumber()
  lat: number;

  @IsNumber()
  lng: number;
}

export class RegisterDriverDto {
  @IsString()
  @MinLength(2)
  name: string;

  @IsString()
  phone: string;

  @IsString()
  @MinLength(6)
  password: string;
}

export class LoginDto {
  @IsString()
  phone: string;

  @IsString()
  password: string;

  @IsString()
  userType: 'restaurant' | 'driver' | 'admin' | 'employee';
}

export class SendOtpDto {
  @IsString()
  phone: string;
}

export class VerifyOtpDto {
  @IsString()
  phone: string;

  @IsString()
  code: string;

  @IsString()
  userType: 'restaurant' | 'driver';
}

export class RefreshTokenDto {
  @IsString()
  refreshToken: string;
}

export class UpdateAdminProfileDto {
  @IsString()
  @IsOptional()
  name?: string;

  @IsString()
  @IsOptional()
  phone?: string;

  @IsString()
  @IsOptional()
  @MinLength(6)
  password?: string;
}

export class CreateStaffDto {
  @IsString()
  name: string;

  @IsString()
  phone: string;

  @IsString()
  @MinLength(6)
  password: string;

  @IsObject()
  @IsOptional()
  permissions?: any;
}

export class UpdateStaffDto {
  @IsString()
  @IsOptional()
  name?: string;

  @IsString()
  @IsOptional()
  phone?: string;

  @IsString()
  @IsOptional()
  @MinLength(6)
  password?: string;

  @IsObject()
  @IsOptional()
  permissions?: any;
}
