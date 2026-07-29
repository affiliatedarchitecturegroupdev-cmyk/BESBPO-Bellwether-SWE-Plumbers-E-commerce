import { Body, Controller, HttpCode, Logger, Param, ParseUUIDPipe, Post, Req, UseGuards } from '@nestjs/common';
import { Request } from 'express';
import { PaymentsService } from './payments.service';
import { InitiatePaymentDto } from './dto/initiate-payment.dto';
import { GuestCheckoutDto } from '../orders/dto/guest-checkout.dto';
import { CancelOrderDto } from './dto/cancel-order.dto';
import { PayfastItnPayload } from './interfaces/payfast-itn.interface';
import { KeycloakAuthGuard } from '../../common/guards/keycloak-auth.guard';
import { CurrentAccount, AuthenticatedAccount } from '../../common/decorators/current-account.decorator';

@Controller({ path: 'payments', version: '1' })
export class PaymentsController {
  private readonly logger = new Logger(PaymentsController.name);

  constructor(private readonly paymentsService: PaymentsService) {}

  // Protected — a customer starting checkout on their own order.
  @UseGuards(KeycloakAuthGuard)
  @Post('payfast/checkout')
  initiateCheckout(@CurrentAccount() current: AuthenticatedAccount, @Body() dto: InitiatePaymentDto) {
    return this.paymentsService.initiateCheckout(current.keycloakSub, current.email, dto.orderId);
  }

  // Genuinely public, same reasoning as OrdersController.guestCheckout —
  // completes a purchase without ever requiring a real Keycloak login.
  // Lives here rather than on OrdersController because it needs BOTH
  // order creation AND PayFast initiation in one call — see
  // PaymentsService.guestCheckoutWithPayment's own comment for the
  // circular-module-dependency reason this orchestration has to sit on
  // this side, the same reason cancelOrder below already does.
  @Post('payfast/guest-checkout')
  guestCheckout(@Body() dto: GuestCheckoutDto) {
    return this.paymentsService.guestCheckoutWithPayment(dto);
  }

  // Lives here rather than on OrdersController — see the comment on
  // PaymentsService.cancelOrder for why (avoiding a circular module
  // dependency between Orders and Payments). The URL still reads
  // naturally from the frontend's perspective even though it's grouped
  // under /payments rather than /orders.
  @UseGuards(KeycloakAuthGuard)
  @Post('orders/:id/cancel')
  cancelOrder(
    @CurrentAccount() current: AuthenticatedAccount,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CancelOrderDto,
  ) {
    return this.paymentsService.cancelOrder(current.keycloakSub, current.email, id, dto.reason);
  }

  // Deliberately NOT behind KeycloakAuthGuard — PayFast calls this
  // server-to-server with no Besbpo ID token, only its own signature and
  // source IP as proof of authenticity, both verified inside
  // PaymentsService.handleItn. This is the one controller in the codebase
  // where "public endpoint" is correct, not an oversight — see
  // docs/AGENTS.md if adding another webhook-style endpoint elsewhere.
  //
  // Always returns 200: PayFast retries a notify_url that doesn't respond
  // 200, and a genuine security failure (bad signature, bad IP) is
  // something we want logged once and investigated, not repeatedly
  // retried by PayFast believing it's a transient failure. handleItn
  // throws internally on any validation failure; this catch logs the
  // reason at warn level and still returns 200, rather than either
  // silently swallowing it or propagating a non-200 that triggers retries.
  @HttpCode(200)
  @Post('payfast/notify')
  async handleNotify(@Body() body: PayfastItnPayload, @Req() req: Request): Promise<void> {
    try {
      await this.paymentsService.handleItn(body, req.ip ?? '');
    } catch (err) {
      this.logger.warn(
        `Rejected PayFast ITN for m_payment_id=${body.m_payment_id ?? 'unknown'}: ${err instanceof Error ? err.message : err}`,
      );
    }
  }
}
