import { Module } from '@nestjs/common';
import { EstimateController } from './estimate.controller';
import { EstimateService } from './estimate.service';

@Module({
  controllers: [EstimateController],
  providers: [EstimateService],
})
export class EstimateModule {}
