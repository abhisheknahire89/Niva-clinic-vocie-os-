import { Injectable, NotFoundException, ConflictException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma.service';
import { BookAppointmentDto, RescheduleAppointmentDto, CancelAppointmentDto, JoinWaitlistDto } from './dto/appointment.dto';
import { CalendarService } from '../calendar/calendar.service';

@Injectable()
export class AppointmentService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly calendarService: CalendarService,
  ) {}

  async book(clinicId: string, dto: BookAppointmentDto) {
    // 1. Verify Patient
    const patient = await this.prisma.patient.findFirst({
      where: { id: dto.patientId, clinicId },
    });
    if (!patient) {
      throw new NotFoundException('Patient not found');
    }

    // 2. Verify Doctor
    const doctor = await this.prisma.doctor.findFirst({
      where: { id: dto.doctorId, clinicId },
    });
    if (!doctor) {
      throw new NotFoundException('Doctor not found');
    }

    // 3. Verify Slot Availability
    const scheduledTime = new Date(dto.scheduledAt);
    const dateStr = scheduledTime.toISOString().split('T')[0];
    const availableSlots = await this.calendarService.getAvailableSlots(clinicId, dto.doctorId, dateStr);

    const targetSlot = availableSlots.find(
      (slot) => new Date(slot.startTime).getTime() === scheduledTime.getTime()
    );

    if (!targetSlot) {
      throw new BadRequestException('The selected slot time does not match doctor availability hours');
    }

    if (!targetSlot.isAvailable) {
      throw new ConflictException('This slot is already booked or temporarily locked');
    }

    // 4. Perform Transaction Booking
    const appointment = await this.prisma.$transaction(async (tx) => {
      const apt = await tx.appointment.create({
        data: {
          clinicId,
          patientId: dto.patientId,
          doctorId: dto.doctorId,
          scheduledAt: scheduledTime,
          durationMins: doctor.consultationDurationMins,
          status: 'booked',
          channel: dto.channel ?? 'web',
        },
      });

      // Write patient timeline log
      await tx.patientTimeline.create({
        data: {
          patientId: dto.patientId,
          eventType: 'AppointmentBooked',
          refId: apt.id,
          metadata: {
            doctorId: dto.doctorId,
            scheduledAt: apt.scheduledAt.toISOString(),
            channel: apt.channel,
          },
        },
      });

      // Write global audit event log
      await tx.eventLog.create({
        data: {
          eventType: 'AppointmentBooked',
          payloadJson: {
            appointmentId: apt.id,
            clinicId,
            patientId: dto.patientId,
            doctorId: dto.doctorId,
            scheduledAt: apt.scheduledAt.toISOString(),
          },
        },
      });

      return apt;
    });

    // 5. Release any reservation lock in Redis
    await this.calendarService.releaseSlotLock(dto.doctorId, dto.scheduledAt);

    return appointment;
  }

  async reschedule(clinicId: string, id: string, dto: RescheduleAppointmentDto) {
    const appointment = await this.prisma.appointment.findFirst({
      where: { id, clinicId },
    });
    if (!appointment) {
      throw new NotFoundException('Appointment not found');
    }

    // Verify availability for the new slot
    const newScheduledTime = new Date(dto.newScheduledAt);
    const dateStr = newScheduledTime.toISOString().split('T')[0];
    const availableSlots = await this.calendarService.getAvailableSlots(clinicId, appointment.doctorId, dateStr);

    const targetSlot = availableSlots.find(
      (slot) => new Date(slot.startTime).getTime() === newScheduledTime.getTime()
    );

    if (!targetSlot) {
      throw new BadRequestException('Selected time slot does not match doctor availability hours');
    }

    if (!targetSlot.isAvailable) {
      throw new ConflictException('The selected slot is already booked or locked');
    }

    const updated = await this.prisma.$transaction(async (tx) => {
      const apt = await tx.appointment.update({
        where: { id },
        data: {
          scheduledAt: newScheduledTime,
          status: 'booked', // resets to booked/confirmed
        },
      });

      await tx.patientTimeline.create({
        data: {
          patientId: apt.patientId,
          eventType: 'AppointmentRescheduled',
          refId: apt.id,
          metadata: {
            oldScheduledAt: appointment.scheduledAt.toISOString(),
            newScheduledAt: apt.scheduledAt.toISOString(),
          },
        },
      });

      await tx.eventLog.create({
        data: {
          eventType: 'AppointmentRescheduled',
          payloadJson: {
            appointmentId: apt.id,
            clinicId,
            oldScheduledAt: appointment.scheduledAt.toISOString(),
            newScheduledAt: apt.scheduledAt.toISOString(),
          },
        },
      });

      return apt;
    });

    // Release slot lock
    await this.calendarService.releaseSlotLock(appointment.doctorId, dto.newScheduledAt);

    return updated;
  }

  async cancel(clinicId: string, id: string, dto: CancelAppointmentDto) {
    const appointment = await this.prisma.appointment.findFirst({
      where: { id, clinicId },
    });
    if (!appointment) {
      throw new NotFoundException('Appointment not found');
    }

    return this.prisma.$transaction(async (tx) => {
      const apt = await tx.appointment.update({
        where: { id },
        data: {
          status: 'cancelled',
        },
      });

      await tx.patientTimeline.create({
        data: {
          patientId: apt.patientId,
          eventType: 'AppointmentCancelled',
          refId: apt.id,
          metadata: {
            cancelledAt: new Date().toISOString(),
            reason: dto.reason,
          },
        },
      });

      await tx.eventLog.create({
        data: {
          eventType: 'AppointmentCancelled',
          payloadJson: {
            appointmentId: apt.id,
            clinicId,
            reason: dto.reason,
          },
        },
      });

      return apt;
    });
  }

  async joinWaitlist(clinicId: string, dto: JoinWaitlistDto) {
    const patient = await this.prisma.patient.findFirst({
      where: { id: dto.patientId, clinicId },
    });
    if (!patient) {
      throw new NotFoundException('Patient not found');
    }

    const doctor = await this.prisma.doctor.findFirst({
      where: { id: dto.doctorId, clinicId },
    });
    if (!doctor) {
      throw new NotFoundException('Doctor not found');
    }

    return this.prisma.waitlist.create({
      data: {
        clinicId,
        patientId: dto.patientId,
        doctorId: dto.doctorId,
        desiredWindow: dto.desiredWindow,
      },
    });
  }

  async findAll(clinicId: string, doctorId?: string, dateStr?: string) {
    const where: any = { clinicId };
    if (doctorId) {
      where.doctorId = doctorId;
    }
    if (dateStr) {
      const startOfDay = new Date(dateStr);
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date(dateStr);
      endOfDay.setHours(23, 59, 59, 999);
      where.scheduledAt = {
        gte: startOfDay,
        lte: endOfDay,
      };
    }

    return this.prisma.appointment.findMany({
      where,
      include: {
        patient: {
          select: {
            id: true,
            name: true,
            phone: true,
          },
        },
        doctor: {
          include: {
            user: {
              select: {
                name: true,
              },
            },
          },
        },
      },
      orderBy: { scheduledAt: 'asc' },
    });
  }
}
