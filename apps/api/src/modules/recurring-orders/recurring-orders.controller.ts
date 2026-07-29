import { Body, Controller, Delete, Get, Param, ParseUUIDPipe, Patch, Post, UseGuards } from '@nestjs/common';
import { RecurringOrdersService } from './recurring-orders.service';
import { CreateRecurringOrderTemplateDto } from './dto/create-recurring-order-template.dto';
import { UpdateRecurringOrderTemplateDto } from './dto/update-recurring-order-template.dto';
import { KeycloakAuthGuard } from '../../common/guards/keycloak-auth.guard';
import { CurrentAccount, AuthenticatedAccount } from '../../common/decorators/current-account.decorator';

// Customer-only — no admin surface in this pass. An admin needing to see
// or intervene on a customer's recurring orders is a real, separate
// capability (mirrors the same "admin-wide view doesn't exist yet"
// situation already documented for accounts/customers generally), not
// attempted here.
@UseGuards(KeycloakAuthGuard)
@Controller({ path: 'recurring-orders', version: '1' })
export class RecurringOrdersController {
  constructor(private readonly recurringOrdersService: RecurringOrdersService) {}

  @Post()
  create(@CurrentAccount() current: AuthenticatedAccount, @Body() dto: CreateRecurringOrderTemplateDto) {
    return this.recurringOrdersService.create(current.keycloakSub, current.email, dto);
  }

  @Get()
  findMine(@CurrentAccount() current: AuthenticatedAccount) {
    return this.recurringOrdersService.findMine(current.keycloakSub, current.email);
  }

  @Get(':id')
  findOne(@CurrentAccount() current: AuthenticatedAccount, @Param('id', ParseUUIDPipe) id: string) {
    return this.recurringOrdersService.findOneForAccount(current.keycloakSub, current.email, id);
  }

  @Patch(':id')
  update(
    @CurrentAccount() current: AuthenticatedAccount,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateRecurringOrderTemplateDto,
  ) {
    return this.recurringOrdersService.update(current.keycloakSub, current.email, id, dto);
  }

  @Delete(':id')
  remove(@CurrentAccount() current: AuthenticatedAccount, @Param('id', ParseUUIDPipe) id: string) {
    return this.recurringOrdersService.remove(current.keycloakSub, current.email, id);
  }
}
