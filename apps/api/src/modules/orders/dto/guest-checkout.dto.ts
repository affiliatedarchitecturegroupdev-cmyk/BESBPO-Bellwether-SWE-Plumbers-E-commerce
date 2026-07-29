import { ArrayMinSize, IsArray, IsEmail, IsOptional, IsString, MaxLength, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { ShippingAddressDto } from './shipping-address.dto';
import { AddCartItemDto } from '../../cart/dto/cart-item.dto';

// No paymentMethod field — guest checkout is PayFast-only, enforced in
// OrdersService.guestCheckout, not left to the client to (mis)request
// trade credit for an account that was never approved for it.
export class GuestCheckoutDto {
  @IsEmail()
  email!: string;

  @ValidateNested()
  @Type(() => ShippingAddressDto)
  shippingAddress!: ShippingAddressDto;

  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => AddCartItemDto)
  items!: AddCartItemDto[];

  @IsOptional()
  @IsString()
  @MaxLength(200)
  companyName?: string;

  @IsOptional()
  @IsString()
  @MaxLength(30)
  phone?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  poNumber?: string;
}
