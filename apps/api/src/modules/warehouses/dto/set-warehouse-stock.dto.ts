import { IsInt, Min } from 'class-validator';

// An absolute set, not an increment — matches how a dedicated
// per-warehouse stock screen naturally works ("there are 45 units of
// this here right now," like a stocktake), distinct from the existing
// restock endpoint's "add N units" semantic on Product.stockQty.
export class SetWarehouseStockDto {
  @IsInt()
  @Min(0)
  quantity!: number;
}
