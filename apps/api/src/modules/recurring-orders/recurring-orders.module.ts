import { Module } from '@nestjs/common';
import { RecurringOrdersController } from './recurring-orders.controller';
import { RecurringOrdersService } from './recurring-orders.service';
import { AccountsModule } from '../accounts/accounts.module';
import { CartModule } from '../cart/cart.module';
import { OrdersModule } from '../orders/orders.module';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [AccountsModule, CartModule, OrdersModule, NotificationsModule],
  controllers: [RecurringOrdersController],
  providers: [RecurringOrdersService],
})
export class RecurringOrdersModule {}
