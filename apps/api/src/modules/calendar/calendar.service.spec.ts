import { Test, TestingModule } from '@nestjs/testing';
import { CalendarService } from './calendar.service';
import { PrismaService } from '../../prisma.service';
import { RedisService } from '../../redis.service';

describe('CalendarService', () => {
  let service: CalendarService;
  let prisma: any;
  let redis: any;

  beforeEach(async () => {
    prisma = {
      doctor: { findFirst: jest.fn() },
      doctorLeave: { findFirst: jest.fn() },
      doctorAvailability: { findMany: jest.fn() },
      appointment: { findMany: jest.fn() },
    };

    redis = {
      getClient: jest.fn().mockReturnValue({
        get: jest.fn().mockResolvedValue(null),
      }),
      acquireLock: jest.fn().mockResolvedValue(true),
      releaseLock: jest.fn().mockResolvedValue(true),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CalendarService,
        { provide: PrismaService, useValue: prisma },
        { provide: RedisService, useValue: redis },
      ],
    }).compile();

    service = module.get<CalendarService>(CalendarService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should return empty slots if doctor is on leave', async () => {
    prisma.doctor.findFirst.mockResolvedValue({ id: 'doc1' });
    prisma.doctorLeave.findFirst.mockResolvedValue({ id: 'leave1' });

    const slots = await service.getAvailableSlots('clinic1', 'doc1', '2026-07-11');
    expect(slots).toEqual([]);
  });
});
