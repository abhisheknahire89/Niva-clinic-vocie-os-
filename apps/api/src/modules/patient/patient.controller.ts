import { Controller, Get, Post, Patch, Delete, Param, Query, Body, UseGuards, ParseIntPipe } from '@nestjs/common';
import { PatientService } from './patient.service';
import { CreatePatientDto } from './dto/create-patient.dto';
import { UpdatePatientDto } from './dto/update-patient.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { ClinicId } from '../../common/decorators/clinic-id.decorator';

@Controller('patients')
@UseGuards(JwtAuthGuard, RolesGuard)
export class PatientController {
  constructor(private readonly patientService: PatientService) {}

  @Post()
  @Roles('ClinicAdmin', 'Receptionist', 'SuperAdmin')
  async create(@ClinicId() clinicId: string, @Body() dto: CreatePatientDto) {
    return this.patientService.create(clinicId, dto);
  }

  @Get()
  @Roles('ClinicAdmin', 'Receptionist', 'Doctor', 'SuperAdmin')
  async findAll(
    @ClinicId() clinicId: string,
    @Query('page', ParseIntPipe) page = 1,
    @Query('limit', ParseIntPipe) limit = 10,
    @Query('search') search?: string,
    @Query('tag') tag?: string,
  ) {
    return this.patientService.findAll(clinicId, page, limit, search, tag);
  }

  @Get(':id')
  @Roles('ClinicAdmin', 'Receptionist', 'Doctor', 'SuperAdmin')
  async findOne(@ClinicId() clinicId: string, @Param('id') id: string) {
    return this.patientService.findOne(clinicId, id);
  }

  @Get(':id/timeline')
  @Roles('ClinicAdmin', 'Receptionist', 'Doctor', 'SuperAdmin')
  async getTimeline(@ClinicId() clinicId: string, @Param('id') id: string) {
    return this.patientService.getTimeline(clinicId, id);
  }

  @Patch(':id')
  @Roles('ClinicAdmin', 'Receptionist', 'SuperAdmin')
  async update(@ClinicId() clinicId: string, @Param('id') id: string, @Body() dto: UpdatePatientDto) {
    return this.patientService.update(clinicId, id, dto);
  }

  @Delete(':id')
  @Roles('ClinicAdmin', 'SuperAdmin')
  async remove(@ClinicId() clinicId: string, @Param('id') id: string) {
    return this.patientService.remove(clinicId, id);
  }
}
