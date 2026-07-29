import { ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { ShippingAddressDto } from '../../orders/dto/shipping-address.dto';

// A quote request never collects a delivery address — it's a pricing
// conversation, not a checkout. This has to come from somewhere at
// conversion time, and asking the admin (who's coordinating with the
// customer directly at this point anyway, per the manual-follow-up
// design) is simpler and more honest than guessing from a saved address
// that may not even exist for every account.
export class ConvertQuoteToOrderDto {
  @ValidateNested()
  @Type(() => ShippingAddressDto)
  shippingAddress!: ShippingAddressDto;
}
