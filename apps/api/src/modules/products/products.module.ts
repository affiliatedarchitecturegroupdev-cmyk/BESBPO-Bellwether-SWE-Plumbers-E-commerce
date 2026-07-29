import { Module } from '@nestjs/common';
import { ProductsController } from './products.controller';
import { ProductsService } from './products.service';
import { ProductsBulkService } from './products-bulk.service';
import { BackInStockModule } from '../back-in-stock/back-in-stock.module';

@Module({
  imports: [BackInStockModule],
  controllers: [ProductsController],
  providers: [ProductsService, ProductsBulkService],
  exports: [ProductsService], // pricing and bundles modules will need this
})
export class ProductsModule {}
