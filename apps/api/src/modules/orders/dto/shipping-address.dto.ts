import { IsOptional, IsString, MinLength } from 'class-validator';

export class ShippingAddressDto {
  @IsString()
  @MinLength(1)
  line1!: string;

  @IsOptional()
  @IsString()
  line2?: string;

  @IsString()
  @MinLength(1)
  city!: string;

  @IsString()
  @MinLength(1)
  province!: string;

  @IsString()
  @MinLength(1)
  postalCode!: string;
}
