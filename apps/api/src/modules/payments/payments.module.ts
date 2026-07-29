import { Module } from '@nestjs/common';
import { PaymentsController } from './payments.controller';
import { PaymentsService } from './payments.service';
import { OrdersModule } from '../orders/orders.module';
import { AccountsModule } from '../accounts/accounts.module';
import { CartModule } from '../cart/cart.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { AuditLogModule } from '../audit-log/audit-log.module';

@Module({
  imports: [OrdersModule, AccountsModule, CartModule, NotificationsModule, AuditLogModule],
  controllers: [PaymentsController],
  providers: [PaymentsService],
  exports: [PaymentsService], // ReturnsModule needs this to actually process a refund when a return resolves
})
export class PaymentsModule {}
