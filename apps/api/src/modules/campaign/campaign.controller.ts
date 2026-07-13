import { Controller, Get, Post, Param, Body, UseGuards } from '@nestjs/common';
import { CampaignService } from './campaign.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { ClinicId } from '../../common/decorators/clinic-id.decorator';

@Controller('campaigns')
@UseGuards(JwtAuthGuard, RolesGuard)
export class CampaignController {
  constructor(private readonly campaignService: CampaignService) {}

  @Post()
  @Roles('ClinicAdmin', 'SuperAdmin')
  async create(
    @ClinicId() clinicId: string,
    @Body() body: { name: string; type: string; ruleId: string; startsAt: string; endsAt: string },
  ) {
    return this.campaignService.createCampaign(clinicId, body);
  }

  @Get()
  @Roles('ClinicAdmin', 'SuperAdmin', 'Receptionist', 'Doctor')
  async findAll(@ClinicId() clinicId: string) {
    return this.campaignService.getCampaigns(clinicId);
  }

  @Get(':id')
  @Roles('ClinicAdmin', 'SuperAdmin', 'Receptionist', 'Doctor')
  async findOne(@ClinicId() clinicId: string, @Param('id') id: string) {
    return this.campaignService.getCampaign(clinicId, id);
  }

  @Get(':id/runs')
  @Roles('ClinicAdmin', 'SuperAdmin', 'Receptionist', 'Doctor')
  async getRuns(@ClinicId() clinicId: string, @Param('id') id: string) {
    return this.campaignService.getRuns(clinicId, id);
  }

  @Post(':id/execute')
  @Roles('ClinicAdmin', 'SuperAdmin', 'Receptionist')
  async execute(@ClinicId() clinicId: string, @Param('id') id: string) {
    return this.campaignService.executeCampaign(clinicId, id);
  }
}
