import { Controller, Get, Post, Body, Query, UseGuards } from '@nestjs/common';
import { CalendarService } from './calendar.service';
import { LockSlotDto } from './dto/lock-slot.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { ClinicId } from '../../common/decorators/clinic-id.decorator';

@Controller('calendar')
@UseGuards(JwtAuthGuard, RolesGuard)
export class CalendarController {
  constructor(private readonly calendarService: CalendarService) {}

  @Get('slots')
  @Roles('ClinicAdmin', 'Receptionist', 'Doctor', 'SuperAdmin')
  async getSlots(
    @ClinicId() clinicId: string,
    @Query('doctor_id') doctorId: string,
    @Query('date') date: string,
  ) {
    return this.calendarService.getAvailableSlots(clinicId, doctorId, date);
  }

  @Post('slots/lock')
  @Roles('ClinicAdmin', 'Receptionist', 'SuperAdmin')
  async lockSlot(@ClinicId() clinicId: string, @Body() dto: LockSlotDto) {
    return this.calendarService.lockSlot(clinicId, dto.doctorId, dto.startTime);
  }
}
