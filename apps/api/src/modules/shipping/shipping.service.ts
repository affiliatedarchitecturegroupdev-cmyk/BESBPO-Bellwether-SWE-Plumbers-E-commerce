import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CartService } from '../cart/cart.service';
import { ShipLogicService, ShipLogicRate } from './shiplogic.service';
import { ShippingQuoteAddressDto } from './dto/shipping-quote-address.dto';
import { round2 } from '../../common/utils/money.util';

// Same flat figure checkout has always defaulted to — kept as the
// fallback specifically so quoting still works (just less accurately)
// when ShipLogic isn't configured or a request fails, rather than
// blocking checkout on a third-party call.
const FALLBACK_DELIVERY_FEE = 150;

export interface ShippingQuoteResult {
  source: 'shiplogic' | 'fallback';
  fee: number;
  serviceName: string | null;
  options: ShipLogicRate[]; // full list, so a future UI could let the customer pick a service level instead of always taking the cheapest
}

@Injectable()
export class ShippingService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly cartService: CartService,
    private readonly shipLogicService: ShipLogicService,
  ) {}

  async getQuote(keycloakSub: string, email: string, delivery: ShippingQuoteAddressDto): Promise<ShippingQuoteResult> {
    if (!this.shipLogicService.isConfigured()) {
      return this.fallbackResult();
    }

    const cart = await this.cartService.getCart(keycloakSub, email);
    if (cart.lines.length === 0) {
      return this.fallbackResult();
    }

    const parcel = await this.aggregateParcel(cart.lines.map((l) => ({ productId: l.productId, quantity: l.quantity })));

    const rates = await this.shipLogicService.getRates(
      {
        type: 'residential',
        company: '',
        streetAddress: delivery.line1 + (delivery.line2 ? `, ${delivery.line2}` : ''),
        localArea: '',
        city: delivery.city,
        zone: delivery.province,
        country: 'ZA',
        code: delivery.postalCode,
      },
      [parcel],
    );

    if (!rates || rates.length === 0) {
      return this.fallbackResult();
    }

    const cheapest = rates.reduce((min, r) => (r.rate < min.rate ? r : min));
    return { source: 'shiplogic', fee: cheapest.rate, serviceName: cheapest.serviceName, options: rates };
  }

  private fallbackResult(): ShippingQuoteResult {
    return { source: 'fallback', fee: FALLBACK_DELIVERY_FEE, serviceName: null, options: [] };
  }

  // Deliberately simplified, not real bin-packing: every cart is treated
  // as ONE parcel — total weight summed across every line, dimensions
  // taken from whichever single item in the cart is physically largest
  // (by volume), not a real packed-box calculation across every item
  // together. This is a conservative approximation, not an accurate one:
  // it can overstate a large multi-item order's true box size in some
  // cases and understate it in others (several medium items that
  // together need a bigger box than the single largest one alone). Real
  // multi-parcel splitting is a genuinely separate, harder problem — not
  // attempted here.
  private async aggregateParcel(
    items: { productId: string; quantity: number }[],
  ): Promise<{ weightKg: number; lengthCm: number; widthCm: number; heightCm: number }> {
    const products = await this.prisma.product.findMany({
      where: { id: { in: items.map((i) => i.productId) } },
      select: { id: true, weightKg: true, lengthCm: true, widthCm: true, heightCm: true },
    });
    const byId = new Map(products.map((p) => [p.id, p]));

    let totalWeightKg = 0;
    let largestVolume = 0;
    let largest = { lengthCm: 20, widthCm: 15, heightCm: 10 };

    for (const item of items) {
      const product = byId.get(item.productId);
      if (!product) continue;

      totalWeightKg += Number(product.weightKg) * item.quantity;

      const volume = product.lengthCm * product.widthCm * product.heightCm;
      if (volume > largestVolume) {
        largestVolume = volume;
        largest = { lengthCm: product.lengthCm, widthCm: product.widthCm, heightCm: product.heightCm };
      }
    }

    return { weightKg: round2(totalWeightKg), ...largest };
  }
}
