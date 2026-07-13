import { Injectable, UnauthorizedException, ConflictException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../../prisma.service';
import { LoginDto } from './dto/login.dto';
import { RegisterClinicDto } from './dto/register-clinic.dto';
import * as bcrypt from 'bcrypt';
import { DecodedToken } from '@clinicengage/types';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
  ) {}

  async login(loginDto: LoginDto) {
    const user = await this.prisma.user.findUnique({
      where: { email: loginDto.email },
      include: { clinic: true },
    });

    if (!user) {
      throw new UnauthorizedException('Invalid email or password');
    }

    const passwordMatch = await bcrypt.compare(loginDto.password, user.passwordHash);
    if (!passwordMatch) {
      throw new UnauthorizedException('Invalid email or password');
    }

    const payload: DecodedToken = {
      userId: user.id,
      clinicId: user.clinicId,
      role: user.role as any,
      name: user.name,
    };

    const token = await this.jwtService.signAsync(payload);
    return {
      accessToken: token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        clinic: {
          id: user.clinic.id,
          name: user.clinic.name,
          timezone: user.clinic.timezone,
        },
      },
    };
  }

  async registerClinic(dto: RegisterClinicDto) {
    const existingUser = await this.prisma.user.findUnique({
      where: { email: dto.adminEmail },
    });
    if (existingUser) {
      throw new ConflictException('Email already registered');
    }

    const passwordHash = await bcrypt.hash(dto.adminPassword, 10);

    return this.prisma.$transaction(async (tx) => {
      const clinic = await tx.clinic.create({
        data: {
          name: dto.clinicName,
          timezone: dto.timezone,
          phone: dto.clinicPhone,
          address: dto.address,
        },
      });

      const user = await tx.user.create({
        data: {
          clinicId: clinic.id,
          name: dto.adminName,
          email: dto.adminEmail,
          phone: dto.adminPhone,
          role: 'ClinicAdmin',
          passwordHash,
        },
      });

      const payload: DecodedToken = {
        userId: user.id,
        clinicId: clinic.id,
        role: 'ClinicAdmin',
        name: user.name,
      };

      const token = await this.jwtService.signAsync(payload);
      return {
        accessToken: token,
        clinic,
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
        },
      };
    });
  }
}
