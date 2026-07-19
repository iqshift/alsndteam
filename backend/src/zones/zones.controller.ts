import { Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ZonesService } from './zones.service';
import { Roles } from '../common/decorators/roles.decorator';
import { RolesGuard } from '../common/guards/roles.guard';
import { UuidParam } from '../common/decorators/uuid.decorator';
import { Permissions } from '../common/decorators/permissions.decorator';

@Controller('zones')
@UseGuards(RolesGuard)
export class ZonesController {
  constructor(private zonesService: ZonesService) {}

  @Post()
  @Roles('admin')
  @Permissions({ resource: 'zones', action: 'create' })
  create(
    @Body()
    body: {
      name: string;
      deliveryPrice: number;
      driverDeduction: number;
      boundaryGeoJson: any;
      isGroup?: boolean;
      parentId?: string | null;
    },
  ) {
    return this.zonesService.create(body);
  }

  @Get()
  findAll() {
    return this.zonesService.findAll();
  }

  @Get('active')
  findActive() {
    return this.zonesService.findActive();
  }

  @Get('point')
  getZoneForPoint(@Query('lat') lat: number, @Query('lng') lng: number) {
    return this.zonesService.getZoneForPoint(lat, lng);
  }

  @Get(':id')
  findOne(@UuidParam('id') id: string) {
    return this.zonesService.findOne(id);
  }

  @Put(':id')
  @Roles('admin')
  @Permissions({ resource: 'zones', action: 'update' })
  update(
    @UuidParam('id') id: string,
    @Body()
    body: {
      name?: string;
      deliveryPrice?: number;
      driverDeduction?: number;
      isActive?: boolean;
      boundaryGeoJson?: any;
      isGroup?: boolean;
      parentId?: string | null;
    },
  ) {
    return this.zonesService.update(id, body);
  }

  @Delete(':id')
  @Roles('admin')
  @Permissions({ resource: 'zones', action: 'delete' })
  delete(@UuidParam('id') id: string) {
    return this.zonesService.delete(id);
  }

  // ─── Restaurant Zones (مناطق المطاعم - مجرد اسم فقط) ───
  @Get('restaurant-zones/all')
  findAllRestaurantZones() {
    return this.zonesService.findAllRestaurantZones();
  }

  @Post('restaurant-zones')
  @Roles('admin')
  @Permissions({ resource: 'zones', action: 'create' })
  createRestaurantZone(@Body() body: { name: string }) {
    return this.zonesService.createRestaurantZone(body.name);
  }

  @Put('restaurant-zones/:id')
  @Roles('admin')
  @Permissions({ resource: 'zones', action: 'update' })
  updateRestaurantZone(@UuidParam('id') id: string, @Body() body: { name: string }) {
    return this.zonesService.updateRestaurantZone(id, body.name);
  }

  @Delete('restaurant-zones/:id')
  @Roles('admin')
  @Permissions({ resource: 'zones', action: 'delete' })
  deleteRestaurantZone(@UuidParam('id') id: string) {
    return this.zonesService.deleteRestaurantZone(id);
  }
}
