import { Controller, Get, Post, Patch, Body, Param, UseGuards } from '@nestjs/common';
import { OrdersService } from './orders.service';
import { DispatchService } from '../dispatch/dispatch.service';
import { CreateOrderDto, UpdateOrderStatusDto, BroadcastResponseDto } from './dto/orders.dto';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { RolesGuard } from '../common/guards/roles.guard';
import { UuidParam } from '../common/decorators/uuid.decorator';
import { Permissions } from '../common/decorators/permissions.decorator';

@Controller('orders')
@UseGuards(RolesGuard)
export class OrdersController {
  constructor(
    private ordersService: OrdersService,
    private dispatchService: DispatchService,
  ) {}

  // ─── Restaurant endpoints ───
  @Post()
  @Roles('restaurant')
  createOrder(@CurrentUser() user: any, @Body() dto: CreateOrderDto) {
    return this.ordersService.createOrder(user.id, dto);
  }

  @Post(':id/cancel')
  @Roles('restaurant')
  cancelOrder(@CurrentUser() user: any, @UuidParam('id') id: string) {
    return this.ordersService.cancelOrder(user.id, id);
  }

  @Get('restaurant')
  @Roles('restaurant')
  getRestaurantOrders(@CurrentUser() user: any) {
    return this.ordersService.getRestaurantOrders(user.id);
  }

  // ─── Driver endpoints ───
  @Get('driver')
  @Roles('driver')
  getDriverOrders(@CurrentUser() user: any) {
    return this.ordersService.getDriverOrders(user.id);
  }

  @Post('driver/accept')
  @Roles('driver')
  acceptOrder(@CurrentUser() user: any, @Body() dto: BroadcastResponseDto) {
    return this.ordersService.acceptOrder(user.id, dto.orderId);
  }

  @Post('driver/reject')
  @Roles('driver')
  rejectOrder(@CurrentUser() user: any, @Body() dto: BroadcastResponseDto) {
    return this.ordersService.rejectOrder(user.id, dto.orderId);
  }

  @Patch('driver/:id/status')
  @Roles('driver')
  updateStatus(
    @UuidParam('id') id: string,
    @CurrentUser() user: any,
    @Body() dto: UpdateOrderStatusDto,
  ) {
    return this.ordersService.updateOrderStatus(id, user.id, dto.status);
  }

  // ─── Admin endpoints ───
  @Get('admin')
  @Roles('admin')
  @Permissions({ resource: 'orders', action: 'read' })
  getAllOrders() {
    return this.ordersService.getAllOrders();
  }

  @Post('admin/assign')
  @Roles('admin')
  @Permissions({ resource: 'orders', action: 'update' })
  manuallyAssign(
    @CurrentUser() user: any,
    @Body() body: { orderId: string; driverId: string },
  ) {
    return this.ordersService.manuallyAssign(body.orderId, body.driverId, user.id);
  }

  // ─── Admin: Retry Broadcast ───
  @Post('admin/retry-broadcast')
  @Roles('admin')
  @Permissions({ resource: 'orders', action: 'update' })
  async retryBroadcast(@Body() body: { orderId: string }) {
    await this.dispatchService.broadcastOrder(body.orderId, 1);
    return { message: 'Broadcast retry triggered', orderId: body.orderId };
  }
}
