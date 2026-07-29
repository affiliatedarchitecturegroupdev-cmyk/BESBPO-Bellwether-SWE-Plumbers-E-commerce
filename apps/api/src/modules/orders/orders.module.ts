import { Module } from '@nestjs/common';
import { OrdersController } from './orders.controller';
import { OrdersService } from './orders.service';
import { InvoiceService } from './invoice.service';
import { AccountsModule } from '../accounts/accounts.module';
import { CartModule } from '../cart/cart.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { AuditLogModule } from '../audit-log/audit-log.module';
import { CouponsModule } from '../coupons/coupons.module';

@Module({
  imports: [AccountsModule, CartModule, NotificationsModule, AuditLogModule, CouponsModule],
  controllers: [OrdersController],
  providers: [OrdersService, InvoiceService],
  exports: [OrdersService], // bookings will link a booking to its order
})
export class OrdersModule {}
