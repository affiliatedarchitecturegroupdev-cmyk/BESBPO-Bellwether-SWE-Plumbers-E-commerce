import { Body, Controller, Delete, Get, Param, ParseUUIDPipe, Patch, Post, UseGuards } from '@nestjs/common';
import { CartService } from './cart.service';
import { AddCartItemDto, BulkAddCartItemsDto, UpdateCartItemDto } from './dto/cart-item.dto';
import { ApplyCouponDto } from './dto/apply-coupon.dto';
import { KeycloakAuthGuard } from '../../common/guards/keycloak-auth.guard';
import { CurrentAccount, AuthenticatedAccount } from '../../common/decorators/current-account.decorator';

// No @Scopes() on any of these — a valid token is enough, since every
// endpoint only ever touches the caller's own cart (enforced in
// CartService, not here). There's no "manage anyone's cart" permission to
// gate in the first place.
@UseGuards(KeycloakAuthGuard)
@Controller({ path: 'cart', version: '1' })
export class CartController {
  constructor(private readonly cartService: CartService) {}

  @Get()
  getCart(@CurrentAccount() current: AuthenticatedAccount) {
    return this.cartService.getCart(current.keycloakSub, current.email);
  }

  @Post('items')
  addItem(@CurrentAccount() current: AuthenticatedAccount, @Body() dto: AddCartItemDto) {
    return this.cartService.addItem(current.keycloakSub, current.email, dto);
  }

  // Trade portal's bulk-order page.
  @Post('items/bulk')
  bulkAddItems(@CurrentAccount() current: AuthenticatedAccount, @Body() dto: BulkAddCartItemsDto) {
    return this.cartService.bulkAddItems(current.keycloakSub, current.email, dto);
  }

  @Patch('items/:id')
  updateItem(
    @CurrentAccount() current: AuthenticatedAccount,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateCartItemDto,
  ) {
    return this.cartService.updateItem(current.keycloakSub, current.email, id, dto);
  }

  @Delete('items/:id')
  removeItem(@CurrentAccount() current: AuthenticatedAccount, @Param('id', ParseUUIDPipe) id: string) {
    return this.cartService.removeItem(current.keycloakSub, current.email, id);
  }

  @Delete()
  clear(@CurrentAccount() current: AuthenticatedAccount) {
    return this.cartService.clear(current.keycloakSub, current.email);
  }

  @Post('coupon')
  applyCoupon(@CurrentAccount() current: AuthenticatedAccount, @Body() dto: ApplyCouponDto) {
    return this.cartService.applyCoupon(current.keycloakSub, current.email, dto.code);
  }

  @Delete('coupon')
  removeCoupon(@CurrentAccount() current: AuthenticatedAccount) {
    return this.cartService.removeCoupon(current.keycloakSub, current.email);
  }
}
