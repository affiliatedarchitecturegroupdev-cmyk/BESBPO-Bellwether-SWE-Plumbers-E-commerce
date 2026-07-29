import { Controller, Delete, Get, Param, ParseUUIDPipe, Post, UseGuards } from '@nestjs/common';
import { WishlistService } from './wishlist.service';
import { KeycloakAuthGuard } from '../../common/guards/keycloak-auth.guard';
import { CurrentAccount, AuthenticatedAccount } from '../../common/decorators/current-account.decorator';

// No @Scopes() on any of these, same reasoning as CartController — a
// valid token is enough, since every endpoint only ever touches the
// caller's own wishlist (enforced in WishlistService via
// resolveOrCreate, not here).
@UseGuards(KeycloakAuthGuard)
@Controller({ path: 'wishlist', version: '1' })
export class WishlistController {
  constructor(private readonly wishlistService: WishlistService) {}

  @Get()
  list(@CurrentAccount() current: AuthenticatedAccount) {
    return this.wishlistService.list(current.keycloakSub, current.email);
  }

  @Post(':productId')
  add(@CurrentAccount() current: AuthenticatedAccount, @Param('productId', ParseUUIDPipe) productId: string) {
    return this.wishlistService.add(current.keycloakSub, current.email, productId);
  }

  @Delete(':productId')
  remove(@CurrentAccount() current: AuthenticatedAccount, @Param('productId', ParseUUIDPipe) productId: string) {
    return this.wishlistService.remove(current.keycloakSub, current.email, productId);
  }
}
