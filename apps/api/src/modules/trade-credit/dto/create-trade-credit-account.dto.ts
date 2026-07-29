import { IsEnum, IsInt, IsNumber, IsOptional, IsString, IsUUID, Min, MinLength, ValidateIf } from 'class-validator';
import { CreditPath } from '@prisma/client';

export class CreateTradeCreditAccountDto {
  @IsUUID()
  accountId!: string;

  @IsEnum(CreditPath)
  creditPath!: CreditPath;

  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  creditLimit!: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  paymentTermDays?: number = 30;

  // Required only when routing through a registered intermediary (Lula,
  // Merchant Capital, Tyme Business, etc.) — an internal incidental-credit
  // account (see /areas notes on the NCA exemption this relies on) has
  // neither of these, since Bellwether is the credit provider on that path,
  // not a referral to one.
  @ValidateIf((dto: CreateTradeCreditAccountDto) => dto.creditPath === CreditPath.THIRD_PARTY_INTERMEDIARY)
  @IsString()
  @MinLength(1)
  intermediaryProvider?: string;

  @ValidateIf((dto: CreateTradeCreditAccountDto) => dto.creditPath === CreditPath.THIRD_PARTY_INTERMEDIARY)
  @IsString()
  @MinLength(1)
  intermediaryAccountRef?: string;
}
