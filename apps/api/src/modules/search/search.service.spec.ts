import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { SearchService } from './search.service';
import { ProductsService } from '../products/products.service';

describe('SearchService', () => {
  let service: SearchService;
  let productsService: { findAll: jest.Mock };
  let config: Record<string, string | undefined>;

  const fallbackResults = { items: [], page: 1, pageSize: 24, total: 0 };

  beforeEach(async () => {
    productsService = { findAll: jest.fn().mockResolvedValue(fallbackResults) };
    config = { AI_SERVICE_URL: 'http://bellwetherswe-ai:8000' };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SearchService,
        { provide: ProductsService, useValue: productsService },
        { provide: ConfigService, useValue: { get: (key: string) => config[key] } },
      ],
    }).compile();

    service = module.get(SearchService);
  });

  it('uses the AI service result when it responds successfully', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: () =>
        Promise.resolve({
          original_query: 'leaking tap',
          expanded_query: 'leaking tap drip fitting leak pipe repair',
          results: fallbackResults,
        }),
    }) as never;

    const result = await service.search({ q: 'leaking tap', page: 1, pageSize: 24 });

    expect(result.expandedQuery).toBe('leaking tap drip fitting leak pipe repair');
    expect(productsService.findAll).not.toHaveBeenCalled();
  });

  it('falls back to plain FTS when the AI service returns a non-OK response', async () => {
    global.fetch = jest.fn().mockResolvedValue({ ok: false }) as never;

    const result = await service.search({ q: 'valve', page: 1, pageSize: 24 });

    expect(result.expandedQuery).toBe('valve'); // unchanged — no expansion happened
    expect(productsService.findAll).toHaveBeenCalledWith({
      search: 'valve',
      categoryId: undefined,
      page: 1,
      pageSize: 24,
      minPrice: undefined,
      maxPrice: undefined,
      inStockOnly: undefined,
      sortBy: undefined,
      brand: undefined,
    });
  });

  it('forwards the new filter fields to the fallback FTS path when set', async () => {
    global.fetch = jest.fn().mockResolvedValue({ ok: false }) as never;

    await service.search({
      q: 'valve',
      page: 1,
      pageSize: 24,
      minPrice: 50,
      maxPrice: 200,
      inStockOnly: true,
      brand: 'Cobra',
    } as never);

    expect(productsService.findAll).toHaveBeenCalledWith(
      expect.objectContaining({ minPrice: 50, maxPrice: 200, inStockOnly: true, brand: 'Cobra' }),
    );
  });

  it('forwards the new filter fields to the AI service request body in snake_case', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: () =>
        Promise.resolve({ original_query: 'valve', expanded_query: 'valve', results: { items: [], total: 0 } }),
    }) as never;

    await service.search({
      q: 'valve',
      page: 1,
      pageSize: 24,
      minPrice: 50,
      inStockOnly: true,
      brand: 'Cobra',
    } as never);

    const [, options] = (global.fetch as jest.Mock).mock.calls[0];
    const body = JSON.parse(options.body);
    expect(body).toEqual(
      expect.objectContaining({ min_price: 50, in_stock_only: true, brand: 'Cobra' }),
    );
  });

  it('falls back to plain FTS when the AI service call throws (network error, timeout)', async () => {
    global.fetch = jest.fn().mockRejectedValue(new Error('fetch failed')) as never;

    const result = await service.search({ q: 'pump', page: 1, pageSize: 24 });

    expect(result.originalQuery).toBe('pump');
    expect(productsService.findAll).toHaveBeenCalled();
  });

  it('skips the AI service entirely when AI_SERVICE_URL is not configured', async () => {
    config.AI_SERVICE_URL = undefined;
    global.fetch = jest.fn();

    await service.search({ q: 'bracket', page: 1, pageSize: 24 });

    expect(global.fetch).not.toHaveBeenCalled();
    expect(productsService.findAll).toHaveBeenCalled();
  });
});
