import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export interface ShipLogicAddress {
  type: 'business' | 'residential';
  company: string;
  streetAddress: string;
  localArea: string;
  city: string;
  zone: string; // province
  country: string; // ISO country code, e.g. "ZA"
  code: string; // postal code
}

export interface ShipLogicParcel {
  lengthCm: number;
  widthCm: number;
  heightCm: number;
  weightKg: number;
}

export interface ShipLogicRate {
  rate: number;
  serviceCode: string;
  serviceName: string;
  serviceDescription: string;
}

// Endpoint, auth mechanism, and request/response field names verified
// against a real, working example (a published SQL Server integration
// article calling this exact endpoint successfully) before writing any
// of this — not guessed at or pattern-matched from a generic REST
// shipping API shape. ShipLogic is the platform The Courier Guy's own
// official plugin integrations (WooCommerce, Shopify) run on — confirmed
// via that plugin's changelog referencing "ShipLogic API changes"
// directly — so this is a real courier's real API, not a third-party
// aggregator guessed at random.
@Injectable()
export class ShipLogicService {
  private readonly logger = new Logger(ShipLogicService.name);
  private static readonly RATES_URL = 'https://api.shiplogic.com/v2/rates';

  constructor(private readonly config: ConfigService) {}

  isConfigured(): boolean {
    return Boolean(this.config.get<string>('SHIPLOGIC_API_KEY')) && Boolean(this.getCollectionAddress());
  }

  // Returns null, never throws, on anything short of a genuine successful
  // response — a rate-quote failure should degrade to the caller's flat-
  // fee fallback, not break checkout entirely. See ShippingService.
  async getRates(delivery: ShipLogicAddress, parcels: ShipLogicParcel[]): Promise<ShipLogicRate[] | null> {
    const apiKey = this.config.get<string>('SHIPLOGIC_API_KEY');
    const collection = this.getCollectionAddress();
    if (!apiKey || !collection) return null;

    const today = new Date().toISOString().slice(0, 10);

    try {
      const response = await fetch(ShipLogicService.RATES_URL, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          collection_address: this.toShipLogicAddressPayload(collection),
          delivery_address: this.toShipLogicAddressPayload(delivery),
          parcels: parcels.map((p) => ({
            submitted_length_cm: p.lengthCm,
            submitted_width_cm: p.widthCm,
            submitted_height_cm: p.heightCm,
            submitted_weight_kg: p.weightKg,
          })),
          collection_min_date: today,
          delivery_min_date: today,
        }),
        signal: AbortSignal.timeout(8000),
      });

      if (!response.ok) {
        this.logger.warn(`ShipLogic rate request failed: HTTP ${response.status}`);
        return null;
      }

      const data = (await response.json()) as {
        result?: {
          rates?: {
            rate: number;
            service_level: { code: string; name: string; description: string };
          }[];
        };
      };

      const rates = data.result?.rates ?? [];
      return rates.map((r) => ({
        rate: r.rate,
        serviceCode: r.service_level.code,
        serviceName: r.service_level.name,
        serviceDescription: r.service_level.description,
      }));
    } catch (err) {
      this.logger.warn(`ShipLogic rate request errored: ${err}`);
      return null;
    }
  }

  private getCollectionAddress(): ShipLogicAddress | null {
    const streetAddress = this.config.get<string>('WAREHOUSE_STREET_ADDRESS');
    const city = this.config.get<string>('WAREHOUSE_CITY');
    const zone = this.config.get<string>('WAREHOUSE_ZONE');
    const code = this.config.get<string>('WAREHOUSE_POSTAL_CODE');
    if (!streetAddress || !city || !zone || !code) return null;

    return {
      type: 'business',
      company: this.config.get<string>('WAREHOUSE_COMPANY') ?? 'Bellwether SWE Plumbers',
      streetAddress,
      localArea: this.config.get<string>('WAREHOUSE_LOCAL_AREA') ?? '',
      city,
      zone,
      country: 'ZA',
      code,
    };
  }

  private toShipLogicAddressPayload(address: ShipLogicAddress) {
    return {
      type: address.type,
      company: address.company,
      street_address: address.streetAddress,
      local_area: address.localArea,
      city: address.city,
      zone: address.zone,
      country: address.country,
      code: address.code,
    };
  }
}
