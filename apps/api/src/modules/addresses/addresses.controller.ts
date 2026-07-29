import { Body, Controller, Delete, Get, Param, ParseUUIDPipe, Patch, Post, UseGuards } from '@nestjs/common';
import { AddressesService } from './addresses.service';
import { CreateAddressDto } from './dto/create-address.dto';
import { UpdateAddressDto } from './dto/update-address.dto';
import { KeycloakAuthGuard } from '../../common/guards/keycloak-auth.guard';
import { CurrentAccount, AuthenticatedAccount } from '../../common/decorators/current-account.decorator';

// No @Scopes() anywhere here, same reasoning as CartController — every
// endpoint only ever touches the caller's own addresses (enforced in
// AddressesService, not here), so there's no "manage anyone's addresses"
// permission to gate.
@UseGuards(KeycloakAuthGuard)
@Controller({ path: 'addresses', version: '1' })
export class AddressesController {
  constructor(private readonly addressesService: AddressesService) {}

  @Post()
  create(@CurrentAccount() current: AuthenticatedAccount, @Body() dto: CreateAddressDto) {
    return this.addressesService.create(current.keycloakSub, current.email, dto);
  }

  @Get()
  findMine(@CurrentAccount() current: AuthenticatedAccount) {
    return this.addressesService.findMine(current.keycloakSub, current.email);
  }

  @Patch(':id')
  update(
    @CurrentAccount() current: AuthenticatedAccount,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateAddressDto,
  ) {
    return this.addressesService.update(current.keycloakSub, current.email, id, dto);
  }

  @Delete(':id')
  remove(@CurrentAccount() current: AuthenticatedAccount, @Param('id', ParseUUIDPipe) id: string) {
    return this.addressesService.remove(current.keycloakSub, current.email, id);
  }
}
