import { Body, Controller, Get, Param, ParseUUIDPipe, Patch, Post, UseGuards } from '@nestjs/common';
import { WarehousesService } from './warehouses.service';
import { CreateWarehouseDto } from './dto/create-warehouse.dto';
import { SetWarehouseStockDto } from './dto/set-warehouse-stock.dto';
import { KeycloakAuthGuard } from '../../common/guards/keycloak-auth.guard';
import { Scopes } from '../../common/decorators/scopes.decorator';

// Entirely admin-only — there's no customer-facing concept of a
// warehouse; the storefront only ever sees Product.stockQty, the
// aggregate this module keeps in sync (see WarehousesService).
@UseGuards(KeycloakAuthGuard)
@Scopes('products:write')
@Controller({ path: 'warehouses', version: '1' })
export class WarehousesController {
  constructor(private readonly warehousesService: WarehousesService) {}

  @Get()
  findAll() {
    return this.warehousesService.findAll();
  }

  @Post()
  create(@Body() dto: CreateWarehouseDto) {
    return this.warehousesService.create(dto);
  }

  @Get('stock/:productId')
  getStockForProduct(@Param('productId', ParseUUIDPipe) productId: string) {
    return this.warehousesService.getStockForProduct(productId);
  }

  @Patch(':warehouseId/stock/:productId')
  setStock(
    @Param('warehouseId', ParseUUIDPipe) warehouseId: string,
    @Param('productId', ParseUUIDPipe) productId: string,
    @Body() dto: SetWarehouseStockDto,
  ) {
    return this.warehousesService.setStock(warehouseId, productId, dto.quantity);
  }
}
