import { IsBoolean, IsDateString, IsEnum, IsInt, IsNumber, IsOptional, IsString, Min, MinLength } from 'class-validator';
import { DiscountType } from '@prisma/client';

export class CreateCouponDto {
  @IsString()
  @MinLength(3)
  code!: string;

  @IsEnum(DiscountType)
  discountType!: DiscountType;

  // Validated the same regardless of type at the DTO level (>= 0) — the
  // REAL constraint ("percentage can't exceed 100") is type-specific and
  // enforced in CouponsService.create instead, since class-validator
  // can't easily express "max depends on another field's value" cleanly.
  @IsNumber()
  @Min(0)
  discountValue!: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  minSubtotal?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  maxUses?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  maxUsesPerAccount?: number;

  @IsOptional()
  @IsBoolean()
  active?: boolean;

  @IsOptional()
  @IsDateString()
  validFrom?: string;

  @IsOptional()
  @IsDateString()
  validUntil?: string;
}
