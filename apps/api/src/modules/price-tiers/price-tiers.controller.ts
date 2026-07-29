import { Body, Controller, Delete, Get, Param, ParseUUIDPipe, Post, Query, UseGuards } from '@nestjs/common';
import { PriceTiersService } from './price-tiers.service';
import { CreatePriceTierDto } from './dto/create-price-tier.dto';
import { QueryPriceTiersDto } from './dto/query-price-tiers.dto';
import { KeycloakAuthGuard } from '../../common/guards/keycloak-auth.guard';
import { Scopes } from '../../common/decorators/scopes.decorator';

@Controller({ path: 'price-tiers', version: '1' })
export class PriceTiersController {
  constructor(private readonly priceTiersService: PriceTiersService) {}

  // Public — a customer viewing a product should be able to see "buy
  // 10+, save 5%" before adding to cart, same reasoning as reviews and
  // Q&A both being publicly readable.
  @Get()
  findByProduct(@Query() query: QueryPriceTiersDto) {
    return this.priceTiersService.findByProduct(query.productId);
  }

  @UseGuards(KeycloakAuthGuard)
  @Scopes('products:write')
  @Post()
  create(@Body() dto: CreatePriceTierDto) {
    return this.priceTiersService.create(dto);
  }

  @UseGuards(KeycloakAuthGuard)
  @Scopes('products:write')
  @Delete(':id')
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.priceTiersService.remove(id);
  }
}
