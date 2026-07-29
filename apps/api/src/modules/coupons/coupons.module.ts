import { Module } from '@nestjs/common';
import { CouponsController } from './coupons.controller';
import { CouponsService } from './coupons.service';

@Module({
  controllers: [CouponsController],
  providers: [CouponsService],
  exports: [CouponsService], // needed by CartModule and OrdersModule
})
export class CouponsModule {}
