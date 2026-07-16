import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { RestaurantsModule } from './restaurants/restaurants.module';
import { DriversModule } from './drivers/drivers.module';
import { OrdersModule } from './orders/orders.module';
import { ZonesModule } from './zones/zones.module';
import { WalletModule } from './wallet/wallet.module';
import { EventsModule } from './events/events.module';
import { DispatchModule } from './dispatch/dispatch.module';
import { ReportsModule } from './reports/reports.module';
import { AuditModule } from './audit/audit.module';
import { SettingsModule } from './settings/settings.module';
import { EmployeesModule } from './employees/employees.module';
import { SupportModule } from './support/support.module';
import { JwtAuthGuard } from './common/guards/jwt-auth.guard';
import { RolesGuard } from './common/guards/roles.guard';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
    AuthModule,
    RestaurantsModule,
    DriversModule,
    OrdersModule,
    ZonesModule,
    WalletModule,
    EventsModule,
    DispatchModule,
    ReportsModule,
    AuditModule,
    SettingsModule,
    EmployeesModule,
    SupportModule,
  ],
  providers: [JwtAuthGuard, RolesGuard],
})
export class AppModule {}

