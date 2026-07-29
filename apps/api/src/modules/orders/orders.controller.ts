import { Body, Controller, Get, Param, ParseUUIDPipe, Patch, Post, Query, Res, UseGuards } from '@nestjs/common';
import { Response } from 'express';
import { OrdersService } from './orders.service';
import { CheckoutDto } from './dto/checkout.dto';
import { QueryOrdersDto } from './dto/query-orders.dto';
import { UpdateOrderStatusDto } from './dto/update-order-status.dto';
import { ShippingAddressDto } from './dto/shipping-address.dto';
import { TrackOrderDto } from './dto/track-order.dto';
import { KeycloakAuthGuard } from '../../common/guards/keycloak-auth.guard';
import { Scopes, AnyScope } from '../../common/decorators/scopes.decorator';
import { CurrentAccount, AuthenticatedAccount } from '../../common/decorators/current-account.decorator';

// No class-level @UseGuards here, per-method instead — every endpoint in
// this controller currently requires auth, so this isn't strictly
// necessary today, but it matches PaymentsController's own established
// pattern (see that controller for why: a genuinely public endpoint
// living alongside guarded ones, where NestJS has no clean way to opt a
// single method OUT of a class-level guard). Guest checkout itself lives
// on PaymentsController, not here — see
// PaymentsService.guestCheckoutWithPayment's own comment for why a
// standalone order-creation-only guest endpoint here would have been a
// real correctness trap (an order with no way to ever pay for it).
@Controller({ path: 'orders', version: '1' })
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @UseGuards(KeycloakAuthGuard)
  @Post('checkout')
  checkout(@CurrentAccount() current: AuthenticatedAccount, @Body() dto: CheckoutDto) {
    return this.ordersService.checkout(current.keycloakSub, current.email, dto);
  }

  // Public, deliberately no auth — the whole point is letting a guest
  // checkout customer (no account at all) look up their own order
  // later. POST, not GET, so the email doesn't end up in a URL, browser
  // history, or server access log.
  @Post('track')
  track(@Body() dto: TrackOrderDto) {
    return this.ordersService.findByOrderNumberAndEmail(dto.orderNumber, dto.email);
  }

  @UseGuards(KeycloakAuthGuard)
  @Get()
  findMine(@CurrentAccount() current: AuthenticatedAccount, @Query() query: QueryOrdersDto) {
    return this.ordersService.findMine(current.keycloakSub, current.email, query);
  }

  // Declared before ':id' — Express/Nest route matching tries routes in
  // declaration order, and 'admin' would otherwise be swallowed as a
  // (invalid, since it's not a UUID) :id value if this came after it.
  @UseGuards(KeycloakAuthGuard)
  @AnyScope('orders:read', 'orders:manage')
  @Get('admin')
  findAllAdmin(@Query() query: QueryOrdersDto) {
    return this.ordersService.findAllAdmin(query);
  }

  @UseGuards(KeycloakAuthGuard)
  @AnyScope('orders:read', 'orders:manage')
  @Get('admin/:id')
  findOneAdmin(@Param('id', ParseUUIDPipe) id: string) {
    return this.ordersService.findOneAdmin(id);
  }

  @UseGuards(KeycloakAuthGuard)
  @Get(':id')
  findOne(@CurrentAccount() current: AuthenticatedAccount, @Param('id', ParseUUIDPipe) id: string) {
    return this.ordersService.findOneForAccount(current.keycloakSub, current.email, id);
  }

  // Binary PDF response — @Res() bypasses TransformResponseInterceptor,
  // same reasoning as AccountsController.eraseData's own comment (the
  // interceptor wraps every return value in a JSON {data, meta} body,
  // which would corrupt a PDF byte stream the same way it would violate
  // a 204's own no-body requirement).
  @UseGuards(KeycloakAuthGuard)
  @Get(':id/invoice')
  async getInvoice(
    @CurrentAccount() current: AuthenticatedAccount,
    @Param('id', ParseUUIDPipe) id: string,
    @Res() res: Response,
  ): Promise<void> {
    const { buffer, orderNumber } = await this.ordersService.getInvoicePdf(current.keycloakSub, current.email, id);
    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="invoice-${orderNumber}.pdf"`,
    });
    res.send(buffer);
  }

  @UseGuards(KeycloakAuthGuard)
  @AnyScope('orders:read', 'orders:manage')
  @Get('admin/:id/invoice')
  async getInvoiceAdmin(@Param('id', ParseUUIDPipe) id: string, @Res() res: Response): Promise<void> {
    const { buffer, orderNumber } = await this.ordersService.getInvoicePdfAdmin(id);
    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="invoice-${orderNumber}.pdf"`,
    });
    res.send(buffer);
  }

  // Customer self-service, address only — see OrdersService.amendAddress
  // for why this stops short of full line-item amendment.
  @UseGuards(KeycloakAuthGuard)
  @Patch(':id/address')
  amendAddress(
    @CurrentAccount() current: AuthenticatedAccount,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() shippingAddress: ShippingAddressDto,
  ) {
    return this.ordersService.amendAddress(current.keycloakSub, current.email, id, shippingAddress);
  }

  // Admin/webhook path — distinct scope from everything else in this
  // controller, since every other endpoint here only ever touches the
  // caller's own orders.
  @UseGuards(KeycloakAuthGuard)
  @Scopes('orders:manage')
  @Patch(':id/status')
  updateStatus(
    @CurrentAccount() current: AuthenticatedAccount,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateOrderStatusDto,
  ) {
    return this.ordersService.updateStatus(id, dto, current.email);
  }
}
