import { Controller, Get, Patch, Body, UseGuards } from '@nestjs/common';
import { ClinicService } from './clinic.service';
import { UpdateClinicDto } from './dto/update-clinic.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { ClinicId } from '../../common/decorators/clinic-id.decorator';

@Controller('clinics')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ClinicController {
  constructor(private readonly clinicService: ClinicService) {}

  @Get('profile')
  @Roles('ClinicAdmin', 'SuperAdmin', 'Receptionist', 'Doctor')
  async getProfile(@ClinicId() clinicId: string) {
    return this.clinicService.getClinic(clinicId);
  }

  @Patch('profile')
  @Roles('ClinicAdmin', 'SuperAdmin')
  async updateProfile(@ClinicId() clinicId: string, @Body() dto: UpdateClinicDto) {
    return this.clinicService.updateClinic(clinicId, dto);
  }
}
