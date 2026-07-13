import { Controller, Get, Post, Patch, Body, Param, Query, UseGuards } from '@nestjs/common';
import { AppointmentService } from './appointment.service';
import { BookAppointmentDto, RescheduleAppointmentDto, CancelAppointmentDto, JoinWaitlistDto } from './dto/appointment.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { ClinicId } from '../../common/decorators/clinic-id.decorator';

@Controller('appointments')
@UseGuards(JwtAuthGuard, RolesGuard)
export class AppointmentController {
  constructor(private readonly appointmentService: AppointmentService) {}

  @Post()
  @Roles('ClinicAdmin', 'Receptionist', 'SuperAdmin')
  async book(@ClinicId() clinicId: string, @Body() dto: BookAppointmentDto) {
    return this.appointmentService.book(clinicId, dto);
  }

  @Get()
  @Roles('ClinicAdmin', 'Receptionist', 'Doctor', 'SuperAdmin')
  async findAll(
    @ClinicId() clinicId: string,
    @Query('doctor_id') doctorId?: string,
    @Query('date') date?: string,
  ) {
    return this.appointmentService.findAll(clinicId, doctorId, date);
  }

  @Patch(':id/reschedule')
  @Roles('ClinicAdmin', 'Receptionist', 'SuperAdmin')
  async reschedule(
    @ClinicId() clinicId: string,
    @Param('id') id: string,
    @Body() dto: RescheduleAppointmentDto,
  ) {
    return this.appointmentService.reschedule(clinicId, id, dto);
  }

  @Patch(':id/cancel')
  @Roles('ClinicAdmin', 'Receptionist', 'SuperAdmin')
  async cancel(
    @ClinicId() clinicId: string,
    @Param('id') id: string,
    @Body() dto: CancelAppointmentDto,
  ) {
    return this.appointmentService.cancel(clinicId, id, dto);
  }

  @Post('waitlist')
  @Roles('ClinicAdmin', 'Receptionist', 'SuperAdmin')
  async joinWaitlist(@ClinicId() clinicId: string, @Body() dto: JoinWaitlistDto) {
    return this.appointmentService.joinWaitlist(clinicId, dto);
  }
}
