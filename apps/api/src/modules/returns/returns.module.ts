import { Module } from '@nestjs/common';
import { ReturnsController } from './returns.controller';
import { ReturnsService } from './returns.service';
import { AccountsModule } from '../accounts/accounts.module';
import { PaymentsModule } from '../payments/payments.module';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [AccountsModule, PaymentsModule, NotificationsModule],
  controllers: [ReturnsController],
  providers: [ReturnsService],
})
export class ReturnsModule {}
