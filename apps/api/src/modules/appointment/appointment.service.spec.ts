import { Test, TestingModule } from '@nestjs/testing';
import { AppointmentService } from './appointment.service';
import { PrismaService } from '../../prisma.service';
import { CalendarService } from '../calendar/calendar.service';

describe('AppointmentService', () => {
  let service: AppointmentService;
  let prisma: any;
  let calendar: any;

  beforeEach(async () => {
    prisma = {
      patient: { findFirst: jest.fn() },
      doctor: { findFirst: jest.fn() },
      appointment: { create: jest.fn() },
      patientTimeline: { create: jest.fn() },
      eventLog: { create: jest.fn() },
      $transaction: jest.fn().mockImplementation((cb) => cb(prisma)),
    };

    calendar = {
      getAvailableSlots: jest.fn(),
      releaseSlotLock: jest.fn().mockResolvedValue(true),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AppointmentService,
        { provide: PrismaService, useValue: prisma },
        { provide: CalendarService, useValue: calendar },
      ],
    }).compile();

    service = module.get<AppointmentService>(AppointmentService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
