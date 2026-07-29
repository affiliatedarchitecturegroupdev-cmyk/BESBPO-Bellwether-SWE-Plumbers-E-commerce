import { Module } from '@nestjs/common';
import { WishlistController } from './wishlist.controller';
import { WishlistService } from './wishlist.service';
import { AccountsModule } from '../accounts/accounts.module';

@Module({
  imports: [AccountsModule],
  controllers: [WishlistController],
  providers: [WishlistService],
})
export class WishlistModule {}
