import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma.service';

@Injectable()
export class CampaignService {
  constructor(private readonly prisma: PrismaService) {}

  async createCampaign(clinicId: string, data: { name: string; type: string; ruleId: string; startsAt: string; endsAt: string }) {
    // Verify rule exists
    const rule = await this.prisma.retentionRule.findFirst({
      where: { id: data.ruleId, clinicId },
    });
    if (!rule) throw new NotFoundException('Retention rule not found');

    return this.prisma.campaign.create({
      data: {
        clinicId,
        name: data.name,
        type: data.type, // "voice", "whatsapp", "sms"
        ruleId: data.ruleId,
        status: 'draft',
        startsAt: new Date(data.startsAt),
        endsAt: new Date(data.endsAt),
      },
    });
  }

  async getCampaigns(clinicId: string) {
    return this.prisma.campaign.findMany({
      where: { clinicId },
      include: {
        rule: true,
        runs: true,
      },
      orderBy: { startsAt: 'desc' },
    });
  }

  async getCampaign(clinicId: string, id: string) {
    const campaign = await this.prisma.campaign.findFirst({
      where: { id, clinicId },
      include: {
        rule: true,
        runs: {
          include: {
            patient: true,
          },
        },
      },
    });
    if (!campaign) throw new NotFoundException('Campaign not found');
    return campaign;
  }

  async getRuns(clinicId: string, campaignId: string) {
    return this.prisma.campaignRun.findMany({
      where: { campaignId, campaign: { clinicId } },
      include: {
        patient: true,
        campaign: true,
      },
    });
  }

  /**
   * Execute the campaign: identify targets, create runs, execute mock outreach.
   */
  async executeCampaign(clinicId: string, id: string) {
    const campaign = await this.getCampaign(clinicId, id);

    if (campaign.status === 'completed') {
      throw new BadRequestException('Campaign is already completed');
    }

    // 1. Update status to active
    await this.prisma.campaign.update({
      where: { id },
      data: { status: 'active' },
    });

    // 2. Identify target patients based on pending triggers for this rule
    const triggers = await this.prisma.retentionTrigger.findMany({
      where: {
        ruleId: campaign.ruleId,
        status: 'pending',
        patient: { clinicId },
      },
      include: {
        patient: true,
      },
    });

    const runsCreated: any[] = [];

    // 3. For each trigger, create a campaign run and trigger simulated outreach
    for (const trigger of triggers) {
      // Create campaign run
      const run = await this.prisma.campaignRun.create({
        data: {
          campaignId: campaign.id,
          patientId: trigger.patientId,
          status: 'queued',
          attemptCount: 1,
        },
      });

      // Update trigger status
      await this.prisma.retentionTrigger.update({
        where: { id: trigger.id },
        data: { status: 'actioned' },
      });

      // 4. Simulate communication delivery
      if (campaign.type === 'voice') {
        // Outbound Voice Call Simulation setup
        const voiceCall = await this.prisma.voiceCall.create({
          data: {
            clinicId,
            patientId: trigger.patientId,
            direction: 'outbound',
            status: 'ringing', // Start as ringing, ready for simulation
            startedAt: new Date(),
          },
        });

        // Update run status to sent/queued
        await this.prisma.campaignRun.update({
          where: { id: run.id },
          data: { status: 'sent' },
        });

        await this.prisma.patientTimeline.create({
          data: {
            patientId: trigger.patientId,
            eventType: 'OutboundCallInitiated',
            refId: voiceCall.id,
            metadata: {
              campaignId: campaign.id,
              campaignName: campaign.name,
              status: 'ringing',
            },
          },
        });
      } else {
        // WhatsApp or SMS simulation
        const log = await this.prisma.notificationLog.create({
          data: {
            clinicId,
            patientId: trigger.patientId,
            channel: campaign.type,
            template: `followup_${campaign.rule.name.toLowerCase().replace(/\s+/g, '_')}`,
            status: 'delivered',
            providerMessageId: `msg_${Math.random().toString(36).substring(7)}`,
            sentAt: new Date(),
          },
        });

        // WhatsApp / SMS auto-response probability (30% response rate for booking simulation)
        const isResponding = Math.random() < 0.35;
        const runStatus = isResponding ? 'responded' : 'sent';

        await this.prisma.campaignRun.update({
          where: { id: run.id },
          data: { status: runStatus },
        });

        await this.prisma.patientTimeline.create({
          data: {
            patientId: trigger.patientId,
            eventType: 'OutreachSent',
            refId: log.id,
            metadata: {
              campaignId: campaign.id,
              channel: campaign.type,
              responseSimulated: isResponding,
            },
          },
        });
      }

      runsCreated.push(run);
    }

    // 5. Complete campaign
    await this.prisma.campaign.update({
      where: { id },
      data: { status: 'completed' },
    });

    return {
      message: 'Campaign executed successfully',
      targetsFound: triggers.length,
      runsCreated: runsCreated.length,
    };
  }
}
