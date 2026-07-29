import { Module } from '@nestjs/common';
import { PricingController } from './pricing.controller';
import { PricingService } from './pricing.service';
import { PricingAdminService } from './pricing-admin.service';

@Module({
  controllers: [PricingController],
  providers: [PricingService, PricingAdminService],
  exports: [PricingService], // orders/cart modules will need this to price line items
})
export class PricingModule {}
