export type UserRole = 'SuperAdmin' | 'ClinicAdmin' | 'Receptionist' | 'Doctor';

export type AppointmentStatus = 'booked' | 'confirmed' | 'completed' | 'cancelled' | 'no_show' | 'waitlisted';

export type AppointmentChannel = 'web' | 'voice' | 'whatsapp' | 'walkin';

export interface DecodedToken {
  userId: string;
  clinicId: string;
  role: UserRole;
  name: string;
}
