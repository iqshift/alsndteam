
import { Controller, Get, Post, Patch, Put, Delete, Body, Param, Query, UseGuards, UseInterceptors, UploadedFile, Req } from '@nestjs/common';
import { RestaurantsService } from './restaurants.service';
import { SettingsService } from '../settings/settings.service';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { RolesGuard } from '../common/guards/roles.guard';
import { UuidParam } from '../common/decorators/uuid.decorator';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname } from 'path';
import { Request } from 'express';
import { CreateRestaurantDto, UpdateRestaurantDto } from './dto/restaurants.dto';

@Controller('restaurants')
@UseGuards(RolesGuard)
export class RestaurantsController {
  constructor(
    private restaurantsService: RestaurantsService,
    private settingsService: SettingsService,
  ) {}

  @Get('profile')
  @Roles('restaurant')
  getProfile(@CurrentUser() user: any) {
    return this.restaurantsService.getProfile(user.id);
  }

  @Get('zones')
  @Roles('restaurant')
  getZones(@CurrentUser() user: any) {
    return this.restaurantsService.getZones(user.id);
  }

  @Get('settings')
  @Roles('restaurant')
  async getSettings() {
    const s = await this.settingsService.getSettings();
    return { restaurantCommission: (s as any).restaurantCommission ?? 500 };
  }

  @Get('admin')
  @Roles('admin')
  findAll() {
    return this.restaurantsService.findAll();
  }

  @Post('admin/upload')
  @Roles('admin')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: './uploads',
        filename: (req, file, callback) => {
          const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
          const ext = extname(file.originalname);
          callback(null, `logo-${uniqueSuffix}${ext}`);
        },
      }),
    }),
  )
  uploadLogo(@UploadedFile() file: any, @Req() req: Request) {
    if (!file) {
      return { url: null };
    }
    const protocol = req.protocol;
    const host = req.get('host');
    return { url: `${protocol}://${host}/uploads/${file.filename}` };
  }

  @Post('admin')
  @Roles('admin')
  create(
    @CurrentUser() user: any,
    @Body() body: CreateRestaurantDto,
  ) {
    return this.restaurantsService.create({
      ...body,
      adminId: user.id,
    });
  }

  @Patch('admin/:id/status')
  @Roles('admin')
  updateStatus(@UuidParam('id') id: string, @Body() body: { status: string }) {
    return this.restaurantsService.updateStatus(id, body.status);
  }

  @Get('admin/:id/orders')
  @Roles('admin')
  getRestaurantOrders(
    @UuidParam('id') id: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    return this.restaurantsService.getRestaurantOrdersForAdmin(id, from, to);
  }

  @Put('admin/:id')
  @Roles('admin')
  update(
    @UuidParam('id') id: string,
    @Body() body: UpdateRestaurantDto,
  ) {
    return this.restaurantsService.updateRestaurant(id, body);
  }

  @Delete('admin/:id')
  @Roles('admin')
  delete(@UuidParam('id') id: string) {
    return this.restaurantsService.deleteRestaurant(id);
  }
}

