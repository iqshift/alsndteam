import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { EventsGateway } from '../events/events.gateway';

@Injectable()
export class SupportService {
  constructor(
    private prisma: PrismaService,
    private eventsGateway: EventsGateway,
  ) {}

  // ─── Driver: Get Chat History ───
  async getDriverMessages(driverId: string) {
    // Mark admin messages as read when driver opens the chat
    await this.prisma.supportMessage.updateMany({
      where: {
        driverId,
        sender: 'admin',
        isRead: false,
      },
      data: {
        isRead: true,
      },
    });

    return this.prisma.supportMessage.findMany({
      where: { driverId },
      orderBy: { createdAt: 'asc' },
    });
  }

  // ─── Driver: Send Message ───
  async sendDriverMessage(driverId: string, content: string) {
    const message = await this.prisma.supportMessage.create({
      data: {
        driverId,
        sender: 'driver',
        content,
        isRead: false,
      },
      include: {
        driver: {
          select: {
            id: true,
            name: true,
            phone: true,
            photo: true,
          },
        },
      },
    });

    // Broadcast message to admin dashboard in real-time
    if (this.eventsGateway.server) {
      this.eventsGateway.server.emit('new_support_message', message);
    }

    return message;
  }

  // ─── Admin: Get All Chats with Driver Info, Last Message & Unread Count ───
  async getAdminChats() {
    const driversWithMessages = await this.prisma.driver.findMany({
      where: {
        supportMessages: {
          some: {},
        },
      },
      select: {
        id: true,
        name: true,
        phone: true,
        photo: true,
        availabilityStatus: true,
        status: true,
      },
    });

    const chats = [];
    for (const driver of driversWithMessages) {
      const lastMessage = await this.prisma.supportMessage.findFirst({
        where: { driverId: driver.id },
        orderBy: { createdAt: 'desc' },
      });

      const unreadCount = await this.prisma.supportMessage.count({
        where: {
          driverId: driver.id,
          sender: 'driver',
          isRead: false,
        },
      });

      const activeOrder = await this.prisma.order.findFirst({
        where: {
          driverId: driver.id,
          status: {
            notIn: ['delivered', 'cancelled'],
          },
        },
        select: {
          id: true,
          orderNumber: true,
          status: true,
          customerPhone: true,
          nearestLandmark: true,
          deliveryPrice: true,
          orderValue: true,
        },
      });

      chats.push({
        driver,
        lastMessage,
        unreadCount,
        activeOrder,
      });
    }

    // Sort by last message time (newest first)
    chats.sort((a, b) => {
      const timeA = a.lastMessage?.createdAt ? new Date(a.lastMessage.createdAt).getTime() : 0;
      const timeB = b.lastMessage?.createdAt ? new Date(b.lastMessage.createdAt).getTime() : 0;
      return timeB - timeA;
    });

    return chats;
  }

  // ─── Admin: Get Chat Messages for specific Driver ───
  async getAdminChatMessages(driverId: string) {
    // Mark driver messages as read when admin opens the chat
    await this.prisma.supportMessage.updateMany({
      where: {
        driverId,
        sender: 'driver',
        isRead: false,
      },
      data: {
        isRead: true,
      },
    });

    // Notify clients that unread counts have changed
    if (this.eventsGateway.server) {
      this.eventsGateway.server.emit('support_chat_read', { driverId });
    }

    return this.prisma.supportMessage.findMany({
      where: { driverId },
      orderBy: { createdAt: 'asc' },
    });
  }

  // ─── Admin: Send Message to Driver ───
  async sendAdminMessage(driverId: string, content: string) {
    const driverExists = await this.prisma.driver.findUnique({
      where: { id: driverId },
    });
    if (!driverExists) throw new NotFoundException('السائق غير موجود');

    const message = await this.prisma.supportMessage.create({
      data: {
        driverId,
        sender: 'admin',
        content,
        isRead: false,
      },
    });

    // Broadcast message to driver app in real-time
    if (this.eventsGateway.server) {
      this.eventsGateway.server.emit('new_support_message', message);
    }

    return message;
  }

  // ─── Admin: Clear Chat History ───
  async clearChat(driverId: string) {
    await this.prisma.supportMessage.deleteMany({
      where: { driverId },
    });

    if (this.eventsGateway.server) {
      this.eventsGateway.server.emit('support_chat_cleared', { driverId });
    }

    return { success: true };
  }
}
