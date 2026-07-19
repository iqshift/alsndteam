import { Controller, Get, Patch, Body, Param, UseGuards, UseInterceptors, UploadedFile } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname } from 'path';
import { DriversService } from './drivers.service';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { RolesGuard } from '../common/guards/roles.guard';
import { UuidParam } from '../common/decorators/uuid.decorator';
import { Permissions } from '../common/decorators/permissions.decorator';
import * as fs from 'fs';

@Controller('drivers')
@UseGuards(RolesGuard)
export class DriversController {
  constructor(private driversService: DriversService) {}

  @Get('profile')
  @Roles('driver')
  getProfile(@CurrentUser() user: any) {
    return this.driversService.getProfile(user.id);
  }

  @Patch('availability')
  @Roles('driver')
  updateAvailability(
    @CurrentUser() user: any,
    @Body() body: { status: 'available' | 'offline' },
  ) {
    return this.driversService.updateAvailability(user.id, body.status);
  }

  @Patch('photo')
  @Roles('driver')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: (req, file, callback) => {
          const dir = './uploads/avatars';
          // التأكد من وجود المجلد
          if (!fs.existsSync(dir)){
            fs.mkdirSync(dir, { recursive: true });
          }
          callback(null, dir);
        },
        filename: (req, file, callback) => {
          const driverId = (req as any).user.id;
          const ext = extname(file.originalname);
          // تسمية الصورة باسم المعرف الفريد للسائق للتحديث التلقائي
          callback(null, `driver-${driverId}${ext}`);
        },
      }),
    }),
  )
  updatePhoto(
    @CurrentUser() user: any,
    @UploadedFile() file: any,
  ) {
    const photoUrl = `/uploads/avatars/${file.filename}`;
    return this.driversService.updatePhoto(user.id, photoUrl);
  }

  @Patch('location')
  @Roles('driver')
  updateLocation(
    @CurrentUser() user: any,
    @Body() body: { lat: number; lng: number },
  ) {
    return this.driversService.updateLocation(user.id, body.lat, body.lng);
  }

  @Get('admin')
  @Roles('admin')
  @Permissions({ resource: 'drivers', action: 'read' })
  findAll() {
    return this.driversService.findAll();
  }

  @Get('admin/available')
  @Roles('admin')
  @Permissions({ resource: 'drivers', action: 'read' })
  findAvailable() {
    return this.driversService.findAvailable();
  }

  @Patch('admin/:id/status')
  @Roles('admin')
  @Permissions({ resource: 'drivers', action: 'update' })
  updateStatus(@UuidParam('id') id: string, @Body() body: { status: string }) {
    return this.driversService.updateStatus(id, body.status);
  }

  @Get('admin/:id/details')
  @Roles('admin')
  @Permissions({ resource: 'drivers', action: 'read' })
  getDriverDetails(@UuidParam('id') id: string) {
    return this.driversService.getDriverDetailsForAdmin(id);
  }
}
