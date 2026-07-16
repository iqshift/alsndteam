import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ReportsService } from './reports.service';
import { Roles } from '../common/decorators/roles.decorator';
import { RolesGuard } from '../common/guards/roles.guard';

@Controller('reports')
@UseGuards(RolesGuard)
@Roles('admin')
export class ReportsController {
  constructor(private reportsService: ReportsService) {}

  @Get('summary')
  getSummary(
    @Query('from') from: string,
    @Query('to') to: string,
  ) {
    return this.reportsService.getSummary(from, to);
  }

  @Get('drivers')
  getDriversReport(
    @Query('from') from: string,
    @Query('to') to: string,
  ) {
    return this.reportsService.getDriversReport(from, to);
  }

  @Get('zones')
  getZonesReport(
    @Query('from') from: string,
    @Query('to') to: string,
  ) {
    return this.reportsService.getZonesReport(from, to);
  }
}
