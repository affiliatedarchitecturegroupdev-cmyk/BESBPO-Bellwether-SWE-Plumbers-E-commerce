import { IsNumber, IsOptional, IsString, Min, MinLength } from 'class-validator';

export class CreateComplexityMultiplierDto {
  @IsString()
  @MinLength(1)
  code!: string;

  @IsString()
  @MinLength(1)
  label!: string;

  // A multiplier, not a percentage — 1.25 means "25% more," not "1.25%."
  // Stored and applied exactly as entered; PricingService.quote
  // multiplies these together (compounding), not adding them.
  @IsNumber()
  @Min(0.01)
  multiplier!: number;

  @IsOptional()
  @IsString()
  description?: string;
}
