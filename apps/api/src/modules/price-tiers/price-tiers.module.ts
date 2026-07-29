import { Module } from '@nestjs/common';
import { PriceTiersController } from './price-tiers.controller';
import { PriceTiersService } from './price-tiers.service';

@Module({
  controllers: [PriceTiersController],
  providers: [PriceTiersService],
  exports: [PriceTiersService], // CartModule needs this to price bulk-quantity lines
})
export class PriceTiersModule {}
