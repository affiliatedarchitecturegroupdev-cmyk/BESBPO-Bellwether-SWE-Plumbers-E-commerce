import { Module } from '@nestjs/common';
import { TradeAccountApplicationsController } from './trade-account-applications.controller';
import { TradeAccountApplicationsService } from './trade-account-applications.service';
import { AccountsModule } from '../accounts/accounts.module';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [AccountsModule, NotificationsModule],
  controllers: [TradeAccountApplicationsController],
  providers: [TradeAccountApplicationsService],
})
export class TradeAccountApplicationsModule {}
