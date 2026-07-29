import { ArrayMinSize, IsArray, IsInt, IsOptional, IsString, IsUUID, Min, MinLength, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

export class QuoteItemInputDto {
  // Either a real product (for a bulk-quantity ask on something in the
  // catalog) or just a description (for custom/non-catalog work, e.g.
  // "on-site labour, 2 days") — not both required, since a request can
  // be entirely custom line items with no catalog product at all.
  @IsOptional()
  @IsUUID()
  productId?: string;

  @IsString()
  @MinLength(1)
  description!: string;

  @IsInt()
  @Min(1)
  quantity!: number;
}

export class CreateQuoteDto {
  @IsString()
  @MinLength(10) // a one-word request can't be usefully reviewed — same reasoning as EstimateService's description minimum
  description!: string;

  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => QuoteItemInputDto)
  items!: QuoteItemInputDto[];
}
