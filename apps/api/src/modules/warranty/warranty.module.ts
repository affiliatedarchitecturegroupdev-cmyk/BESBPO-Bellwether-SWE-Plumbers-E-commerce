import { Module } from '@nestjs/common';
import { WarrantyController } from './warranty.controller';
import { WarrantyService } from './warranty.service';
import { AccountsModule } from '../accounts/accounts.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { AuditLogModule } from '../audit-log/audit-log.module';

@Module({
  imports: [AccountsModule, NotificationsModule, AuditLogModule],
  controllers: [WarrantyController],
  providers: [WarrantyService],
})
export class WarrantyModule {}
