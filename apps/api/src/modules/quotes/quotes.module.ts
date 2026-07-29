import { Module } from '@nestjs/common';
import { QuotesController } from './quotes.controller';
import { QuotesService } from './quotes.service';
import { AccountsModule } from '../accounts/accounts.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { AuditLogModule } from '../audit-log/audit-log.module';

@Module({
  imports: [AccountsModule, NotificationsModule, AuditLogModule],
  controllers: [QuotesController],
  providers: [QuotesService],
})
export class QuotesModule {}
