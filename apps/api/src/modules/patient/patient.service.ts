import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma.service';
import { CreatePatientDto } from './dto/create-patient.dto';
import { UpdatePatientDto } from './dto/update-patient.dto';

@Injectable()
export class PatientService {
  constructor(private readonly prisma: PrismaService) {}

  async create(clinicId: string, dto: CreatePatientDto) {
    return this.prisma.$transaction(async (tx) => {
      // Create patient
      const patient = await tx.patient.create({
        data: {
          clinicId,
          name: dto.name,
          phone: dto.phone,
          dob: new Date(dto.dob),
          gender: dto.gender,
          preferredLanguage: dto.preferredLanguage,
          consentStatus: dto.consentStatus ?? false,
        },
      });

      // Create tags if provided
      if (dto.tags && dto.tags.length > 0) {
        await tx.patientTag.createMany({
          data: dto.tags.map((tag) => ({
            patientId: patient.id,
            tag,
          })),
        });
      }

      // Log to PatientTimeline
      await tx.patientTimeline.create({
        data: {
          patientId: patient.id,
          eventType: 'PatientRegistered',
          metadata: {
            registeredBy: 'system',
            consentStatus: patient.consentStatus,
          },
        },
      });

      // Log to EventLog
      await tx.eventLog.create({
        data: {
          eventType: 'PatientRegistered',
          payloadJson: {
            patientId: patient.id,
            clinicId,
            name: patient.name,
          },
        },
      });

      return this.findOne(clinicId, patient.id);
    });
  }

  async findAll(clinicId: string, page = 1, limit = 10, search?: string, tag?: string) {
    const skip = (page - 1) * limit;
    const where: any = {
      clinicId,
    };

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { phone: { contains: search, mode: 'insensitive' } },
      ];
    }

    if (tag) {
      where.tags = {
        some: {
          tag: { equals: tag, mode: 'insensitive' },
        },
      };
    }

    const [patients, total] = await Promise.all([
      this.prisma.patient.findMany({
        where,
        include: { tags: true },
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.patient.count({ where }),
    ]);

    return {
      patients,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async findOne(clinicId: string, id: string) {
    const patient = await this.prisma.patient.findFirst({
      where: { id, clinicId },
      include: { tags: true },
    });
    if (!patient) {
      throw new NotFoundException('Patient not found');
    }
    return patient;
  }

  async getTimeline(clinicId: string, id: string) {
    // Ensure patient exists first
    await this.findOne(clinicId, id);

    return this.prisma.patientTimeline.findMany({
      where: { patientId: id },
      orderBy: { occurredAt: 'desc' },
    });
  }

  async update(clinicId: string, id: string, dto: UpdatePatientDto) {
    await this.findOne(clinicId, id);

    return this.prisma.$transaction(async (tx) => {
      const updateData: any = {};
      if (dto.name !== undefined) updateData.name = dto.name;
      if (dto.phone !== undefined) updateData.phone = dto.phone;
      if (dto.dob !== undefined) updateData.dob = new Date(dto.dob);
      if (dto.gender !== undefined) updateData.gender = dto.gender;
      if (dto.preferredLanguage !== undefined) updateData.preferredLanguage = dto.preferredLanguage;
      if (dto.consentStatus !== undefined) updateData.consentStatus = dto.consentStatus;

      const patient = await tx.patient.update({
        where: { id },
        data: updateData,
      });

      if (dto.tags !== undefined) {
        // Simple strategy: delete existing and create new
        await tx.patientTag.deleteMany({ where: { patientId: id } });
        if (dto.tags.length > 0) {
          await tx.patientTag.createMany({
            data: dto.tags.map((tag) => ({
              patientId: id,
              tag,
            })),
          });
        }
      }

      // Log to PatientTimeline
      await tx.patientTimeline.create({
        data: {
          patientId: id,
          eventType: 'PatientUpdated',
          metadata: {
            updatedFields: Object.keys(dto),
          },
        },
      });

      return this.findOne(clinicId, id);
    });
  }

  async remove(clinicId: string, id: string) {
    const patient = await this.findOne(clinicId, id);
    await this.prisma.patient.delete({
      where: { id: patient.id },
    });
    return { success: true };
  }
}
