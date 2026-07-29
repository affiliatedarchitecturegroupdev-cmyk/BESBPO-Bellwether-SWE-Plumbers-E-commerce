import { Injectable, NotFoundException } from '@nestjs/common';
import { Warehouse, WarehouseStock } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateWarehouseDto } from './dto/create-warehouse.dto';

@Injectable()
export class WarehousesService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateWarehouseDto): Promise<Warehouse> {
    return this.prisma.warehouse.create({ data: dto });
  }

  async findAll(): Promise<Warehouse[]> {
    return this.prisma.warehouse.findMany({ orderBy: { name: 'asc' } });
  }

  // Every warehouse the product has an explicit row for, plus every
  // OTHER warehouse shown with an implicit zero — an admin managing
  // stock should see every location as an option to set, not just the
  // ones a WarehouseStock row happens to already exist for.
  async getStockForProduct(productId: string): Promise<{ warehouse: Warehouse; quantity: number }[]> {
    const [warehouses, stockRows] = await Promise.all([
      this.prisma.warehouse.findMany({ orderBy: { name: 'asc' } }),
      this.prisma.warehouseStock.findMany({ where: { productId } }),
    ]);
    const quantityByWarehouseId = new Map(stockRows.map((row) => [row.warehouseId, row.quantity]));

    return warehouses.map((warehouse) => ({
      warehouse,
      quantity: quantityByWarehouseId.get(warehouse.id) ?? 0,
    }));
  }

  // Sets one warehouse's stock for one product, then recomputes
  // Product.stockQty as the sum across every warehouse in the SAME
  // transaction — the aggregate other code paths depend on (checkout,
  // search's inStockOnly filter, low-stock highlighting) never observes
  // a half-updated state between the two writes.
  async setStock(warehouseId: string, productId: string, quantity: number): Promise<WarehouseStock> {
    const [warehouse, product] = await Promise.all([
      this.prisma.warehouse.findUnique({ where: { id: warehouseId } }),
      this.prisma.product.findUnique({ where: { id: productId } }),
    ]);
    if (!warehouse) {
      throw new NotFoundException(`Warehouse '${warehouseId}' not found`);
    }
    if (!product) {
      throw new NotFoundException(`Product '${productId}' not found`);
    }

    return this.prisma.$transaction(async (tx) => {
      const stock = await tx.warehouseStock.upsert({
        where: { warehouseId_productId: { warehouseId, productId } },
        update: { quantity },
        create: { warehouseId, productId, quantity },
      });

      const aggregate = await tx.warehouseStock.aggregate({
        where: { productId },
        _sum: { quantity: true },
      });
      await tx.product.update({
        where: { id: productId },
        data: { stockQty: aggregate._sum.quantity ?? 0 },
      });

      return stock;
    });
  }
}
