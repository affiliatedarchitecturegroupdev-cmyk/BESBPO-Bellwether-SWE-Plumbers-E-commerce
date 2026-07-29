import { ArrayMinSize, IsArray, IsInt, IsUUID, Max, Min, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

// 1000 comfortably covers a trade bulk order (hundreds of fittings) without
// allowing an unbounded quantity through — nothing legitimate needs more
// than this in a single line item; anything higher is a typo or abuse.
const MAX_QUANTITY = 1000;

export class AddCartItemDto {
  @IsUUID()
  productId!: string;

  @IsInt()
  @Min(1)
  @Max(MAX_QUANTITY)
  quantity!: number;
}

export class UpdateCartItemDto {
  @IsInt()
  @Min(1)
  @Max(MAX_QUANTITY)
  quantity!: number;
}

export class BulkAddCartItemsDto {
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => AddCartItemDto)
  items!: AddCartItemDto[];
}
