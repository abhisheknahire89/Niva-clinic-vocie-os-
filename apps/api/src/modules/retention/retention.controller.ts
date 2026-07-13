import { Controller, Get, Post, Patch, Delete, Param, Body, UseGuards } from '@nestjs/common';
import { RetentionService } from './retention.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { ClinicId } from '../../common/decorators/clinic-id.decorator';

@Controller('retention')
@UseGuards(JwtAuthGuard, RolesGuard)
export class RetentionController {
  constructor(private readonly retentionService: RetentionService) {}

  @Post('rules')
  @Roles('ClinicAdmin', 'SuperAdmin')
  async createRule(
    @ClinicId() clinicId: string,
    @Body() body: { name: string; conditionJson: any; actionJson: any; priority?: number },
  ) {
    return this.retentionService.createRule(clinicId, body);
  }

  @Get('rules')
  @Roles('ClinicAdmin', 'SuperAdmin', 'Receptionist', 'Doctor')
  async getRules(@ClinicId() clinicId: string) {
    return this.retentionService.getRules(clinicId);
  }

  @Get('rules/:id')
  @Roles('ClinicAdmin', 'SuperAdmin', 'Receptionist', 'Doctor')
  async getRule(@ClinicId() clinicId: string, @Param('id') id: string) {
    return this.retentionService.getRule(clinicId, id);
  }

  @Patch('rules/:id')
  @Roles('ClinicAdmin', 'SuperAdmin')
  async updateRule(@ClinicId() clinicId: string, @Param('id') id: string, @Body() body: any) {
    return this.retentionService.updateRule(clinicId, id, body);
  }

  @Delete('rules/:id')
  @Roles('ClinicAdmin', 'SuperAdmin')
  async deleteRule(@ClinicId() clinicId: string, @Param('id') id: string) {
    return this.retentionService.deleteRule(clinicId, id);
  }

  @Get('triggers')
  @Roles('ClinicAdmin', 'SuperAdmin', 'Receptionist', 'Doctor')
  async getTriggers(@ClinicId() clinicId: string) {
    return this.retentionService.getTriggers(clinicId);
  }

  @Post('scan')
  @Roles('ClinicAdmin', 'SuperAdmin', 'Receptionist')
  async runScan(@ClinicId() clinicId: string) {
    return this.retentionService.runRetentionScan(clinicId);
  }
}
