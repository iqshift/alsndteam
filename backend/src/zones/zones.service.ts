import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ZonesService {
  constructor(private prisma: PrismaService) {}

  async create(data: {
    name: string;
    deliveryPrice: number;
    driverDeduction: number;
    boundaryGeoJson: any;
    isGroup?: boolean;
    parentId?: string | null;
  }) {
    // Store GeoJSON directly as JSON
    const deliveryPrice = data.isGroup ? 0 : data.deliveryPrice;
    const driverDeduction = data.isGroup ? 0 : data.driverDeduction;

    return this.prisma.zone.create({
      data: {
        name: data.name,
        deliveryPrice,
        driverDeduction,
        boundary: data.boundaryGeoJson || undefined,
        isGroup: data.isGroup ?? false,
        parentId: data.parentId || null,
      },
    });
  }

  async findAll() {
    return this.prisma.zone.findMany({
      include: {
        parent: {
          select: { id: true, name: true }
        }
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findActive() {
    return this.prisma.zone.findMany({
      where: { isActive: true },
      include: {
        parent: {
          select: { id: true, name: true }
        }
      },
      orderBy: { name: 'asc' },
    });
  }

  async findOne(id: string) {
    const zone = await this.prisma.zone.findUnique({
      where: { id },
      include: {
        parent: {
          select: { id: true, name: true }
        }
      }
    });
    if (!zone) throw new NotFoundException('Zone not found');
    return zone;
  }

  async update(
    id: string,
    data: {
      name?: string;
      deliveryPrice?: number;
      driverDeduction?: number;
      isActive?: boolean;
      boundaryGeoJson?: any;
      isGroup?: boolean;
      parentId?: string | null;
    },
  ) {
    await this.findOne(id);

    const updateData: any = {};
    if (data.name) updateData.name = data.name;
    if (data.deliveryPrice !== undefined) updateData.deliveryPrice = data.deliveryPrice;
    if (data.driverDeduction !== undefined) updateData.driverDeduction = data.driverDeduction;
    if (data.isActive !== undefined) updateData.isActive = data.isActive;
    if (data.isGroup !== undefined) updateData.isGroup = data.isGroup;
    if (data.parentId !== undefined) updateData.parentId = data.parentId || null;
    if (data.boundaryGeoJson) {
      updateData.boundary = data.boundaryGeoJson;
    }

    if (updateData.isGroup) {
      updateData.deliveryPrice = 0;
      updateData.driverDeduction = 0;
    }

    return this.prisma.zone.update({ where: { id }, data: updateData });
  }

  async delete(id: string) {
    await this.findOne(id);
    return this.prisma.zone.delete({ where: { id } });
  }

  // Get zone for a specific point (point-in-polygon check)
  async getZoneForPoint(lat: number, lng: number) {
    const zones = await this.prisma.zone.findMany({
      where: { isActive: true },
    });

    for (const zone of zones) {
      const boundary = zone.boundary as any;
      if (boundary && this.isPointInPolygon(lng, lat, boundary)) {
        return {
          id: zone.id,
          name: zone.name,
          deliveryPrice: zone.deliveryPrice,
          driverDeduction: zone.driverDeduction,
        };
      }
    }
    return null;
  }

  // Simple point-in-polygon check (ray casting algorithm)
  private isPointInPolygon(
    pointLng: number,
    pointLat: number,
    geoJson: any,
  ): boolean {
    if (!geoJson || !geoJson.coordinates) return false;

    const coordinates = geoJson.coordinates[0]; // First ring of polygon
    let inside = false;

    for (let i = 0, j = coordinates.length - 1; i < coordinates.length; j = i++) {
      const xi = coordinates[i][0];
      const yi = coordinates[i][1];
      const xj = coordinates[j][0];
      const yj = coordinates[j][1];

      const intersect =
        yi > pointLat !== yj > pointLat &&
        pointLng < ((xj - xi) * (pointLat - yi)) / (yj - yi) + xi;

      if (intersect) inside = !inside;
    }

    return inside;
  }

  // ─── Restaurant Zones (مناطق المطاعم - مجرد اسم فقط) ───
  async findAllRestaurantZones() {
    return this.prisma.restaurantZone.findMany({
      orderBy: { name: 'asc' },
      include: {
        _count: {
          select: { restaurants: true },
        },
      },
    });
  }

  async createRestaurantZone(name: string) {
    if (!name || !name.trim()) throw new BadRequestException('اسم منطقة المطعم مطلوب');
    return this.prisma.restaurantZone.create({
      data: { name: name.trim() },
    });
  }

  async updateRestaurantZone(id: string, name: string) {
    if (!name || !name.trim()) throw new BadRequestException('اسم منطقة المطعم مطلوب');
    return this.prisma.restaurantZone.update({
      where: { id },
      data: { name: name.trim() },
    });
  }

  async deleteRestaurantZone(id: string) {
    return this.prisma.restaurantZone.delete({
      where: { id },
    });
  }
}
