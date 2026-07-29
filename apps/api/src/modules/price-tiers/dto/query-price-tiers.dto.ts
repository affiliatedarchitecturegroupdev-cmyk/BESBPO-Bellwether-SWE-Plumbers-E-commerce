import { IsUUID } from 'class-validator';

export class QueryPriceTiersDto {
  @IsUUID()
  productId!: string;
}
