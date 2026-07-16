import { Module, forwardRef } from '@nestjs/common';
import { DispatchService } from './dispatch.service';
import { EventsModule } from '../events/events.module';

@Module({
  imports: [forwardRef(() => EventsModule)],
  providers: [DispatchService],
  exports: [DispatchService],
})
export class DispatchModule {}
