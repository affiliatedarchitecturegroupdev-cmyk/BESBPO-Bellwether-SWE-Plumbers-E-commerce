import { Module } from '@nestjs/common';
import { ComplianceController } from './compliance.controller';
import { ComplianceService } from './compliance.service';
import { AccountsModule } from '../accounts/accounts.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { AuditLogModule } from '../audit-log/audit-log.module';

@Module({
  imports: [AccountsModule, NotificationsModule, AuditLogModule],
  controllers: [ComplianceController],
  providers: [ComplianceService],
})
export class ComplianceModule {}
