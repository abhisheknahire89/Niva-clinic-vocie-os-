import { Controller, Get, UseGuards } from '@nestjs/common';
import { AnalyticsService } from './analytics.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { ClinicId } from '../../common/decorators/clinic-id.decorator';

@Controller('analytics')
@UseGuards(JwtAuthGuard, RolesGuard)
export class AnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService) {}

  @Get()
  @Roles('ClinicAdmin', 'SuperAdmin', 'Receptionist', 'Doctor')
  async getKPIs(@ClinicId() clinicId: string) {
    return this.analyticsService.getClinicKPIs(clinicId);
  }
}
