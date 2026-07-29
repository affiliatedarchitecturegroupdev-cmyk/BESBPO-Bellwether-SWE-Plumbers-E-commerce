import { Body, Controller, Get, Param, ParseUUIDPipe, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { BookingsService } from './bookings.service';
import { CreateBookingDto } from './dto/create-booking.dto';
import { UpdateBookingStatusDto } from './dto/update-booking-status.dto';
import { QueryBookingsDto } from './dto/query-bookings.dto';
import { KeycloakAuthGuard } from '../../common/guards/keycloak-auth.guard';
import { Scopes, AnyScope } from '../../common/decorators/scopes.decorator';
import { CurrentAccount, AuthenticatedAccount } from '../../common/decorators/current-account.decorator';

@UseGuards(KeycloakAuthGuard)
@Controller({ path: 'bookings', version: '1' })
export class BookingsController {
  constructor(private readonly bookingsService: BookingsService) {}

  @Post()
  create(@CurrentAccount() current: AuthenticatedAccount, @Body() dto: CreateBookingDto) {
    return this.bookingsService.create(current.keycloakSub, current.email, dto);
  }

  @Get()
  findMine(@CurrentAccount() current: AuthenticatedAccount, @Query() query: QueryBookingsDto) {
    return this.bookingsService.findMine(current.keycloakSub, current.email, query);
  }

  // Declared before ':id' — see OrdersController's identical comment on
  // why route order matters here.
  @AnyScope('bookings:read', 'bookings:manage')
  @Get('admin')
  findAllAdmin(@Query() query: QueryBookingsDto) {
    return this.bookingsService.findAllAdmin(query);
  }

  @Get(':id')
  findOne(@CurrentAccount() current: AuthenticatedAccount, @Param('id', ParseUUIDPipe) id: string) {
    return this.bookingsService.findOneForAccount(current.keycloakSub, current.email, id);
  }

  // Field-team/admin path — not account-scoped, same reasoning as
  // OrdersController's updateStatus endpoint.
  @Scopes('bookings:manage')
  @Patch(':id/status')
  updateStatus(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateBookingStatusDto) {
    return this.bookingsService.updateStatus(id, dto);
  }
}
