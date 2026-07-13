import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { SharedModule } from './shared.module';
import { AuthModule } from './modules/auth/auth.module';
import { ClinicModule } from './modules/clinic/clinic.module';
import { PatientModule } from './modules/patient/patient.module';
import { DoctorModule } from './modules/doctor/doctor.module';
import { CalendarModule } from './modules/calendar/calendar.module';
import { AppointmentModule } from './modules/appointment/appointment.module';
import { RetentionModule } from './modules/retention/retention.module';
import { CampaignModule } from './modules/campaign/campaign.module';
import { VoiceModule } from './modules/voice/voice.module';
import { AnalyticsModule } from './modules/analytics/analytics.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    SharedModule,
    AuthModule,
    ClinicModule,
    PatientModule,
    DoctorModule,
    CalendarModule,
    AppointmentModule,
    RetentionModule,
    CampaignModule,
    VoiceModule,
    AnalyticsModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
