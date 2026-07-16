import { IsString, MinLength, IsNumber } from 'class-validator';

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
