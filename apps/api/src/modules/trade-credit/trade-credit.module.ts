import { Module } from '@nestjs/common';
import { TradeCreditController } from './trade-credit.controller';
import { TradeCreditService } from './trade-credit.service';
import { AccountsModule } from '../accounts/accounts.module';
import { AuditLogModule } from '../audit-log/audit-log.module';

@Module({
  imports: [AccountsModule, AuditLogModule],
  controllers: [TradeCreditController],
  providers: [TradeCreditService],
})
export class TradeCreditModule {}
