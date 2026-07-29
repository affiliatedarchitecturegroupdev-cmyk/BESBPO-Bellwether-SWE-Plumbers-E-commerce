import {
  Body,
  Controller,
  Delete,
  DefaultValuePipe,
  Get,
  Param,
  ParseIntPipe,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  Res,
  UseGuards,
} from '@nestjs/common';
import { Response } from 'express';
import { ProductsService } from './products.service';
import { ProductsBulkService } from './products-bulk.service';
import { BulkImportProductsDto } from './dto/bulk-import-products.dto';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { QueryProductsDto } from './dto/query-products.dto';
import { RestockProductDto } from './dto/restock-product.dto';
import { CreateVariantGroupDto } from './dto/create-variant-group.dto';
import { KeycloakAuthGuard } from '../../common/guards/keycloak-auth.guard';
import { Scopes } from '../../common/decorators/scopes.decorator';

@Controller({ path: 'products', version: '1' })
export class ProductsController {
  constructor(
    private readonly productsService: ProductsService,
    private readonly productsBulkService: ProductsBulkService,
  ) {}

  // Public — showroom/trade catalog browsing needs no auth.
  @Get()
  findAll(@Query() query: QueryProductsDto) {
    return this.productsService.findAll(query);
  }

  // Declared before ':slug' — 'variant-groups' is a literal segment at
  // the same position as :slug, and Express/Nest match routes in
  // declaration order (same reasoning documented on every other
  // admin/:id-vs-:id controller in this codebase).
  @UseGuards(KeycloakAuthGuard)
  @Scopes('products:write')
  @Get('variant-groups')
  findAllVariantGroups() {
    return this.productsService.findAllVariantGroups();
  }

  // Public — feeds the storefront's brand filter dropdown, same
  // no-auth reasoning as findAll above. Also a literal segment needing
  // to be declared before ':slug'.
  @Get('brands')
  findDistinctBrands() {
    return this.productsService.findDistinctBrands();
  }

  // Public — feeds the homepage's "Popular Products" section with real
  // order-history popularity instead of arbitrary listing order. A
  // small, fixed limit (validated below), not a paginated listing — this
  // is "give me the top N," never "give me everything."
  @Get('popular')
  findPopular(@Query('limit', new DefaultValuePipe(8), ParseIntPipe) limit: number) {
    return this.productsService.findPopular(Math.min(limit, 20));
  }

  // Public — feeds the homepage's "Top Rated" section. minReviews
  // defaults to 3 (see the service method's own comment for why a
  // minimum matters here, not just a nice-to-have) but is left callable
  // so an admin-facing view could reasonably ask for a stricter or
  // looser threshold later without a new endpoint.
  @Get('top-rated')
  findTopRated(
    @Query('limit', new DefaultValuePipe(8), ParseIntPipe) limit: number,
    @Query('minReviews', new DefaultValuePipe(3), ParseIntPipe) minReviews: number,
  ) {
    return this.productsService.findTopRated(Math.min(limit, 20), minReviews);
  }

  // Public — feeds the homepage's "Clearance" section (customer-facing
  // sale listing) AND the dedicated /clearance page — real pagination,
  // same @Max(100) cap as every other listing endpoint (the DTO-level
  // cap this codebase already learned the hard way to check for on
  // every new listing endpoint).
  @Get('on-sale')
  findOnSale(
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('pageSize', new DefaultValuePipe(8), ParseIntPipe) pageSize: number,
  ) {
    return this.productsService.findOnSale(page, Math.min(pageSize, 100));
  }

  // Admin-only — feeds the Clearance review screen, not the storefront.
  // Declared as a literal segment before ':slug', same reasoning as
  // every other literal route in this controller.
  @UseGuards(KeycloakAuthGuard)
  @Scopes('products:write')
  @Get('clearance-candidates')
  findClearanceCandidates(
    @Query('minStock', new DefaultValuePipe(20), ParseIntPipe) minStock: number,
    @Query('windowDays', new DefaultValuePipe(60), ParseIntPipe) windowDays: number,
  ) {
    return this.productsService.findClearanceCandidates(minStock, windowDays);
  }

  // Admin-only — feeds the low-stock alerts screen. Same admin-gating
  // reasoning as clearance-candidates above: this is real detection work
  // (real velocity relative to real stock), not a public listing.
  @UseGuards(KeycloakAuthGuard)
  @Scopes('products:write')
  @Get('low-stock')
  findLowStock(
    @Query('windowDays', new DefaultValuePipe(30), ParseIntPipe) windowDays: number,
    @Query('daysOfStockThreshold', new DefaultValuePipe(14), ParseIntPipe) daysOfStockThreshold: number,
  ) {
    return this.productsService.findLowStock(windowDays, daysOfStockThreshold);
  }

  // Public — feeds the homepage's "Trending This Week" section AND the
  // dedicated /trending page. See ProductsService.findTrending's own
  // comment for why this is a genuinely different signal from Best
  // Sellers, not a near-duplicate.
  @Get('trending')
  findTrending(
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('pageSize', new DefaultValuePipe(8), ParseIntPipe) pageSize: number,
  ) {
    return this.productsService.findTrending(page, Math.min(pageSize, 100));
  }

  // Public — feeds sitemap.ts. Deliberately its own dedicated,
  // unpaginated endpoint rather than raising findAll's own pageSize cap
  // (@Max(100)) for everyone: this returns only slugs, no pricing/stock/
  // description, so the payload stays small regardless of catalog size,
  // and there's no reason a legitimate caller would ever need more than
  // "every slug" from this specific endpoint — unlike findAll, which
  // deliberately stays capped since a client asking for arbitrarily many
  // full product records at once is a real abuse vector this one isn't.
  @Get('all-slugs')
  findAllSlugs() {
    return this.productsService.findAllSlugs();
  }

  // Both declared before ':slug' for the same route-ordering reason as
  // 'variant-groups'/'brands' above. Export's column order deliberately
  // matches bulk-import's own expected columns exactly, so an
  // unmodified export is itself a valid re-import — the "export, edit
  // offline, re-import" workflow this pair exists for.
  @UseGuards(KeycloakAuthGuard)
  @Scopes('products:write')
  @Get('export')
  async exportCsv(@Res() res: Response): Promise<void> {
    const csv = await this.productsBulkService.exportToCsv();
    res.set({
      'Content-Type': 'text/csv',
      'Content-Disposition': `attachment; filename="products-export-${new Date().toISOString().slice(0, 10)}.csv"`,
    });
    res.send(csv);
  }

  @UseGuards(KeycloakAuthGuard)
  @Scopes('products:write')
  @Post('bulk-import')
  bulkImport(@Body() dto: BulkImportProductsDto) {
    return this.productsBulkService.importFromCsv(dto.csvContent);
  }

  @UseGuards(KeycloakAuthGuard)
  @Scopes('products:write')
  @Post('variant-groups')
  createVariantGroup(@Body() dto: CreateVariantGroupDto) {
    return this.productsService.createVariantGroup(dto);
  }

  @Get(':slug')
  findOne(@Param('slug') slug: string) {
    return this.productsService.findOneBySlug(slug);
  }

  // Public — the PDP's size selector needs no auth, same as the product
  // page itself. Keyed by slug like findOne above, not id — the PDP
  // already has the slug from the URL before it's fetched anything else.
  @Get(':slug/variants')
  getVariantSiblings(@Param('slug') slug: string) {
    return this.productsService.getVariantSiblings(slug);
  }

  // Public — PDP "frequently bought with" needs no auth. Takes the
  // product's id (not slug) since that's what the PDP already has once
  // it's fetched the product itself via findOne above.
  @Get(':id/recommendations')
  getRecommendations(@Param('id', ParseUUIDPipe) id: string) {
    return this.productsService.getRecommendations(id);
  }

  // Admin-only from here down — the custom admin panel calls these with a
  // token carrying the 'products:write' scope key.
  @UseGuards(KeycloakAuthGuard)
  @Scopes('products:write')
  @Post()
  create(@Body() dto: CreateProductDto) {
    return this.productsService.create(dto);
  }

  @UseGuards(KeycloakAuthGuard)
  @Scopes('products:write')
  @Patch(':id')
  update(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateProductDto) {
    return this.productsService.update(id, dto);
  }

  @UseGuards(KeycloakAuthGuard)
  @Scopes('products:write')
  @Post(':id/restock')
  restock(@Param('id', ParseUUIDPipe) id: string, @Body() dto: RestockProductDto) {
    return this.productsService.restock(id, dto.quantity);
  }

  @UseGuards(KeycloakAuthGuard)
  @Scopes('products:write')
  @Delete(':id')
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.productsService.remove(id);
  }
}
