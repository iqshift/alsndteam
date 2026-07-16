import { Module } from '@nestjs/common';
import { OrdersService } from './orders.service';
import { OrdersController } from './orders.controller';
import { DispatchModule } from '../dispatch/dispatch.module';
import { EventsModule } from '../events/events.module';

@Module({
  imports: [DispatchModule, EventsModule],
  controllers: [OrdersController],
  providers: [OrdersService],
  exports: [OrdersService],
})
export class OrdersModule {}
