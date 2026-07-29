import { Body, Controller, Get, Param, ParseUUIDPipe, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { QuotesService } from './quotes.service';
import { CreateQuoteDto } from './dto/create-quote.dto';
import { PriceQuoteDto } from './dto/price-quote.dto';
import { RespondToQuoteDto } from './dto/respond-to-quote.dto';
import { QueryQuotesDto } from './dto/query-quotes.dto';
import { ConvertQuoteToOrderDto } from './dto/convert-quote-to-order.dto';
import { KeycloakAuthGuard } from '../../common/guards/keycloak-auth.guard';
import { Scopes } from '../../common/decorators/scopes.decorator';
import { CurrentAccount, AuthenticatedAccount } from '../../common/decorators/current-account.decorator';

@UseGuards(KeycloakAuthGuard)
@Controller({ path: 'quotes', version: '1' })
export class QuotesController {
  constructor(private readonly quotesService: QuotesService) {}

  @Post()
  create(@CurrentAccount() current: AuthenticatedAccount, @Body() dto: CreateQuoteDto) {
    return this.quotesService.create(current.keycloakSub, current.email, dto);
  }

  @Get()
  findMine(@CurrentAccount() current: AuthenticatedAccount, @Query() query: QueryQuotesDto) {
    return this.quotesService.findMine(current.keycloakSub, current.email, query);
  }

  // Declared before ':id' — literal segments must come first, or Express
  // would try to match 'admin' as an (invalid) :id value. Same reasoning
  // documented on OrdersController/BookingsController.
  @Scopes('quotes:manage')
  @Get('admin')
  findAllAdmin(@Query() query: QueryQuotesDto) {
    return this.quotesService.findAllAdmin(query);
  }

  @Scopes('quotes:manage')
  @Get('admin/:id')
  findOneAdmin(@Param('id', ParseUUIDPipe) id: string) {
    return this.quotesService.findOneAdmin(id);
  }

  @Get(':id')
  findOne(@CurrentAccount() current: AuthenticatedAccount, @Param('id', ParseUUIDPipe) id: string) {
    return this.quotesService.findOneForAccount(current.keycloakSub, current.email, id);
  }

  @Scopes('quotes:manage')
  @Patch(':id/price')
  priceQuote(
    @CurrentAccount() current: AuthenticatedAccount,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: PriceQuoteDto,
  ) {
    return this.quotesService.priceQuote(id, dto, current.email);
  }

  @Patch(':id/respond')
  respond(
    @CurrentAccount() current: AuthenticatedAccount,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: RespondToQuoteDto,
  ) {
    return this.quotesService.respondToQuote(current.keycloakSub, current.email, id, dto);
  }

  // Admin-only fulfillment step — see QuotesService.convertToOrder for
  // why this can't be self-service (it bypasses the normal
  // cart/checkout flow entirely, at negotiated pricing).
  @Scopes('quotes:manage')
  @Post(':id/convert-to-order')
  convertToOrder(
    @CurrentAccount() current: AuthenticatedAccount,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ConvertQuoteToOrderDto,
  ) {
    return this.quotesService.convertToOrder(id, dto, current.email);
  }
}
