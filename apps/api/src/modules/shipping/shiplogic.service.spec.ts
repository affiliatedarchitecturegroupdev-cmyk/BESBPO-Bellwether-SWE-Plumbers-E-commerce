import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { ShipLogicService } from './shiplogic.service';

describe('ShipLogicService', () => {
  let service: ShipLogicService;
  let config: Record<string, string | undefined>;

  const fullConfig = {
    SHIPLOGIC_API_KEY: 'test-key',
    WAREHOUSE_COMPANY: 'Bellwether SWE Plumbers',
    WAREHOUSE_STREET_ADDRESS: '194 Bancor Avenue',
    WAREHOUSE_LOCAL_AREA: 'Menlyn',
    WAREHOUSE_CITY: 'Pretoria',
    WAREHOUSE_ZONE: 'Gauteng',
    WAREHOUSE_POSTAL_CODE: '0181',
  };

  beforeEach(async () => {
    config = { ...fullConfig };
    const module: TestingModule = await Test.createTestingModule({
      providers: [ShipLogicService, { provide: ConfigService, useValue: { get: (key: string) => config[key] } }],
    }).compile();

    service = module.get(ShipLogicService);
  });

  describe('isConfigured', () => {
    it('is true when an API key and every warehouse address field are set', () => {
      expect(service.isConfigured()).toBe(true);
    });

    it('is false when the API key is missing', () => {
      config.SHIPLOGIC_API_KEY = undefined;
      expect(service.isConfigured()).toBe(false);
    });

    it('is false when the warehouse address is incomplete', () => {
      config.WAREHOUSE_POSTAL_CODE = undefined;
      expect(service.isConfigured()).toBe(false);
    });
  });

  describe('getRates', () => {
    const delivery = {
      type: 'residential' as const,
      company: '',
      streetAddress: '10 Midas Avenue',
      localArea: '',
      city: 'Johannesburg',
      zone: 'Gauteng',
      country: 'ZA',
      code: '2196',
    };
    const parcels = [{ lengthCm: 40, widthCm: 30, heightCm: 10, weightKg: 3 }];

    it('calls the real ShipLogic rates endpoint with Bearer auth', async () => {
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ result: { rates: [] } }),
      }) as never;

      await service.getRates(delivery, parcels);

      expect(global.fetch).toHaveBeenCalledWith(
        'https://api.shiplogic.com/v2/rates',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({ Authorization: 'Bearer test-key' }),
        }),
      );
    });

    it('sends parcels using the verified submitted_*_cm / submitted_weight_kg field names', async () => {
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ result: { rates: [] } }),
      }) as never;

      await service.getRates(delivery, parcels);

      const [, options] = (global.fetch as jest.Mock).mock.calls[0];
      const body = JSON.parse(options.body);
      expect(body.parcels).toEqual([
        { submitted_length_cm: 40, submitted_width_cm: 30, submitted_height_cm: 10, submitted_weight_kg: 3 },
      ]);
    });

    it('parses real rate options from the result.rates response shape', async () => {
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: () =>
          Promise.resolve({
            result: {
              rates: [
                { rate: 89.5, service_level: { code: 'ECO', name: 'Economy', description: '3-5 days' } },
                { rate: 145.0, service_level: { code: 'ON', name: 'Overnight', description: 'Next day' } },
              ],
            },
          }),
      }) as never;

      const result = await service.getRates(delivery, parcels);

      expect(result).toEqual([
        { rate: 89.5, serviceCode: 'ECO', serviceName: 'Economy', serviceDescription: '3-5 days' },
        { rate: 145.0, serviceCode: 'ON', serviceName: 'Overnight', serviceDescription: 'Next day' },
      ]);
    });

    it('returns null, not a thrown error, when the API responds with a non-OK status', async () => {
      global.fetch = jest.fn().mockResolvedValue({ ok: false, status: 401 }) as never;
      const result = await service.getRates(delivery, parcels);
      expect(result).toBeNull();
    });

    it('returns null when the request errors entirely (network failure, timeout)', async () => {
      global.fetch = jest.fn().mockRejectedValue(new Error('network error')) as never;
      const result = await service.getRates(delivery, parcels);
      expect(result).toBeNull();
    });

    it('returns null without calling fetch at all when not configured', async () => {
      config.SHIPLOGIC_API_KEY = undefined;
      global.fetch = jest.fn();

      const result = await service.getRates(delivery, parcels);

      expect(result).toBeNull();
      expect(global.fetch).not.toHaveBeenCalled();
    });
  });
});
