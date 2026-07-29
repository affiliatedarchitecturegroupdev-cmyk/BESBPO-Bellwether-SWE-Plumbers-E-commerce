import { IsNumber, IsOptional, IsString, Min } from 'class-validator';

export class ResolveAsRefundDto {
  @IsNumber()
  @Min(0.01)
  refundAmount!: number;

  @IsOptional()
  @IsString()
  adminNote?: string;
}
