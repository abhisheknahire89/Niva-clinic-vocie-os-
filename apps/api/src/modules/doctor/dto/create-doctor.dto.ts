import { IsNotEmpty, IsString, IsEmail, ValidateNested, IsInt, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateDoctorUserDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsEmail()
  email: string;

  @IsString()
  @IsNotEmpty()
  phone: string;

  @IsString()
  @IsNotEmpty()
  password: string; // Plain password that will be hashed
}

export class CreateDoctorDto {
  @IsString()
  @IsNotEmpty()
  specialization: string;

  @IsInt()
  @Min(5)
  consultationDurationMins: number;

  @ValidateNested()
  @Type(() => CreateDoctorUserDto)
  user: CreateDoctorUserDto;
}
