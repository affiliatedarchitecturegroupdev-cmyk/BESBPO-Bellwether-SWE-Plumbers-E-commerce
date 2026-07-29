import {
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsEnum,
  IsOptional,
  IsString,
  MinLength,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { RecurringFrequency } from '@prisma/client';
import { ShippingAddressDto } from '../../orders/dto/shipping-address.dto';
import { AddCartItemDto } from '../../cart/dto/cart-item.dto';

export class UpdateRecurringOrderTemplateDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  name?: string;

  @IsOptional()
  @IsEnum(RecurringFrequency)
  frequency?: RecurringFrequency;

  @IsOptional()
  @ValidateNested()
  @Type(() => ShippingAddressDto)
  shippingAddress?: ShippingAddressDto;

  @IsOptional()
  @IsString()
  poNumber?: string;

  @IsOptional()
  @IsBoolean()
  active?: boolean;

  // When provided, REPLACES the entire existing item set — not a merge
  // or partial patch. Simpler and more predictable for a customer
  // editing "what's in my recurring order" than trying to express
  // additions/removals/quantity-changes as three separate operations.
  @IsOptional()
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => AddCartItemDto)
  items?: AddCartItemDto[];
}
