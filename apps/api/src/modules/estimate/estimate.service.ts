import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { RequestEstimateDto } from './dto/request-estimate.dto';

export interface EstimateResult {
  matchedSector: string | null;
  matchedServiceCode: string | null;
  confidence: 'high' | 'low' | 'unavailable';
  quote: Record<string, unknown> | null;
  note: string;
}

const UNAVAILABLE_NOTE =
  "We couldn't generate an instant estimate right now. Send us a few details and our team will quote you directly.";

// Unlike SearchService and ProductsService.getRecommendations, there's no
// meaningful fallback classification to fall back to here — /estimate's
// keyword matching (see apps/ai-service/app/services/estimate_service.py)
// IS the classification logic; there's nothing equivalent on the API side
// to approximate it with. When the AI service is unreachable, this is
// honest about that rather than pretending to classify with something
// worse. See docs/AGENTS.md's search section for why this three-endpoint
// pattern (search-rank, recommend, estimate) exists at all.
@Injectable()
export class EstimateService {
  private readonly logger = new Logger(EstimateService.name);

  constructor(private readonly config: ConfigService) {}

  async estimate(dto: RequestEstimateDto): Promise<EstimateResult> {
    const aiServiceUrl = this.config.get<string>('AI_SERVICE_URL');
    if (!aiServiceUrl) {
      return this.unavailableResult();
    }

    try {
      const response = await fetch(`${aiServiceUrl}/estimate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ description: dto.description, trade_pricing: dto.tradePricing ?? false }),
        signal: AbortSignal.timeout(5000), // a bit longer than search/recommend's 3s — this call chains into the pricing engine on the AI service's side, so it's inherently a bit slower
      });
      if (!response.ok) return this.unavailableResult();

      const data = (await response.json()) as {
        matched_sector: string;
        matched_service_code: string;
        confidence: 'high' | 'low';
        quote: Record<string, unknown> | null;
        note: string;
      };

      return {
        matchedSector: data.matched_sector,
        matchedServiceCode: data.matched_service_code,
        confidence: data.confidence,
        quote: data.quote,
        note: data.note,
      };
    } catch (err) {
      this.logger.warn(`AI service /estimate call failed: ${err}`);
      return this.unavailableResult();
    }
  }

  private unavailableResult(): EstimateResult {
    return {
      matchedSector: null,
      matchedServiceCode: null,
      confidence: 'unavailable',
      quote: null,
      note: UNAVAILABLE_NOTE,
    };
  }
}
