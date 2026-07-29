import { Transform, Type } from 'class-transformer';
import { IsBoolean, IsEnum, IsInt, IsNumber, IsOptional, IsString, IsUUID, Max, Min } from 'class-validator';

export enum ProductSortOrder {
  // Only meaningfully different from NEWEST when a search term is
  // present — ranks by full-text match quality (ts_rank), which is
  // undefined/meaningless with no search term, so RELEVANCE without a
  // search term falls back to NEWEST in ProductsService.
  RELEVANCE = 'relevance',
  NEWEST = 'newest',
  PRICE_ASC = 'price_asc',
  PRICE_DESC = 'price_desc',
  NAME_ASC = 'name_asc',
}

export class QueryProductsDto {
  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsUUID()
  categoryId?: string;

  // Filters against retailPrice specifically, not tradePrice — a known
  // simplification, not an oversight. Filtering by whichever price basis
  // the actual viewer sees would need to know their account type at
  // query time, which the rest of this endpoint doesn't require (product
  // browsing is public); retailPrice is what an anonymous visitor sees,
  // and it's always >= a trade account's own price, so it still works
  // reasonably as a range bound for trade browsing too, just not with
  // perfect precision against their actual discounted price.
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  minPrice?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  maxPrice?: number;

  // @Type(() => Boolean) is a real trap for a query-string boolean —
  // Boolean('false') is true, since any non-empty string is truthy. This
  // needs an explicit comparison against the literal string instead.
  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  @IsBoolean()
  inStockOnly?: boolean;

  @IsOptional()
  @IsEnum(ProductSortOrder)
  sortBy?: ProductSortOrder;

  @IsOptional()
  @IsString()
  brand?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  pageSize: number = 24;
}
