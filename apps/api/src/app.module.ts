import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { ScheduleModule } from '@nestjs/schedule';
import { PrismaModule } from './modules/prisma/prisma.module';
import { AuthModule } from './modules/auth/auth.module';
import { AccountsModule } from './modules/accounts/accounts.module';
import { ProductsModule } from './modules/products/products.module';
import { CategoriesModule } from './modules/categories/categories.module';
import { BundlesModule } from './modules/bundles/bundles.module';
import { PricingModule } from './modules/pricing/pricing.module';
import { CartModule } from './modules/cart/cart.module';
import { OrdersModule } from './modules/orders/orders.module';
import { BookingsModule } from './modules/bookings/bookings.module';
import { WarrantyModule } from './modules/warranty/warranty.module';
import { ComplianceModule } from './modules/compliance/compliance.module';
import { PaymentsModule } from './modules/payments/payments.module';
import { TradeCreditModule } from './modules/trade-credit/trade-credit.module';
import { NotificationsModule } from './modules/notifications/notifications.module';
import { MediaModule } from './modules/media/media.module';
import { SearchModule } from './modules/search/search.module';
import { AddressesModule } from './modules/addresses/addresses.module';
import { ReviewsModule } from './modules/reviews/reviews.module';
import { EstimateModule } from './modules/estimate/estimate.module';
import { AnalyticsModule } from './modules/analytics/analytics.module';
import { AuditLogModule } from './modules/audit-log/audit-log.module';
import { HealthModule } from './modules/health/health.module';
import { QuotesModule } from './modules/quotes/quotes.module';
import { ShippingModule } from './modules/shipping/shipping.module';
import { WarehousesModule } from './modules/warehouses/warehouses.module';
import { CouponsModule } from './modules/coupons/coupons.module';
import { WishlistModule } from './modules/wishlist/wishlist.module';
import { QuestionsModule } from './modules/questions/questions.module';
import { PriceTiersModule } from './modules/price-tiers/price-tiers.module';
import { ReturnsModule } from './modules/returns/returns.module';
import { NotificationTemplatesModule } from './modules/notifications/templates/notification-templates.module';
import { RecurringOrdersModule } from './modules/recurring-orders/recurring-orders.module';
import { NewsletterModule } from './modules/newsletter/newsletter.module';
import { TradeAccountApplicationsModule } from './modules/trade-account-applications/trade-account-applications.module';
import { BackInStockModule } from './modules/back-in-stock/back-in-stock.module';
import { envValidationSchema } from './config/env.validation';

// NOTE for OpenHands (see docs/AGENTS.md): this is now the full module
// list from the original build-out plan. Keep this file a thin wiring
// layer; no business logic belongs here.
@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
      validationSchema: envValidationSchema,
      // Explicit rather than relying on @nestjs/config's default: process.env
      // carries plenty of variables unrelated to this app (PATH, HOME, CI
      // runner internals, whatever the host injects) — allowUnknown must be
      // true or every boot fails on vars this schema was never meant to
      // describe. abortEarly: false so a misconfigured environment reports
      // every missing variable at once, not just the first one found.
      validationOptions: { allowUnknown: true, abortEarly: false },
    }),
    ThrottlerModule.forRoot([{ ttl: 60000, limit: 120 }]),
    // Enables @Cron() decorators anywhere in the module tree —
    // CartAbandonmentService is the first (and, as of this pass, only)
    // consumer. Runs in the API process, not the worker; see that
    // service's own comment for why.
    ScheduleModule.forRoot(),
    PrismaModule,
    AuthModule,
    AccountsModule,
    ProductsModule,
    CategoriesModule,
    BundlesModule,
    PricingModule,
    CartModule,
    OrdersModule,
    BookingsModule,
    WarrantyModule,
    ComplianceModule,
    PaymentsModule,
    TradeCreditModule,
    NotificationsModule,
    MediaModule,
    SearchModule,
    AddressesModule,
    ReviewsModule,
    EstimateModule,
    AnalyticsModule,
    AuditLogModule,
    HealthModule,
    QuotesModule,
    ShippingModule,
    WarehousesModule,
    CouponsModule,
    WishlistModule,
    QuestionsModule,
    PriceTiersModule,
    ReturnsModule,
    NotificationTemplatesModule,
    RecurringOrdersModule,
    NewsletterModule,
    TradeAccountApplicationsModule,
    BackInStockModule,
  ],
  providers: [
    // ThrottlerModule.forRoot() only registers the rate-limit *config* — it
    // does nothing on its own without a guard actually applying it. This
    // was missing entirely until now: every endpoint was unthrottled
    // regardless of what forRoot() specified. Registering it as APP_GUARD
    // makes it global; a route can still opt out with @SkipThrottle() or
    // set a tighter limit with @Throttle() if 120/min is wrong for it.
    { provide: APP_GUARD, useClass: ThrottlerGuard },
  ],
})
export class AppModule {}
