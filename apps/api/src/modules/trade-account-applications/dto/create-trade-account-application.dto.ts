import { IsInt, IsOptional, IsString, Min, MinLength } from 'class-validator';

export class CreateTradeAccountApplicationDto {
  @IsString()
  @MinLength(1)
  companyName!: string;

  @IsOptional()
  @IsString()
  companyRegNumber?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  yearsInBusiness?: number;

  @IsOptional()
  @IsString()
  message?: string;
}
