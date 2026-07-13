import { Controller, Get, Post, Param, Body, UseGuards } from '@nestjs/common';
import { VoiceService } from './voice.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { ClinicId } from '../../common/decorators/clinic-id.decorator';

@Controller('voice-calls')
@UseGuards(JwtAuthGuard, RolesGuard)
export class VoiceController {
  constructor(private readonly voiceService: VoiceService) {}

  @Get()
  @Roles('ClinicAdmin', 'SuperAdmin', 'Receptionist', 'Doctor')
  async getCalls(@ClinicId() clinicId: string) {
    return this.voiceService.getCalls(clinicId);
  }

  @Get(':id')
  @Roles('ClinicAdmin', 'SuperAdmin', 'Receptionist', 'Doctor')
  async getCall(@ClinicId() clinicId: string, @Param('id') id: string) {
    return this.voiceService.getCall(clinicId, id);
  }

  @Post('simulate')
  @Roles('ClinicAdmin', 'SuperAdmin', 'Receptionist')
  async simulate(@ClinicId() clinicId: string, @Body() body: { patientId: string }) {
    return this.voiceService.startOutboundCall(clinicId, body.patientId);
  }

  @Post(':id/interact')
  @Roles('ClinicAdmin', 'SuperAdmin', 'Receptionist')
  async interact(
    @ClinicId() clinicId: string,
    @Param('id') id: string,
    @Body() body: { message: string },
  ) {
    return this.voiceService.interact(clinicId, id, body.message);
  }
}
