import { IsNumber, IsOptional, IsString, Min, MinLength } from 'class-validator';

export class UpdateComplexityMultiplierDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  label?: string;

  @IsOptional()
  @IsNumber()
  @Min(0.01)
  multiplier?: number;

  @IsOptional()
  @IsString()
  description?: string;
}
