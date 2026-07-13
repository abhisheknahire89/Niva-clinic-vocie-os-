import { IsEmail, IsNotEmpty, IsString, MinLength } from 'class-validator';

export class RegisterClinicDto {
  @IsString()
  @IsNotEmpty()
  clinicName: string;

  @IsString()
  @IsNotEmpty()
  timezone: string;

  @IsString()
  @IsNotEmpty()
  clinicPhone: string;

  @IsString()
  @IsNotEmpty()
  address: string;

  @IsString()
  @IsNotEmpty()
  adminName: string;

  @IsEmail()
  adminEmail: string;

  @IsString()
  @IsNotEmpty()
  adminPhone: string;

  @IsNotEmpty()
  @MinLength(6)
  adminPassword: string;
}
