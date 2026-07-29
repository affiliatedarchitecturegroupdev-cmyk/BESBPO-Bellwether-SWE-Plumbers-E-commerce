import {
  IsBoolean,
  IsDateString,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Min,
  MinLength,
  ValidateIf,
} from 'class-validator';

export class CreateProductDto {
  @IsString()
  @MinLength(1)
  sku!: string;

  @IsString()
  @MinLength(1)
  slug!: string;

  @IsString()
  @MinLength(1)
  name!: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsUUID()
  categoryId!: string;

  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  retailPrice!: number;

  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  tradePrice!: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  stockQty?: number;

  @IsOptional()
  @IsBoolean()
  sansCompliant?: boolean;

  @IsOptional()
  @IsString()
  brand?: string;

  // Optional — defaults to the schema's generic-parcel placeholder
  // (Product.weightKg etc.) when omitted, same as every other optional
  // field here. Real values matter for ShippingService's rate quotes;
  // see docs/AGENTS.md's logistics section.
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0.01)
  weightKg?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  lengthCm?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  widthCm?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  heightCm?: number;

  // Both optional, independent of each other at the DTO level — a
  // clearance review screen sets both together in practice, but nothing
  // here requires it (an admin manually clearing a sale might send only
  // salePrice: null). See the schema's own comment on Product for what
  // null/present combinations mean.
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0.01)
  salePrice?: number | null;

  @IsOptional()
  @IsDateString()
  saleEndsAt?: string | null;

  // Three valid states: both omitted/undefined (standalone product, never
  // touched variants), both explicitly null (clearing a PREVIOUSLY-set
  // assignment on an update), or both present with real values. Only
  // "one set, one not" is invalid. The ValidateIf conditions check for
  // "meaningfully present" (not undefined AND not null) specifically so
  // an explicit {variantGroupId: null, variantValue: null} — which the
  // admin form sends when "None" is selected to clear an existing
  // assignment — skips IsUUID/IsString rather than failing on a null
  // value those decorators would otherwise reject outright. The service
  // layer (ProductsService.update's merged-state check) is the actual
  // enforcement point for "both or neither" across a partial update,
  // which needs the existing database row a DTO alone can't see.
  @ValidateIf((dto) => dto.variantValue !== undefined && dto.variantValue !== null)
  @IsUUID()
  variantGroupId?: string | null;

  @ValidateIf((dto) => dto.variantGroupId !== undefined && dto.variantGroupId !== null)
  @IsString()
  @MinLength(1)
  variantValue?: string | null;
}
