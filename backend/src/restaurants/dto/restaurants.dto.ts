import { IsString, IsNotEmpty, IsNumber, IsOptional, IsEnum, IsDateString, IsUUID } from 'class-validator';

export class CreateRestaurantDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsNotEmpty()
  phone: string;

  @IsString()
  @IsNotEmpty()
  password: string;

  @IsNumber()
  lat: number;

  @IsNumber()
  lng: number;

  @IsString()
  @IsOptional()
  imageUrl?: string;

  @IsString()
  @IsOptional()
  billingMode?: string;

  @IsString()
  @IsOptional()
  subscriptionExpiresAt?: string | null;

  @IsString()
  @IsOptional()
  restaurantZoneId?: string | null;
}

export class UpdateRestaurantDto {
  @IsString()
  @IsOptional()
  name?: string;

  @IsString()
  @IsOptional()
  phone?: string;

  @IsString()
  @IsOptional()
  password?: string;

  @IsNumber()
  @IsOptional()
  lat?: number;

  @IsNumber()
  @IsOptional()
  lng?: number;

  @IsString()
  @IsOptional()
  imageUrl?: string;

  @IsString()
  @IsOptional()
  billingMode?: string;

  @IsOptional()
  subscriptionExpiresAt?: string | null;

  @IsString()
  @IsOptional()
  restaurantZoneId?: string | null;
}
