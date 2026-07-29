import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Min,
  MinLength,
  ValidateNested,
} from 'class-validator';

class BundleItemInput {
  @IsUUID()
  productId!: string;

  @IsInt()
  @Min(1)
  quantity!: number;
}

export class CreateBundleDto {
  @IsString()
  @MinLength(1)
  slug!: string;

  @IsString()
  @MinLength(1)
  name!: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsString()
  sector!: string;

  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  bundlePrice!: number;

  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => BundleItemInput)
  items!: BundleItemInput[];
}
