import { Module } from '@nestjs/common';
import { AddressesController } from './addresses.controller';
import { AddressesService } from './addresses.service';
import { AccountsModule } from '../accounts/accounts.module';

@Module({
  imports: [AccountsModule],
  controllers: [AddressesController],
  providers: [AddressesService],
  exports: [AddressesService], // checkout's saved-address picker will need this
})
export class AddressesModule {}
