import { IsNotEmpty, IsString, IsDateString, IsOptional } from 'class-validator';

export class BookAppointmentDto {
  @IsString()
  @IsNotEmpty()
  patientId: string;

  @IsString()
  @IsNotEmpty()
  doctorId: string;

  @IsDateString()
  @IsNotEmpty()
  scheduledAt: string;

  @IsString()
  @IsOptional()
  channel?: string;
}

export class RescheduleAppointmentDto {
  @IsDateString()
  @IsNotEmpty()
  newScheduledAt: string;
}

export class CancelAppointmentDto {
  @IsString()
  @IsNotEmpty()
  reason: string;
}

export class JoinWaitlistDto {
  @IsString()
  @IsNotEmpty()
  patientId: string;

  @IsString()
  @IsNotEmpty()
  doctorId: string;

  @IsString()
  @IsNotEmpty()
  desiredWindow: string;
}
