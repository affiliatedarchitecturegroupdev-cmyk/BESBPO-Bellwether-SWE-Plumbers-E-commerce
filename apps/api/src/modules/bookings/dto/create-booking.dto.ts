import { ArrayUnique, IsArray, IsOptional, IsString, IsUUID, MinLength } from 'class-validator';

export class CreateBookingDto {
  @IsString()
  sector!: string;

  @IsString()
  serviceCode!: string;

  @IsString()
  @MinLength(1)
  siteAddress!: string;

  @IsOptional()
  @IsArray()
  @ArrayUnique()
  @IsString({ each: true })
  complexityMultiplierCodes?: string[];

  @IsOptional()
  @IsString()
  notes?: string;

  // Links a field-service booking to a materials order placed through the
  // storefront (e.g. a customer buys a booster pump kit, then books the
  // install) — optional, since plenty of bookings (a callout for a leak)
  // have no associated order at all.
  @IsOptional()
  @IsUUID()
  orderId?: string;
}
