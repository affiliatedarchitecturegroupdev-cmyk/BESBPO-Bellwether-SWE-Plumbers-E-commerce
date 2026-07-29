import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { PriceTier } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreatePriceTierDto } from './dto/create-price-tier.dto';

@Injectable()
export class PriceTiersService {
  constructor(private readonly prisma: PrismaService) {}

  async findByProduct(productId: string): Promise<PriceTier[]> {
    return this.prisma.priceTier.findMany({ where: { productId }, orderBy: { minQuantity: 'asc' } });
  }

  async create(dto: CreatePriceTierDto): Promise<PriceTier> {
    const product = await this.prisma.product.findUnique({ where: { id: dto.productId } });
    if (!product) {
      throw new NotFoundException(`Product '${dto.productId}' not found`);
    }

    const existing = await this.prisma.priceTier.findUnique({
      where: { productId_minQuantity: { productId: dto.productId, minQuantity: dto.minQuantity } },
    });
    if (existing) {
      throw new ConflictException(`A tier already exists at quantity ${dto.minQuantity} for this product`);
    }

    return this.prisma.priceTier.create({
      data: { productId: dto.productId, minQuantity: dto.minQuantity, discountPercent: dto.discountPercent },
    });
  }

  async remove(id: string): Promise<void> {
    const tier = await this.prisma.priceTier.findUnique({ where: { id } });
    if (!tier) {
      throw new NotFoundException(`Price tier '${id}' not found`);
    }
    await this.prisma.priceTier.delete({ where: { id } });
  }
}
