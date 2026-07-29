import { Type } from 'class-transformer';
import { ArrayUnique, IsArray, IsBoolean, IsOptional, IsString, IsUUID, ValidateNested } from 'class-validator';

class MaterialLineInput {
  @IsUUID()
  productId!: string;

  @Type(() => Number)
  quantity!: number;
}

export class QuoteRequestDto {
  @IsString()
  sector!: string; // Residential | Commercial | Industrial | Institutional | Civil | Infrastructure

  @IsString()
  serviceCode!: string;

  @IsOptional()
  @IsArray()
  @ArrayUnique()
  @IsString({ each: true })
  complexityMultiplierCodes?: string[];

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => MaterialLineInput)
  materials?: MaterialLineInput[];

  @IsOptional()
  @IsBoolean()
  tradePricing?: boolean;
}
