import { Module } from '@nestjs/common';
import { RestaurantsService } from './restaurants.service';
import { RestaurantsController } from './restaurants.controller';
import { SettingsService } from '../settings/settings.service';

@Module({
  controllers: [RestaurantsController],
  providers: [RestaurantsService, SettingsService],
  exports: [RestaurantsService],
})
export class RestaurantsModule {}
