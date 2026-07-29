import { Body, Controller, Post } from '@nestjs/common';
import { BackInStockService } from './back-in-stock.service';
import { CreateBackInStockRequestDto } from './dto/create-back-in-stock-request.dto';

// Public, no auth — same reasoning as newsletter signup: this captures
// interest from any visitor, not just registered customers, and
// shouldn't require creating an account just to ask to be told about a
// restock.
@Controller({ path: 'back-in-stock', version: '1' })
export class BackInStockController {
  constructor(private readonly backInStockService: BackInStockService) {}

  @Post()
  create(@Body() dto: CreateBackInStockRequestDto) {
    return this.backInStockService.requestNotification(dto.productId, dto.email);
  }
}
