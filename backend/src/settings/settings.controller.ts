import { Controller, Get, Put, Body, UseGuards } from '@nestjs/common';
import { SettingsService } from './settings.service';
import { Roles } from '../common/decorators/roles.decorator';
import { RolesGuard } from '../common/guards/roles.guard';
import { Public } from '../common/decorators/public.decorator';

@Controller('settings')
@UseGuards(RolesGuard)
export class SettingsController {
  constructor(private settingsService: SettingsService) {}

  @Roles('admin')
  @Get()
  getSettings() {
    return this.settingsService.getSettings();
  }

  @Roles('admin')
  @Put()
  updateSettings(@Body() body: any) {
    return this.settingsService.updateSettings(body);
  }

  @Public()
  @Get('public')
  getPublicSettings() {
    return this.settingsService.getSettings();
  }
}
