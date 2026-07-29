import { Body, Controller, Get, Param, ParseUUIDPipe, Post, UseGuards } from '@nestjs/common';
import { WarrantyService } from './warranty.service';
import { IssueWarrantyDto } from './dto/issue-warranty.dto';
import { KeycloakAuthGuard } from '../../common/guards/keycloak-auth.guard';
import { Scopes } from '../../common/decorators/scopes.decorator';
import { CurrentAccount, AuthenticatedAccount } from '../../common/decorators/current-account.decorator';

@UseGuards(KeycloakAuthGuard)
@Controller({ path: 'warranty', version: '1' })
export class WarrantyController {
  constructor(private readonly warrantyService: WarrantyService) {}

  // Field-team/admin path — see WarrantyService.issue for why this isn't
  // account-scoped like everything else in this controller.
  @Scopes('warranty:manage')
  @Post()
  issue(@CurrentAccount() current: AuthenticatedAccount, @Body() dto: IssueWarrantyDto) {
    return this.warrantyService.issue(dto, current.email);
  }

  @Get()
  findMine(@CurrentAccount() current: AuthenticatedAccount) {
    return this.warrantyService.findMine(current.keycloakSub, current.email);
  }

  @Get(':id')
  findOne(@CurrentAccount() current: AuthenticatedAccount, @Param('id', ParseUUIDPipe) id: string) {
    return this.warrantyService.findOneForAccount(current.keycloakSub, current.email, id);
  }
}
