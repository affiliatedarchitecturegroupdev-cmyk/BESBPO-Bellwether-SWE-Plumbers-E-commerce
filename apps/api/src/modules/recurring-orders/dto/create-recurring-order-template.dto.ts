import { ArrayMinSize, IsArray, IsEnum, IsOptional, IsString, MinLength, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { RecurringFrequency } from '@prisma/client';
import { ShippingAddressDto } from '../../orders/dto/shipping-address.dto';
import { AddCartItemDto } from '../../cart/dto/cart-item.dto';

export class CreateRecurringOrderTemplateDto {
  @IsString()
  @MinLength(1)
  name!: string;

  @IsEnum(RecurringFrequency)
  frequency!: RecurringFrequency;

  @ValidateNested()
  @Type(() => ShippingAddressDto)
  shippingAddress!: ShippingAddressDto;

  @IsOptional()
  @IsString()
  poNumber?: string;

  // Reuses AddCartItemDto's own shape ({productId, quantity}) — this is
  // the same "what to order" concept a cart line already is, just
  // persisted as a template instead of transient cart state.
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => AddCartItemDto)
  items!: AddCartItemDto[];
}
