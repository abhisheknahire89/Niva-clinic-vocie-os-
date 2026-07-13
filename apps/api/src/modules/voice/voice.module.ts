import { Module, forwardRef } from '@nestjs/common';
import { VoiceService } from './voice.service';
import { VoiceController } from './voice.controller';
import { AppointmentModule } from '../appointment/appointment.module';
import { CalendarModule } from '../calendar/calendar.module';

@Module({
  imports: [forwardRef(() => AppointmentModule), CalendarModule],
  controllers: [VoiceController],
  providers: [VoiceService],
  exports: [VoiceService],
})
export class VoiceModule {}
