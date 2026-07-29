import { Body, Controller, Delete, Get, Param, ParseUUIDPipe, Patch, Post, UseGuards } from '@nestjs/common';
import { PricingService } from './pricing.service';
import { PricingAdminService } from './pricing-admin.service';
import { QuoteRequestDto } from './dto/quote-request.dto';
import { CreatePriceBookEntryDto } from './dto/create-price-book-entry.dto';
import { CreateComplexityMultiplierDto } from './dto/create-complexity-multiplier.dto';
import { UpdateComplexityMultiplierDto } from './dto/update-complexity-multiplier.dto';
import { KeycloakAuthGuard } from '../../common/guards/keycloak-auth.guard';
import { Scopes } from '../../common/decorators/scopes.decorator';

@Controller({ path: 'pricing', version: '1' })
export class PricingController {
  constructor(
    private readonly pricingService: PricingService,
    private readonly pricingAdminService: PricingAdminService,
  ) {}

  // Public — this backs both the storefront's live quote estimator and the
  // Python AI service's quote assistant (which calls this rather than
  // reimplementing pricing logic itself).
  @Post('quote')
  quote(@Body() dto: QuoteRequestDto) {
    return this.pricingService.quote(dto);
  }

  // Admin-only from here down — see PricingAdminService's own comments
  // on why price book entries are append-only (create/remove, no
  // update) while complexity multipliers are a single mutable row per
  // code (full CRUD).
  @UseGuards(KeycloakAuthGuard)
  @Scopes('products:write')
  @Get('price-book-entries')
  findAllPriceBookEntries() {
    return this.pricingAdminService.findAllPriceBookEntries();
  }

  @UseGuards(KeycloakAuthGuard)
  @Scopes('products:write')
  @Post('price-book-entries')
  createPriceBookEntry(@Body() dto: CreatePriceBookEntryDto) {
    return this.pricingAdminService.createPriceBookEntry(dto);
  }

  @UseGuards(KeycloakAuthGuard)
  @Scopes('products:write')
  @Delete('price-book-entries/:id')
  removePriceBookEntry(@Param('id', ParseUUIDPipe) id: string) {
    return this.pricingAdminService.removePriceBookEntry(id);
  }

  @UseGuards(KeycloakAuthGuard)
  @Scopes('products:write')
  @Get('complexity-multipliers')
  findAllComplexityMultipliers() {
    return this.pricingAdminService.findAllComplexityMultipliers();
  }

  @UseGuards(KeycloakAuthGuard)
  @Scopes('products:write')
  @Post('complexity-multipliers')
  createComplexityMultiplier(@Body() dto: CreateComplexityMultiplierDto) {
    return this.pricingAdminService.createComplexityMultiplier(dto);
  }

  @UseGuards(KeycloakAuthGuard)
  @Scopes('products:write')
  @Patch('complexity-multipliers/:id')
  updateComplexityMultiplier(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateComplexityMultiplierDto) {
    return this.pricingAdminService.updateComplexityMultiplier(id, dto);
  }

  @UseGuards(KeycloakAuthGuard)
  @Scopes('products:write')
  @Delete('complexity-multipliers/:id')
  removeComplexityMultiplier(@Param('id', ParseUUIDPipe) id: string) {
    return this.pricingAdminService.removeComplexityMultiplier(id);
  }
}
