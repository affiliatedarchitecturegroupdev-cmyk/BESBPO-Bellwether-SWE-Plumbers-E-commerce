import { Module } from '@nestjs/common';
import { AccountsController } from './accounts.controller';
import { AccountsService } from './accounts.service';

@Module({
  controllers: [AccountsController],
  providers: [AccountsService],
  exports: [AccountsService], // cart, orders, bookings, warranty, trade-credit all depend on this
})
export class AccountsModule {}
