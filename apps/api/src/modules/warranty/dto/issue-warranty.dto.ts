import { IsInt, IsOptional, IsUUID, Max, Min } from 'class-validator';

export class IssueWarrantyDto {
  @IsUUID()
  bookingId!: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(120) // 10 years — generous ceiling against a fat-fingered entry, not a real product limit
  termMonths?: number = 12;
}
