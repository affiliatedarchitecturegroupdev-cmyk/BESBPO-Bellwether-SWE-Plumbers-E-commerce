import { Body, Controller, Get, Param, ParseUUIDPipe, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ReturnStatus } from '@prisma/client';
import { ReturnsService } from './returns.service';
import { CreateReturnRequestDto } from './dto/create-return-request.dto';
import { RejectReturnDto } from './dto/reject-return.dto';
import { AdminNoteDto } from './dto/admin-note.dto';
import { ResolveAsRefundDto } from './dto/resolve-as-refund.dto';
import { KeycloakAuthGuard } from '../../common/guards/keycloak-auth.guard';
import { Scopes, AnyScope } from '../../common/decorators/scopes.decorator';
import { CurrentAccount, AuthenticatedAccount } from '../../common/decorators/current-account.decorator';

@Controller({ path: 'returns', version: '1' })
export class ReturnsController {
  constructor(private readonly returnsService: ReturnsService) {}

  @UseGuards(KeycloakAuthGuard)
  @Post()
  create(@CurrentAccount() current: AuthenticatedAccount, @Body() dto: CreateReturnRequestDto) {
    return this.returnsService.create(current.keycloakSub, current.email, dto);
  }

  @UseGuards(KeycloakAuthGuard)
  @Get()
  findMine(@CurrentAccount() current: AuthenticatedAccount) {
    return this.returnsService.findMine(current.keycloakSub, current.email);
  }

  // 'admin' declared before ':id' — Express/Nest route matching tries
  // routes in declaration order, and 'admin' would otherwise be
  // swallowed as an (invalid, since it's not a UUID) :id value.
  @UseGuards(KeycloakAuthGuard)
  @AnyScope('orders:read', 'orders:manage')
  @Get('admin')
  findAllAdmin(@Query('status') status?: ReturnStatus) {
    return this.returnsService.findAllAdmin(status);
  }

  @UseGuards(KeycloakAuthGuard)
  @AnyScope('orders:read', 'orders:manage')
  @Get('admin/:id')
  findOneAdmin(@Param('id', ParseUUIDPipe) id: string) {
    return this.returnsService.findOneAdmin(id);
  }

  @UseGuards(KeycloakAuthGuard)
  @Get(':id')
  findOne(@CurrentAccount() current: AuthenticatedAccount, @Param('id', ParseUUIDPipe) id: string) {
    return this.returnsService.findOneForAccount(current.keycloakSub, current.email, id);
  }

  @UseGuards(KeycloakAuthGuard)
  @Scopes('orders:manage')
  @Patch(':id/approve')
  approve(@Param('id', ParseUUIDPipe) id: string, @Body() dto: AdminNoteDto) {
    return this.returnsService.approve(id, dto.adminNote);
  }

  @UseGuards(KeycloakAuthGuard)
  @Scopes('orders:manage')
  @Patch(':id/reject')
  reject(@Param('id', ParseUUIDPipe) id: string, @Body() dto: RejectReturnDto) {
    return this.returnsService.reject(id, dto.adminNote);
  }

  @UseGuards(KeycloakAuthGuard)
  @Scopes('orders:manage')
  @Patch(':id/receive')
  markReceived(@Param('id', ParseUUIDPipe) id: string, @Body() dto: AdminNoteDto) {
    return this.returnsService.markReceived(id, dto.adminNote);
  }

  @UseGuards(KeycloakAuthGuard)
  @Scopes('orders:manage')
  @Patch(':id/refund')
  resolveAsRefund(@Param('id', ParseUUIDPipe) id: string, @Body() dto: ResolveAsRefundDto) {
    return this.returnsService.resolveAsRefund(id, dto);
  }

  @UseGuards(KeycloakAuthGuard)
  @Scopes('orders:manage')
  @Patch(':id/replace')
  resolveAsReplacement(@Param('id', ParseUUIDPipe) id: string, @Body() dto: AdminNoteDto) {
    return this.returnsService.resolveAsReplacement(id, dto.adminNote);
  }
}
