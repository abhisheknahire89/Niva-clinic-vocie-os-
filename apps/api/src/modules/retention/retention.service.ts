import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma.service';

@Injectable()
export class RetentionService {
  constructor(private readonly prisma: PrismaService) {}

  async createRule(clinicId: string, data: { name: string; conditionJson: any; actionJson: any; priority?: number }) {
    return this.prisma.retentionRule.create({
      data: {
        clinicId,
        name: data.name,
        conditionJson: data.conditionJson,
        actionJson: data.actionJson,
        priority: data.priority ?? 0,
      },
    });
  }

  async getRules(clinicId: string) {
    return this.prisma.retentionRule.findMany({
      where: { clinicId },
      orderBy: { priority: 'desc' },
    });
  }

  async getRule(clinicId: string, id: string) {
    const rule = await this.prisma.retentionRule.findFirst({
      where: { id, clinicId },
    });
    if (!rule) throw new NotFoundException('Retention rule not found');
    return rule;
  }

  async updateRule(clinicId: string, id: string, data: any) {
    await this.getRule(clinicId, id);
    return this.prisma.retentionRule.update({
      where: { id },
      data,
    });
  }

  async deleteRule(clinicId: string, id: string) {
    await this.getRule(clinicId, id);
    await this.prisma.retentionRule.delete({
      where: { id },
    });
    return { success: true };
  }

  async getTriggers(clinicId: string) {
    return this.prisma.retentionTrigger.findMany({
      where: { rule: { clinicId } },
      include: {
        patient: true,
        rule: true,
      },
      orderBy: { triggeredAt: 'desc' },
    });
  }

  /**
   * Scan patients and generate follow-up triggers based on rules
   */
  async runRetentionScan(clinicId: string) {
    const rules = await this.prisma.retentionRule.findMany({
      where: { clinicId, isActive: true },
    });

    const patients = await this.prisma.patient.findMany({
      where: { clinicId },
      include: {
        tags: true,
        appointments: {
          orderBy: { scheduledAt: 'desc' },
        },
      },
    });

    let triggersCreated = 0;

    for (const rule of rules) {
      const condition = rule.conditionJson as any;
      const targetTag = condition?.tag;
      const daysLimit = condition?.daysSinceLastAppointment ?? 30;
      const checkNoShow = condition?.noShowRecovery ?? false;

      for (const patient of patients) {
        let isEligible = false;

        if (checkNoShow) {
          // Rule: recovery of recent no-shows
          const lastAppointment = patient.appointments[0];
          if (lastAppointment && lastAppointment.status === 'no_show') {
            isEligible = true;
          }
        } else if (targetTag) {
          // Rule: chronic tag check + lack of recent appointments
          const hasTag = patient.tags.some(t => t.tag.toLowerCase() === targetTag.toLowerCase());
          if (hasTag) {
            const lastAppointment = patient.appointments[0];
            if (!lastAppointment) {
              isEligible = true;
            } else {
              const diffMs = Date.now() - new Date(lastAppointment.scheduledAt).getTime();
              const diffDays = diffMs / (1000 * 60 * 60 * 24);
              if (diffDays >= daysLimit) {
                isEligible = true;
              }
            }
          }
        }

        if (isEligible) {
          // Check if trigger already exists for this patient and rule (e.g. pending/actioned)
          const existing = await this.prisma.retentionTrigger.findFirst({
            where: {
              ruleId: rule.id,
              patientId: patient.id,
              status: 'pending',
            },
          });

          if (!existing) {
            await this.prisma.retentionTrigger.create({
              data: {
                ruleId: rule.id,
                patientId: patient.id,
                status: 'pending',
              },
            });
            triggersCreated++;

            // Create patient timeline record
            await this.prisma.patientTimeline.create({
              data: {
                patientId: patient.id,
                eventType: 'RetentionTriggered',
                metadata: {
                  ruleName: rule.name,
                  triggeredAt: new Date().toISOString(),
                },
              },
            });
          }
        }
      }
    }

    return { triggersCreated };
  }
}
