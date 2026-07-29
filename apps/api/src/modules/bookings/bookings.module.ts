import { Module } from '@nestjs/common';
import { BookingsController } from './bookings.controller';
import { BookingsService } from './bookings.service';
import { AccountsModule } from '../accounts/accounts.module';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [AccountsModule, NotificationsModule],
  controllers: [BookingsController],
  providers: [BookingsService],
  exports: [BookingsService], // warranty and compliance both need booking lookups
})
export class BookingsModule {}
