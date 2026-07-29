import { Body, Controller, Post } from '@nestjs/common';
import { EstimateService } from './estimate.service';
import { RequestEstimateDto } from './dto/request-estimate.dto';

// Public — a preliminary estimate is exactly the kind of thing that should
// have zero friction; nobody should need an account to find out roughly
// what a job might cost before deciding whether to book anything.
@Controller({ path: 'estimate', version: '1' })
export class EstimateController {
  constructor(private readonly estimateService: EstimateService) {}

  @Post()
  estimate(@Body() dto: RequestEstimateDto) {
    return this.estimateService.estimate(dto);
  }
}
