import { IsBoolean, IsOptional, IsString, MinLength } from 'class-validator';

export class RequestEstimateDto {
  @IsString()
  @MinLength(10) // a one-word description can't be classified meaningfully — this isn't enforced by the AI service, so enforce it here before even calling it
  description!: string;

  @IsOptional()
  @IsBoolean()
  tradePricing?: boolean;
}
