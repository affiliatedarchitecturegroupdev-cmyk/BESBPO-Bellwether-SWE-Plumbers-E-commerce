import { Module } from '@nestjs/common';
import { BackInStockController } from './back-in-stock.controller';
import { BackInStockService } from './back-in-stock.service';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [NotificationsModule],
  controllers: [BackInStockController],
  providers: [BackInStockService],
  exports: [BackInStockService],
})
export class BackInStockModule {}
