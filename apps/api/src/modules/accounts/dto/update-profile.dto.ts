import { IsEmail, IsOptional, IsString, MaxLength } from 'class-validator';

// type (RETAIL/TRADE) is deliberately not editable here — that's a
// business/admin decision (see TradeCreditService's own account-setup
// reasoning), not a customer self-service toggle.
export class UpdateProfileDto {
  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  companyName?: string;

  @IsOptional()
  @IsString()
  @MaxLength(30)
  phone?: string;
}
