import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { EstimateService } from './estimate.service';

describe('EstimateService', () => {
  let service: EstimateService;
  let config: Record<string, string | undefined>;

  beforeEach(async () => {
    config = { AI_SERVICE_URL: 'http://bellwetherswe-ai:8000' };

    const module: TestingModule = await Test.createTestingModule({
      providers: [EstimateService, { provide: ConfigService, useValue: { get: (key: string) => config[key] } }],
    }).compile();

    service = module.get(EstimateService);
  });

  it('returns the AI service classification when it responds successfully', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: () =>
        Promise.resolve({
          matched_sector: 'Residential',
          matched_service_code: 'PIPE_REPAIR',
          confidence: 'high',
          quote: { total: 450 },
          note: 'Estimate based on the description provided.',
        }),
    }) as never;

    const result = await service.estimate({ description: 'There is a leaking pipe under my kitchen sink' });

    expect(result.confidence).toBe('high');
    expect(result.matchedServiceCode).toBe('PIPE_REPAIR');
  });

  it('returns an honest "unavailable" result, not a fake classification, when AI_SERVICE_URL is not configured', async () => {
    config.AI_SERVICE_URL = undefined;
    global.fetch = jest.fn();

    const result = await service.estimate({ description: 'There is a leaking pipe under my kitchen sink' });

    expect(result.confidence).toBe('unavailable');
    expect(result.matchedSector).toBeNull();
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it('returns an honest "unavailable" result when the AI service call fails', async () => {
    global.fetch = jest.fn().mockRejectedValue(new Error('timeout')) as never;

    const result = await service.estimate({ description: 'There is a leaking pipe under my kitchen sink' });

    expect(result.confidence).toBe('unavailable');
  });

  it('returns an honest "unavailable" result when the AI service responds with a non-OK status', async () => {
    global.fetch = jest.fn().mockResolvedValue({ ok: false }) as never;

    const result = await service.estimate({ description: 'There is a leaking pipe under my kitchen sink' });

    expect(result.confidence).toBe('unavailable');
  });
});
