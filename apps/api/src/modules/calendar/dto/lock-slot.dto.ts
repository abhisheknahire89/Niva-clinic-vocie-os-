import { IsNotEmpty, IsString, IsDateString } from 'class-validator';

export class LockSlotDto {
  @IsString()
  @IsNotEmpty()
  doctorId: string;

  @IsDateString()
  @IsNotEmpty()
  startTime: string;
}
