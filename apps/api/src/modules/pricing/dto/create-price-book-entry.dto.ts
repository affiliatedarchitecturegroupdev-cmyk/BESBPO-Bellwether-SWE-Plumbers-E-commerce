import { IsIn, IsNumber, IsOptional, IsString, IsUUID, Min, MinLength } from 'class-validator';

const VALID_UNITS = ['per_fixture', 'per_meter', 'per_hour'];

export class CreatePriceBookEntryDto {
  @IsString()
  @MinLength(1)
  sector!: string;

  @IsString()
  @MinLength(1)
  serviceCode!: string;

  @IsOptional()
  @IsUUID()
  productId?: string;

  @IsNumber()
  @Min(0)
  baseLaborRate!: number;

  @IsIn(VALID_UNITS)
  unit!: string;

  // No effectiveFrom field here — deliberately. It's always "now," set by
  // PricingAdminService at creation time, not something an admin
  // backdates or postdates through this form. See that service's own
  // comment on why "editing" a rate means creating a new entry, not
  // updating the old one.
}
