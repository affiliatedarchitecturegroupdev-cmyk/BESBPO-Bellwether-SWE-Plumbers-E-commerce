import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { AnalyticsService } from './analytics.service';
import { RevenueOverTimeDto } from './dto/revenue-over-time.dto';
import { PopularProductsDto } from './dto/popular-products.dto';
import { KeycloakAuthGuard } from '../../common/guards/keycloak-auth.guard';
import { Scopes } from '../../common/decorators/scopes.decorator';

// Reuses 'orders:manage' rather than introducing a dedicated
// 'analytics:read' scope — every metric here is order/revenue data, and
// anyone trusted to manage orders is the natural audience for reporting
// on them. Revisit if analytics ever needs to be readable by someone who
// shouldn't also be able to change order status.
@UseGuards(KeycloakAuthGuard)
@Scopes('orders:manage')
@Controller({ path: 'analytics', version: '1' })
export class AnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService) {}

  @Get('summary')
  getSummary() {
    return this.analyticsService.getSummary();
  }

  @Get('revenue-over-time')
  getRevenueOverTime(@Query() query: RevenueOverTimeDto) {
    return this.analyticsService.getRevenueOverTime(query);
  }

  @Get('popular-products')
  getPopularProducts(@Query() query: PopularProductsDto) {
    return this.analyticsService.getPopularProducts(query);
  }

  @Get('clearance-summary')
  getClearanceSummary() {
    return this.analyticsService.getClearanceSummary();
  }

  @Get('trade-application-funnel')
  getTradeApplicationFunnel() {
    return this.analyticsService.getTradeApplicationFunnel();
  }

  @Get('bundle-catalog-summary')
  getBundleCatalogSummary() {
    return this.analyticsService.getBundleCatalogSummary();
  }
}
