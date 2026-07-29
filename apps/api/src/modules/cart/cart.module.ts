import { Module } from '@nestjs/common';
import { CartController } from './cart.controller';
import { CartService } from './cart.service';
import { CartAbandonmentService } from './cart-abandonment.service';
import { AccountsModule } from '../accounts/accounts.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { CouponsModule } from '../coupons/coupons.module';

@Module({
  imports: [AccountsModule, NotificationsModule, CouponsModule],
  controllers: [CartController],
  providers: [CartService, CartAbandonmentService],
  exports: [CartService], // orders needs this for checkout
})
export class CartModule {}
