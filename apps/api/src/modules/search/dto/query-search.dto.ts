import { Transform, Type } from 'class-transformer';
import { IsBoolean, IsEnum, IsInt, IsNumber, IsOptional, IsString, IsUUID, Max, Min, MinLength } from 'class-validator';
import { ProductSortOrder } from '../../products/dto/query-products.dto';

export class QuerySearchDto {
  @IsString()
  @MinLength(1)
  q!: string;

  @IsOptional()
  @IsUUID()
  categoryId?: string;

  // Same fields, same reasoning, as QueryProductsDto — see that file's
  // comments. Kept in sync manually; there's no shared base class since
  // `q` here vs `search` there are different required/optional shapes.
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
  @Max(100)
  @Min(1)
  pageSize: number = 24;
}
