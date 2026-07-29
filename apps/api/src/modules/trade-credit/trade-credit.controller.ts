import { Body, Controller, Get, Param, ParseUUIDPipe, Post, Query, UseGuards } from '@nestjs/common';
import { TradeCreditService } from './trade-credit.service';
import { CreateTradeCreditAccountDto } from './dto/create-trade-credit-account.dto';
import { RecordDrawdownDto, RecordRepaymentDto } from './dto/credit-transaction.dto';
import { QueryTradeCreditAccountsDto } from './dto/query-trade-credit-accounts.dto';
import { KeycloakAuthGuard } from '../../common/guards/keycloak-auth.guard';
import { Scopes } from '../../common/decorators/scopes.decorator';
import { CurrentAccount, AuthenticatedAccount } from '../../common/decorators/current-account.decorator';

@UseGuards(KeycloakAuthGuard)
@Controller({ path: 'trade-credit', version: '1' })
export class TradeCreditController {
  constructor(private readonly tradeCreditService: TradeCreditService) {}

  // Everything below except 'me' is admin/finance-team territory — see
  // TradeCreditService.create for why account setup isn't self-service.
  @Scopes('trade-credit:manage')
  @Post()
  create(@CurrentAccount() current: AuthenticatedAccount, @Body() dto: CreateTradeCreditAccountDto) {
    return this.tradeCreditService.create(dto, current.email);
  }

  @Get('me')
  findMine(@CurrentAccount() current: AuthenticatedAccount) {
    return this.tradeCreditService.findMine(current.keycloakSub, current.email);
  }

  @Scopes('trade-credit:manage')
  @Get()
  findAll(@Query() query: QueryTradeCreditAccountsDto) {
    return this.tradeCreditService.findAll(query);
  }

  @Scopes('trade-credit:manage')
  @Post(':id/drawdown')
  recordDrawdown(
    @CurrentAccount() current: AuthenticatedAccount,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: RecordDrawdownDto,
  ) {
    return this.tradeCreditService.recordDrawdown(id, dto, current.email);
  }

  @Scopes('trade-credit:manage')
  @Post(':id/repayment')
  recordRepayment(
    @CurrentAccount() current: AuthenticatedAccount,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: RecordRepaymentDto,
  ) {
    return this.tradeCreditService.recordRepayment(id, dto, current.email);
  }
}
