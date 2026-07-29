import { Module } from '@nestjs/common';
import { ShippingController } from './shipping.controller';
import { ShippingService } from './shipping.service';
import { ShipLogicService } from './shiplogic.service';
import { CartModule } from '../cart/cart.module';

@Module({
  imports: [CartModule],
  controllers: [ShippingController],
  providers: [ShippingService, ShipLogicService],
})
export class ShippingModule {}
