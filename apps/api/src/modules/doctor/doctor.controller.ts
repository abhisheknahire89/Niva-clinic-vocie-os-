import { Controller, Get, Post, Patch, Delete, Param, Body, UseGuards } from '@nestjs/common';
import { DoctorService } from './doctor.service';
import { CreateDoctorDto } from './dto/create-doctor.dto';
import { UpdateDoctorDto } from './dto/update-doctor.dto';
import { SetAvailabilityDto, ApplyLeaveDto } from './dto/availability.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { ClinicId } from '../../common/decorators/clinic-id.decorator';

@Controller('doctors')
@UseGuards(JwtAuthGuard, RolesGuard)
export class DoctorController {
  constructor(private readonly doctorService: DoctorService) {}

  @Post()
  @Roles('ClinicAdmin', 'SuperAdmin')
  async create(@ClinicId() clinicId: string, @Body() dto: CreateDoctorDto) {
    return this.doctorService.create(clinicId, dto);
  }

  @Get()
  @Roles('ClinicAdmin', 'Receptionist', 'Doctor', 'SuperAdmin')
  async findAll(@ClinicId() clinicId: string) {
    return this.doctorService.findAll(clinicId);
  }

  @Get(':id')
  @Roles('ClinicAdmin', 'Receptionist', 'Doctor', 'SuperAdmin')
  async findOne(@ClinicId() clinicId: string, @Param('id') id: string) {
    return this.doctorService.findOne(clinicId, id);
  }

  @Patch(':id')
  @Roles('ClinicAdmin', 'SuperAdmin')
  async update(@ClinicId() clinicId: string, @Param('id') id: string, @Body() dto: UpdateDoctorDto) {
    return this.doctorService.update(clinicId, id, dto);
  }

  @Post(':id/availability')
  @Roles('ClinicAdmin', 'SuperAdmin')
  async setAvailability(@ClinicId() clinicId: string, @Param('id') id: string, @Body() dto: SetAvailabilityDto) {
    return this.doctorService.setAvailability(clinicId, id, dto);
  }

  @Post(':id/leave')
  @Roles('ClinicAdmin', 'SuperAdmin')
  async applyLeave(@ClinicId() clinicId: string, @Param('id') id: string, @Body() dto: ApplyLeaveDto) {
    return this.doctorService.applyLeave(clinicId, id, dto);
  }

  @Delete(':id')
  @Roles('ClinicAdmin', 'SuperAdmin')
  async remove(@ClinicId() clinicId: string, @Param('id') id: string) {
    return this.doctorService.remove(clinicId, id);
  }
}
