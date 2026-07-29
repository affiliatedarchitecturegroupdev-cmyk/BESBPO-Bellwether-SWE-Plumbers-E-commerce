import { Type } from 'class-transformer';
import { ArrayMinSize, IsArray, IsEnum, IsNumber, IsOptional, IsString, IsUUID, MaxLength, Min, ValidateNested } from 'class-validator';
import { ShippingAddressDto } from './shipping-address.dto';

export enum CheckoutPaymentMethod {
  PAYFAST = 'payfast',
  TRADE_CREDIT = 'trade_credit',
}

export class CheckoutDto {
  @ValidateNested()
  @Type(() => ShippingAddressDto)
  shippingAddress!: ShippingAddressDto;

  // Omitted (the default): checks out the whole cart, exactly as
  // before this field existed. Provided: checks out ONLY these specific
  // cart items, to THIS call's own shippingAddress — the split-checkout
  // path, where a customer with items destined for several job sites
  // calls this endpoint once per address, each with its own subset of
  // cart item IDs. See OrdersService.checkout's own comment for why a
  // coupon currently blocks this path entirely, and CartService.clear's
  // comment for how a split order's own cart items get removed without
  // touching a sibling split order still awaiting its own payment.
  @IsOptional()
  @IsArray()
  @ArrayMinSize(1)
  @IsUUID('4', { each: true })
  cartItemIds?: string[];

  // Client-supplied, not re-verified against a fresh server-side quote at
  // checkout time — ShippingService.getQuote (POST /v1/shipping/quote)
  // exists and computes a real figure the frontend calls beforehand (see
  // checkout-actions.ts), but checkout itself trusts whatever value comes
  // back rather than re-computing and comparing. A real "reject if it
  // doesn't match a fresh quote" check is a further hardening step, not
  // done here — this is no longer "rate lookup doesn't exist yet" (it
  // does), just "checkout doesn't re-verify the client's own number."
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  deliveryFee?: number = 0;

  // Optional, free text — the customer's own internal purchase-order or
  // reference number, for their own accounting. Threaded straight through
  // to Order.poNumber; this app never validates or interprets it.
  @IsOptional()
  @IsString()
  @MaxLength(100)
  poNumber?: string;

  // PAYFAST (default): order is created PENDING, customer is redirected to
  // pay, cart clears once PaymentsService.handleItn confirms payment.
  // TRADE_CREDIT: no redirect — the order confirms immediately against the
  // account's available credit, checked atomically in the same
  // transaction as order creation (see OrdersService.checkout).
  @IsOptional()
  @IsEnum(CheckoutPaymentMethod)
  paymentMethod?: CheckoutPaymentMethod = CheckoutPaymentMethod.PAYFAST;
}
