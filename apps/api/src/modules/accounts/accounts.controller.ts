import { Body, Controller, Delete, Get, HttpStatus, Param, ParseUUIDPipe, Patch, Post, Query, Res, UseGuards } from '@nestjs/common';
import { Response } from 'express';
import { AccountsService } from './accounts.service';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { InviteMemberDto } from './dto/invite-member.dto';
import { UpdateMemberRoleDto } from './dto/update-member-role.dto';
import { QueryAccountsDto } from './dto/query-accounts.dto';
import { KeycloakAuthGuard } from '../../common/guards/keycloak-auth.guard';
import { Scopes } from '../../common/decorators/scopes.decorator';
import { CurrentAccount, AuthenticatedAccount } from '../../common/decorators/current-account.decorator';

@Controller({ path: 'accounts', version: '1' })
export class AccountsController {
  constructor(private readonly accountsService: AccountsService) {}

  @UseGuards(KeycloakAuthGuard)
  @Get('me')
  getMe(@CurrentAccount() current: AuthenticatedAccount) {
    return this.accountsService.resolveOrCreate(current.keycloakSub, current.email);
  }

  @UseGuards(KeycloakAuthGuard)
  @Patch('me')
  updateProfile(@CurrentAccount() current: AuthenticatedAccount, @Body() dto: UpdateProfileDto) {
    return this.accountsService.updateProfile(current.keycloakSub, current.email, dto);
  }

  // POPIA data-portability request — see AccountsService.exportData for
  // exactly what's included and why the cart is deliberately left out.
  @UseGuards(KeycloakAuthGuard)
  @Get('me/export')
  exportData(@CurrentAccount() current: AuthenticatedAccount) {
    return this.accountsService.exportData(current.keycloakSub, current.email);
  }

  // Multi-user trade accounts — see AccountMember's own schema comment
  // and AccountsService.inviteMember/removeMember for the owner-only
  // enforcement. Any account member (owner or buyer) can list who else
  // is on the account; only an owner can invite or remove.
  @UseGuards(KeycloakAuthGuard)
  @Get('me/members')
  listMembers(@CurrentAccount() current: AuthenticatedAccount) {
    return this.accountsService.listMembers(current.keycloakSub, current.email);
  }

  @UseGuards(KeycloakAuthGuard)
  @Post('me/members')
  inviteMember(@CurrentAccount() current: AuthenticatedAccount, @Body() dto: InviteMemberDto) {
    return this.accountsService.inviteMember(current.keycloakSub, current.email, dto.email);
  }

  @UseGuards(KeycloakAuthGuard)
  @Delete('me/members/:id')
  removeMember(@CurrentAccount() current: AuthenticatedAccount, @Param('id', ParseUUIDPipe) id: string) {
    return this.accountsService.removeMember(current.keycloakSub, current.email, id);
  }

  @UseGuards(KeycloakAuthGuard)
  @Patch('me/members/:id/role')
  updateMemberRole(
    @CurrentAccount() current: AuthenticatedAccount,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateMemberRoleDto,
  ) {
    return this.accountsService.updateMemberRole(current.keycloakSub, current.email, id, dto.role);
  }

  // Admin-only — the customer/account listing that never existed
  // anywhere before this. Read-only, so gated by its own accounts:read
  // scope rather than requiring a :manage-level scope this pass doesn't
  // add any mutation capability for.
  @UseGuards(KeycloakAuthGuard)
  @Scopes('accounts:read')
  @Get()
  findAllAdmin(@Query() query: QueryAccountsDto) {
    return this.accountsService.findAllAdmin(query);
  }

  // Declared after every literal 'me'-prefixed route above, so a bare
  // :id can never shadow them.
  @UseGuards(KeycloakAuthGuard)
  @Scopes('accounts:read')
  @Get(':id')
  findOneAdmin(@Param('id', ParseUUIDPipe) id: string) {
    return this.accountsService.findOneAdmin(id);
  }

  // POPIA erasure request — anonymizes, doesn't hard-delete everything.
  // See AccountsService.eraseData for the reasoning and its known gaps.
  //
  // Uses @Res() directly, not a plain return + @HttpCode(204) — the
  // global TransformResponseInterceptor wraps every controller return
  // value in a {data, meta} JSON body via RxJS's map, and it does this
  // regardless of the status code set by @HttpCode. A 204 response with a
  // body is a real HTTP spec violation (RFC 7231), not just an
  // inconsistency — some proxies or HTTP clients strip or reject it
  // unpredictably. @Res() bypasses the interceptor for this one endpoint,
  // the same reasoning as HealthController's use of it.
  @UseGuards(KeycloakAuthGuard)
  @Delete('me')
  async eraseData(@CurrentAccount() current: AuthenticatedAccount, @Res() res: Response): Promise<void> {
    await this.accountsService.eraseData(current.keycloakSub, current.email);
    res.status(HttpStatus.NO_CONTENT).send();
  }
}
