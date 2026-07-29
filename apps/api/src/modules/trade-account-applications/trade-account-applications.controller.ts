import { Body, Controller, Get, Param, ParseUUIDPipe, Post, Query, UseGuards } from '@nestjs/common';
import { TradeApplicationStatus } from '@prisma/client';
import { TradeAccountApplicationsService } from './trade-account-applications.service';
import { CreateTradeAccountApplicationDto } from './dto/create-trade-account-application.dto';
import { RejectTradeAccountApplicationDto } from './dto/reject-trade-account-application.dto';
import { KeycloakAuthGuard } from '../../common/guards/keycloak-auth.guard';
import { Scopes } from '../../common/decorators/scopes.decorator';
import { CurrentAccount, AuthenticatedAccount } from '../../common/decorators/current-account.decorator';

// Same pattern as TradeCreditController: everything below except
// 'me'/create is admin territory, gated by its own dedicated scope
// (trade-applications:manage) rather than reusing trade-credit:manage —
// approving TRADE account type and approving trade CREDIT are genuinely
// separate decisions a business might want different people authorized
// for.
@UseGuards(KeycloakAuthGuard)
@Controller({ path: 'trade-account-applications', version: '1' })
export class TradeAccountApplicationsController {
  constructor(private readonly applicationsService: TradeAccountApplicationsService) {}

  @Post()
  create(@CurrentAccount() current: AuthenticatedAccount, @Body() dto: CreateTradeAccountApplicationDto) {
    return this.applicationsService.create(current.keycloakSub, current.email, dto);
  }

  @Get('me')
  findMine(@CurrentAccount() current: AuthenticatedAccount) {
    return this.applicationsService.findMine(current.keycloakSub, current.email);
  }

  @Scopes('trade-applications:manage')
  @Get()
  findAll(@Query('status') status?: TradeApplicationStatus) {
    return this.applicationsService.findAll(status);
  }

  @Scopes('trade-applications:manage')
  @Post(':id/approve')
  approve(@Param('id', ParseUUIDPipe) id: string) {
    return this.applicationsService.approve(id);
  }

  @Scopes('trade-applications:manage')
  @Post(':id/reject')
  reject(@Param('id', ParseUUIDPipe) id: string, @Body() dto: RejectTradeAccountApplicationDto) {
    return this.applicationsService.reject(id, dto.rejectionReason);
  }
}
