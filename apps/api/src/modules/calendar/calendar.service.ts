import { Injectable, BadRequestException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../../prisma.service';
import { RedisService } from '../../redis.service';

@Injectable()
export class CalendarService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly redisService: RedisService,
  ) {}

  async getAvailableSlots(clinicId: string, doctorId: string, dateStr: string) {
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) {
      throw new BadRequestException('Invalid date format. Use YYYY-MM-DD');
    }

    const doctor = await this.prisma.doctor.findFirst({
      where: { id: doctorId, clinicId },
    });
    if (!doctor) {
      throw new BadRequestException('Doctor not found in this clinic');
    }

    // 1. Check if doctor is on leave
    const leave = await this.prisma.doctorLeave.findFirst({
      where: {
        doctorId,
        startDate: { lte: date },
        endDate: { gte: date },
      },
    });

    if (leave) {
      return [];
    }

    // 2. Get availability for this day of week
    const dayOfWeek = date.getDay();
    const availabilities = await this.prisma.doctorAvailability.findMany({
      where: { doctorId, dayOfWeek },
    });

    if (availabilities.length === 0) {
      return [];
    }

    // 3. Get existing appointments for this day
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);

    const appointments = await this.prisma.appointment.findMany({
      where: {
        doctorId,
        scheduledAt: {
          gte: startOfDay,
          lte: endOfDay,
        },
        status: { in: ['booked', 'confirmed'] },
      },
    });

    const duration = doctor.consultationDurationMins;
    const slots: { startTime: string; endTime: string; isAvailable: boolean }[] = [];

    // 4. Generate slots based on shifts
    for (const shift of availabilities) {
      const [startHour, startMin] = shift.startTime.split(':').map(Number);
      const [endHour, endMin] = shift.endTime.split(':').map(Number);

      let current = new Date(date);
      current.setHours(startHour, startMin, 0, 0);

      const endLimit = new Date(date);
      endLimit.setHours(endHour, endMin, 0, 0);

      while (current.getTime() + duration * 60 * 1000 <= endLimit.getTime()) {
        const slotStart = new Date(current);
        const slotEnd = new Date(current.getTime() + duration * 60 * 1000);

        // Check if overlaps with any appointment
        const hasConflict = appointments.some((apt) => {
          const aptStart = new Date(apt.scheduledAt);
          const aptEnd = new Date(aptStart.getTime() + apt.durationMins * 60 * 1000);
          return slotStart < aptEnd && slotEnd > aptStart;
        });

        // Check if locked in Redis
        const redisKey = `lock:slot:${doctorId}:${slotStart.toISOString()}`;
        const isLocked = await this.redisService.getClient().get(redisKey);

        slots.push({
          startTime: slotStart.toISOString(),
          endTime: slotEnd.toISOString(),
          isAvailable: !hasConflict && !isLocked,
        });

        current = slotEnd;
      }
    }

    return slots;
  }

  async lockSlot(clinicId: string, doctorId: string, startTimeStr: string) {
    const slotTime = new Date(startTimeStr);
    if (isNaN(slotTime.getTime())) {
      throw new BadRequestException('Invalid start time format');
    }

    const doctor = await this.prisma.doctor.findFirst({
      where: { id: doctorId, clinicId },
    });
    if (!doctor) {
      throw new BadRequestException('Doctor not found');
    }

    const redisKey = `lock:slot:${doctorId}:${slotTime.toISOString()}`;
    const ttlMs = 5 * 60 * 1000; // 5 minute reservation lock

    const success = await this.redisService.acquireLock(redisKey, ttlMs);
    if (!success) {
      throw new ConflictException('This slot is currently locked by another booking attempt');
    }

    return {
      locked: true,
      key: redisKey,
      expiresAt: new Date(Date.now() + ttlMs).toISOString(),
    };
  }

  async releaseSlotLock(doctorId: string, startTimeStr: string) {
    const slotTime = new Date(startTimeStr);
    const redisKey = `lock:slot:${doctorId}:${slotTime.toISOString()}`;
    await this.redisService.releaseLock(redisKey);
  }
}
