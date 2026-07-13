import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../../prisma.service';
import { CreateDoctorDto } from './dto/create-doctor.dto';
import { UpdateDoctorDto } from './dto/update-doctor.dto';
import { SetAvailabilityDto, ApplyLeaveDto } from './dto/availability.dto';
import * as bcrypt from 'bcrypt';

@Injectable()
export class DoctorService {
  constructor(private readonly prisma: PrismaService) {}

  async create(clinicId: string, dto: CreateDoctorDto) {
    const existingUser = await this.prisma.user.findUnique({
      where: { email: dto.user.email },
    });
    if (existingUser) {
      throw new ConflictException('Email already registered');
    }

    const passwordHash = await bcrypt.hash(dto.user.password, 10);

    return this.prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          clinicId,
          name: dto.user.name,
          email: dto.user.email,
          phone: dto.user.phone,
          role: 'Doctor',
          passwordHash,
        },
      });

      const doctor = await tx.doctor.create({
        data: {
          clinicId,
          userId: user.id,
          specialization: dto.specialization,
          consultationDurationMins: dto.consultationDurationMins,
        },
      });

      return {
        id: doctor.id,
        specialization: doctor.specialization,
        consultationDurationMins: doctor.consultationDurationMins,
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          phone: user.phone,
        },
      };
    });
  }

  async findAll(clinicId: string) {
    return this.prisma.doctor.findMany({
      where: { clinicId },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
          },
        },
        availabilities: true,
      },
    });
  }

  async findOne(clinicId: string, id: string) {
    const doctor = await this.prisma.doctor.findFirst({
      where: { id, clinicId },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
          },
        },
        availabilities: true,
        leaves: true,
      },
    });
    if (!doctor) {
      throw new NotFoundException('Doctor not found');
    }
    return doctor;
  }

  async update(clinicId: string, id: string, dto: UpdateDoctorDto) {
    const doctor = await this.findOne(clinicId, id);

    return this.prisma.$transaction(async (tx) => {
      const updateDoctorData: any = {};
      if (dto.specialization !== undefined) updateDoctorData.specialization = dto.specialization;
      if (dto.consultationDurationMins !== undefined) updateDoctorData.consultationDurationMins = dto.consultationDurationMins;

      await tx.doctor.update({
        where: { id },
        data: updateDoctorData,
      });

      const updateUserData: any = {};
      if (dto.name !== undefined) updateUserData.name = dto.name;
      if (dto.phone !== undefined) updateUserData.phone = dto.phone;

      if (Object.keys(updateUserData).length > 0) {
        await tx.user.update({
          where: { id: doctor.userId },
          data: updateUserData,
        });
      }

      return this.findOne(clinicId, id);
    });
  }

  async setAvailability(clinicId: string, id: string, dto: SetAvailabilityDto) {
    await this.findOne(clinicId, id);

    return this.prisma.$transaction(async (tx) => {
      // Clear existing availability
      await tx.doctorAvailability.deleteMany({
        where: { doctorId: id },
      });

      // Insert new availability items
      if (dto.availabilities.length > 0) {
        await tx.doctorAvailability.createMany({
          data: dto.availabilities.map((item) => ({
            doctorId: id,
            dayOfWeek: item.dayOfWeek,
            startTime: item.startTime,
            endTime: item.endTime,
          })),
        });
      }

      return this.findOne(clinicId, id);
    });
  }

  async applyLeave(clinicId: string, id: string, dto: ApplyLeaveDto) {
    await this.findOne(clinicId, id);

    return this.prisma.doctorLeave.create({
      data: {
        doctorId: id,
        startDate: new Date(dto.startDate),
        endDate: new Date(dto.endDate),
        reason: dto.reason,
      },
    });
  }

  async remove(clinicId: string, id: string) {
    const doctor = await this.findOne(clinicId, id);

    return this.prisma.$transaction(async (tx) => {
      // Delete doctor
      await tx.doctor.delete({
        where: { id },
      });

      // Delete user
      await tx.user.delete({
        where: { id: doctor.userId },
      });

      return { success: true };
    });
  }
}
