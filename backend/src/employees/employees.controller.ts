import { Controller, Get, Post, Patch, Body, Param, Query, UseGuards } from '@nestjs/common';
import { EmployeesService } from './employees.service';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { RolesGuard } from '../common/guards/roles.guard';

@Controller('employees')
@UseGuards(RolesGuard)
export class EmployeesController {
  constructor(private employeesService: EmployeesService) {}

  // ═══════ Admin Routes ═══════

  @Post('admin')
  @Roles('admin')
  createEmployee(@Body() body: { name: string; phone: string; password: string }) {
    return this.employeesService.createEmployee(body);
  }

  @Get('admin')
  @Roles('admin')
  getAllEmployees() {
    return this.employeesService.getAllEmployees();
  }

  @Get('admin/reports/summary')
  @Roles('admin')
  getSummaryReport(@Query('period') period: 'daily' | 'weekly' | 'monthly' = 'daily') {
    return this.employeesService.getAllEmployeesReport(period);
  }

  @Get('admin/:id')
  @Roles('admin')
  getEmployeeById(@Param('id') id: string) {
    return this.employeesService.getEmployeeById(id);
  }

  @Get('admin/:id/report')
  @Roles('admin')
  getEmployeeReport(
    @Param('id') id: string,
    @Query('period') period: 'daily' | 'weekly' | 'monthly' = 'daily',
  ) {
    return this.employeesService.getEmployeeReport(id, period);
  }

  @Patch('admin/:id/status')
  @Roles('admin')
  updateStatus(@Param('id') id: string, @Body() body: { status: string }) {
    return this.employeesService.updateEmployeeStatus(id, body.status);
  }

  // ═══════ Employee Routes ═══════

  @Get('profile')
  @Roles('employee')
  getProfile(@CurrentUser() user: any) {
    return this.employeesService.getProfile(user.id);
  }

  @Post('codes')
  @Roles('employee')
  createCode(@CurrentUser() user: any, @Body() body: { value: number }) {
    return this.employeesService.createCode(user.id, body.value);
  }

  @Get('my-codes')
  @Roles('employee')
  getMyCodesToday(@CurrentUser() user: any) {
    return this.employeesService.getMyCodesToday(user.id);
  }
}
