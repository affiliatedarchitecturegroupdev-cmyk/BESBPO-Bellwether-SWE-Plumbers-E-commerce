import { IsInt, IsNumber, IsUUID, Max, Min } from 'class-validator';

export class CreatePriceTierDto {
  @IsUUID()
  productId!: string;

  // Inclusive lower bound — 2 minimum, not 1: a "tier" starting at
  // quantity 1 would just be the product's own base price, not a real
  // bulk-pricing threshold.
  @IsInt()
  @Min(2)
  minQuantity!: number;

  @IsNumber()
  @Min(0.01)
  @Max(100)
  discountPercent!: number;
}
