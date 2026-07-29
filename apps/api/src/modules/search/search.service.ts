import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ProductsService, PaginatedProducts } from '../products/products.service';
import { QuerySearchDto } from './dto/query-search.dto';

export interface SearchResult {
  originalQuery: string;
  expandedQuery: string;
  results: PaginatedProducts;
}

// This is the entry point apps/web actually calls — before this existed,
// apps/ai-service's /search-rank (domain-specific query expansion, see
// docs/AGENTS.md) had no real caller anywhere: it was built, tested, and
// completely unreachable from any user-facing flow. Found while wiring up
// the frontend search page, not before.
@Injectable()
export class SearchService {
  private readonly logger = new Logger(SearchService.name);

  constructor(
    private readonly config: ConfigService,
    private readonly productsService: ProductsService,
  ) {}

  async search(query: QuerySearchDto): Promise<SearchResult> {
    const aiServiceUrl = this.config.get<string>('AI_SERVICE_URL');
    if (aiServiceUrl) {
      const aiResult = await this.tryAiService(aiServiceUrl, query);
      if (aiResult) return aiResult;
    }

    // Fallback — AI_SERVICE_URL not configured (a valid local-dev state;
    // see env.validation.ts), or the AI service call failed. Plain
    // Postgres full-text search still works on its own; the AI service is
    // an enhancement layer on top of it, not a dependency it needs to
    // function at all. See ProductsService.searchByText.
    const results = await this.productsService.findAll({
      search: query.q,
      categoryId: query.categoryId,
      page: query.page,
      pageSize: query.pageSize,
      minPrice: query.minPrice,
      maxPrice: query.maxPrice,
      inStockOnly: query.inStockOnly,
      sortBy: query.sortBy,
      brand: query.brand,
    });
    return { originalQuery: query.q, expandedQuery: query.q, results };
  }

  private async tryAiService(aiServiceUrl: string, query: QuerySearchDto): Promise<SearchResult | null> {
    try {
      const response = await fetch(`${aiServiceUrl}/search-rank`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: query.q,
          category_id: query.categoryId,
          page: query.page,
          page_size: query.pageSize,
          // snake_case to match apps/ai-service's Pydantic schema — kept
          // in sync manually, there's no shared-types package between
          // the two languages (see
          // docs/GAP-ANALYSIS-III-FEATURE-EXPANSION.md).
          min_price: query.minPrice,
          max_price: query.maxPrice,
          in_stock_only: query.inStockOnly,
          sort_by: query.sortBy,
          brand: query.brand,
        }),
        signal: AbortSignal.timeout(3000), // search should feel instant — 3s is already a poor experience, not worth waiting longer before falling back
      });
      if (!response.ok) return null;

      const data = (await response.json()) as {
        original_query: string;
        expanded_query: string;
        results: PaginatedProducts;
      };
      return { originalQuery: data.original_query, expandedQuery: data.expanded_query, results: data.results };
    } catch (err) {
      this.logger.warn(`AI service search-rank call failed, falling back to plain FTS: ${err}`);
      return null;
    }
  }
}
