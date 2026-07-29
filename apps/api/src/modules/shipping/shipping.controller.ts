import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { ShippingService } from './shipping.service';
import { ShippingQuoteAddressDto } from './dto/shipping-quote-address.dto';
import { KeycloakAuthGuard } from '../../common/guards/keycloak-auth.guard';
import { CurrentAccount, AuthenticatedAccount } from '../../common/decorators/current-account.decorator';

// Auth-gated, not public — a real quote needs the caller's own cart
// (for weight/dimensions), which only makes sense for a signed-in
// session the same way checkout itself does.
@UseGuards(KeycloakAuthGuard)
@Controller({ path: 'shipping', version: '1' })
export class ShippingController {
  constructor(private readonly shippingService: ShippingService) {}

  @Post('quote')
  getQuote(@CurrentAccount() current: AuthenticatedAccount, @Body() dto: ShippingQuoteAddressDto) {
    return this.shippingService.getQuote(current.keycloakSub, current.email, dto);
  }
}
