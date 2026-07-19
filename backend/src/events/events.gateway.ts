import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  ConnectedSocket,
  MessageBody,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@WebSocketGateway({
  cors: { origin: '*' },
})
export class EventsGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;
  private readonly logger = new Logger(EventsGateway.name);

  constructor(private prisma: PrismaService) {}

  handleConnection(client: Socket) {
    this.logger.log(`Client connected: ${client.id}`);
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`Client disconnected: ${client.id}`);
  }

  // ─── Join Order Room ───
  @SubscribeMessage('join_order')
  handleJoinOrder(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { orderId: string },
  ) {
    client.join(`order:${data.orderId}`);
    this.logger.log(`Client ${client.id} joined order:${data.orderId}`);
  }

  // ─── Join Driver Room (for receiving new orders) ───
  @SubscribeMessage('join_driver')
  async handleJoinDriver(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { driverId: string },
  ) {
    client.join(`driver:${data.driverId}`);
    this.logger.log(`Client ${client.id} joined driver:${data.driverId}`);

    try {
      const activeBroadcasts = await this.prisma.orderBroadcast.findMany({
        where: {
          driverId: data.driverId,
          response: null,
          order: {
            status: 'searching_driver',
          },
        },
        include: {
          order: {
            include: {
              restaurant: { select: { name: true } },
            },
          },
        },
      });

      for (const b of activeBroadcasts) {
        client.emit('new_order', {
          orderId: b.orderId,
          restaurantName: b.order.restaurant.name,
          deliveryPrice: Number(b.order.deliveryPrice),
          driverDeduction: Number(b.order.driverDeduction),
          restaurantCommission: Number(b.order.restaurantCommission),
          orderValue: Number(b.order.orderValue),
          customerAddress: b.order.customerAddress,
          tier: b.tier,
          decisionDuration: 30,
        });
      }
    } catch (err: any) {
      this.logger.error(`Failed to send active broadcasts to reconnected driver ${data.driverId}: ${err.message}`);
    }
  }

  // ─── Driver Location Update ───
  @SubscribeMessage('driver_location_update')
  async handleDriverLocation(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { driverId: string; lat: number; lng: number },
  ) {
    await this.prisma.driver.update({
      where: { id: data.driverId },
      data: {
        lat: data.lat,
        lng: data.lng,
        locationUpdatedAt: new Date(),
      },
    });

    // Broadcast to admin dashboard
    this.server.emit('driver_location_changed', {
      driverId: data.driverId,
      lat: data.lat,
      lng: data.lng,
    });
  }

  // ─── Emit: All Drivers Locations (for admin) ───
  async emitAllDriverLocations() {
    const drivers = await this.prisma.driver.findMany({
      where: { lat: { not: null }, lng: { not: null } },
      select: { id: true, name: true, phone: true, lat: true, lng: true, availabilityStatus: true, locationUpdatedAt: true },
    });
    return drivers;
  }

  // ─── Emit: Wallet Reward for Driver ───
  notifyDriverReward(driverId: string, data: { amount: number; message: string }) {
    this.server.to(`driver:${driverId}`).emit('wallet_reward', data);
  }

  // ─── Emit: New Order for Driver ───
  notifyDriverNewOrder(driverId: string, orderData: any) {
    this.server.to(`driver:${driverId}`).emit('new_order', orderData);
  }

  // ─── Emit: Order Accepted (notify all drivers in order room) ───
  notifyOrderAccepted(orderId: string, acceptedDriverId: string | null) {
    this.server.to(`order:${orderId}`).emit('order_accepted', {
      orderId,
      driverId: acceptedDriverId,
    });

    // Also notify all online drivers that the order is no longer available
    this.server.emit('order_no_longer_available', { orderId });
  }

  // ─── Emit: Order Status Update ───
  broadcastOrderStatus(orderId: string, status: string) {
    this.server.to(`order:${orderId}`).emit('order_status_update', {
      orderId,
      status,
      timestamp: new Date().toISOString(),
    });
  }
}
