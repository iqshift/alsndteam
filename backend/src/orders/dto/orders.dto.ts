import { IsString, IsPhoneNumber, IsNumber, IsOptional, IsUUID, Min } from 'class-validator';

export class CreateOrderDto {
  @IsString()
  customerPhone: string;

  @IsString()
  customerAddress: string;

  @IsString()
  @IsOptional()
  nearestLandmark?: string;

  @IsNumber()
  @Min(0)
  orderValue: number;

  @IsUUID()
  zoneId: string;
}

export class UpdateOrderStatusDto {
  @IsString()
  status:
    | 'assigned'
    | 'arrived_at_restaurant'
    | 'heading_to_customer'
    | 'delivered'
    | 'cancelled';
}

export class BroadcastResponseDto {
  @IsUUID()
  orderId: string;

  @IsString()
  response: 'accepted' | 'rejected';
}
