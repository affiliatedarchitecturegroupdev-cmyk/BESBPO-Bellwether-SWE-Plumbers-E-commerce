import { IsDateString, IsEnum, IsOptional } from 'class-validator';
import { BookingStatus } from '@prisma/client';

export class UpdateBookingStatusDto {
  @IsEnum(BookingStatus)
  status!: BookingStatus;

  @IsOptional()
  @IsDateString()
  scheduledFor?: string;
}
