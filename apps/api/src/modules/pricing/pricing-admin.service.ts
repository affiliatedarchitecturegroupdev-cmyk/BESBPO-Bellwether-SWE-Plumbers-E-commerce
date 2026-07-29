import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { ComplexityMultiplier, PriceBookEntry } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreatePriceBookEntryDto } from './dto/create-price-book-entry.dto';
import { CreateComplexityMultiplierDto } from './dto/create-complexity-multiplier.dto';
import { UpdateComplexityMultiplierDto } from './dto/update-complexity-multiplier.dto';

@Injectable()
export class PricingAdminService {
  constructor(private readonly prisma: PrismaService) {}

  // Price book entries are an APPEND-ONLY rate history, not a single
  // mutable row per sector/service — PricingService.quote already reads
  // "whichever entry has the most recent effectiveFrom" for a given
  // sector/serviceCode (see that service's own query), which only makes
  // sense if there's genuinely a history to pick the latest from. So
  // there's deliberately no update() here: an admin "changing" a rate
  // means creating a NEW entry (this method, with effectiveFrom set to
  // now), preserving what the rate used to be rather than silently
  // overwriting it. remove() exists only for correcting a genuine
  // data-entry mistake, not as a way to "end" an old rate — the quote
  // engine already ignores older entries once a newer one exists.
  async findAllPriceBookEntries(): Promise<PriceBookEntry[]> {
    return this.prisma.priceBookEntry.findMany({
      orderBy: [{ sector: 'asc' }, { serviceCode: 'asc' }, { effectiveFrom: 'desc' }],
    });
  }

  async createPriceBookEntry(dto: CreatePriceBookEntryDto): Promise<PriceBookEntry> {
    if (dto.productId) {
      const product = await this.prisma.product.findUnique({ where: { id: dto.productId } });
      if (!product) {
        throw new NotFoundException(`Product '${dto.productId}' not found`);
      }
    }

    return this.prisma.priceBookEntry.create({
      data: {
        sector: dto.sector,
        serviceCode: dto.serviceCode,
        productId: dto.productId,
        baseLaborRate: dto.baseLaborRate,
        unit: dto.unit,
      },
    });
  }

  async removePriceBookEntry(id: string): Promise<void> {
    const entry = await this.prisma.priceBookEntry.findUnique({ where: { id } });
    if (!entry) {
      throw new NotFoundException(`Price book entry '${id}' not found`);
    }
    await this.prisma.priceBookEntry.delete({ where: { id } });
  }

  // Complexity multipliers, unlike price book entries, ARE a single
  // mutable row per code — @unique on code, no history concept, so
  // update() (adjusting label/multiplier/description in place) is the
  // natural admin operation here, not create-a-new-one.
  async findAllComplexityMultipliers(): Promise<ComplexityMultiplier[]> {
    return this.prisma.complexityMultiplier.findMany({ orderBy: { code: 'asc' } });
  }

  async createComplexityMultiplier(dto: CreateComplexityMultiplierDto): Promise<ComplexityMultiplier> {
    const existing = await this.prisma.complexityMultiplier.findUnique({ where: { code: dto.code } });
    if (existing) {
      throw new ConflictException(`A complexity multiplier with code '${dto.code}' already exists`);
    }

    return this.prisma.complexityMultiplier.create({ data: dto });
  }

  async updateComplexityMultiplier(id: string, dto: UpdateComplexityMultiplierDto): Promise<ComplexityMultiplier> {
    const existing = await this.prisma.complexityMultiplier.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundException(`Complexity multiplier '${id}' not found`);
    }
    return this.prisma.complexityMultiplier.update({ where: { id }, data: dto });
  }

  async removeComplexityMultiplier(id: string): Promise<void> {
    const existing = await this.prisma.complexityMultiplier.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundException(`Complexity multiplier '${id}' not found`);
    }
    await this.prisma.complexityMultiplier.delete({ where: { id } });
  }
}
