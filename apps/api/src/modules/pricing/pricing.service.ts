import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { QuoteRequestDto } from './dto/quote-request.dto';
import { AppliedMultiplier, MaterialLine, PricingResult } from './interfaces/pricing-result.interface';
import { round2, VAT_RATE } from '../../common/utils/money.util';

@Injectable()
export class PricingService {
  constructor(private readonly prisma: PrismaService) {}

  async quote(request: QuoteRequestDto): Promise<PricingResult> {
    const priceBookEntry = await this.prisma.priceBookEntry.findFirst({
      where: { sector: request.sector, serviceCode: request.serviceCode },
      orderBy: { effectiveFrom: 'desc' }, // most recent rate for this sector/service
    });
    if (!priceBookEntry) {
      throw new NotFoundException(
        `No price book entry for sector '${request.sector}' / service '${request.serviceCode}'`,
      );
    }

    const appliedMultipliers = await this.resolveMultipliers(request.complexityMultiplierCodes ?? []);
    const materials = await this.resolveMaterials(request.materials ?? [], request.tradePricing ?? false);

    const baseLaborRate = Number(priceBookEntry.baseLaborRate);
    // Multipliers compound multiplicatively (1.25 x 1.15, not 1.25 + 1.15) —
    // this mirrors the original blueprint's complexity/surcharge model.
    const compoundMultiplier = appliedMultipliers.reduce((acc, m) => acc * m.multiplier, 1);
    const laborSubtotal = round2(baseLaborRate * compoundMultiplier);

    const materialsSubtotal = round2(materials.reduce((sum, m) => sum + m.lineTotal, 0));
    const subtotal = round2(laborSubtotal + materialsSubtotal);
    const vatAmount = round2(subtotal * VAT_RATE);
    const total = round2(subtotal + vatAmount);

    return {
      sector: request.sector,
      serviceCode: request.serviceCode,
      baseLaborRate,
      appliedMultipliers,
      laborSubtotal,
      materials,
      materialsSubtotal,
      subtotal,
      vatAmount,
      total,
    };
  }

  private async resolveMultipliers(codes: string[]): Promise<AppliedMultiplier[]> {
    if (codes.length === 0) return [];

    const rows = await this.prisma.complexityMultiplier.findMany({ where: { code: { in: codes } } });
    if (rows.length !== codes.length) {
      const found = new Set(rows.map((r) => r.code));
      const missing = codes.filter((c) => !found.has(c));
      throw new BadRequestException(`Unknown complexity multiplier code(s): ${missing.join(', ')}`);
    }

    return rows.map((r) => ({ code: r.code, label: r.label, multiplier: Number(r.multiplier) }));
  }

  private async resolveMaterials(
    lines: { productId: string; quantity: number }[],
    tradePricing: boolean,
  ): Promise<MaterialLine[]> {
    if (lines.length === 0) return [];

    const productIds = lines.map((l) => l.productId);
    const products = await this.prisma.product.findMany({ where: { id: { in: productIds } } });
    const byId = new Map(products.map((p) => [p.id, p]));

    return lines.map((line) => {
      const product = byId.get(line.productId);
      if (!product) {
        throw new BadRequestException(`Unknown product id in materials list: ${line.productId}`);
      }
      const unitPrice = Number(tradePricing ? product.tradePrice : product.retailPrice);
      return {
        productId: product.id,
        name: product.name,
        unitPrice,
        quantity: line.quantity,
        lineTotal: round2(unitPrice * line.quantity),
      };
    });
  }
}
