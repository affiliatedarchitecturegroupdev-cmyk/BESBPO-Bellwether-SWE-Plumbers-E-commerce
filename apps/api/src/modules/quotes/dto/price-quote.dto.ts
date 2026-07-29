import { ArrayMinSize, IsArray, IsDateString, IsNumber, IsOptional, IsString, IsUUID, Min, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

export class QuoteItemPriceDto {
  @IsUUID()
  itemId!: string;

  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  unitPrice!: number;
}

export class PriceQuoteDto {
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => QuoteItemPriceDto)
  itemPrices!: QuoteItemPriceDto[];

  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  quotedTotal!: number;

  @IsDateString()
  validUntil!: string;

  @IsOptional()
  @IsString()
  adminNotes?: string;
}
