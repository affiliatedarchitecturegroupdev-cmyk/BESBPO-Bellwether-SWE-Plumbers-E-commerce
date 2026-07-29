import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { SmsService } from './sms.service';

describe('SmsService', () => {
  let service: SmsService;
  let config: Record<string, string | undefined>;

  beforeEach(async () => {
    config = { BULKSMS_TOKEN_ID: 'test-token-id', BULKSMS_TOKEN_SECRET: 'test-token-secret' };
    const module: TestingModule = await Test.createTestingModule({
      providers: [SmsService, { provide: ConfigService, useValue: { get: (key: string) => config[key] } }],
    }).compile();

    service = module.get(SmsService);
  });

  describe('isConfigured', () => {
    it('is true when both token id and secret are set', () => {
      expect(service.isConfigured()).toBe(true);
    });

    it('is false when either credential is missing', () => {
      config.BULKSMS_TOKEN_SECRET = undefined;
      expect(service.isConfigured()).toBe(false);
    });
  });

  describe('send', () => {
    it('calls the real BulkSMS messages endpoint with Basic auth built from token id and secret', async () => {
      global.fetch = jest.fn().mockResolvedValue({ ok: true }) as never;

      await service.send('27821234567', 'Test message');

      const expectedAuth = `Basic ${Buffer.from('test-token-id:test-token-secret').toString('base64')}`;
      expect(global.fetch).toHaveBeenCalledWith(
        'https://api.bulksms.com/v1/messages',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({ Authorization: expectedAuth }),
        }),
      );
    });

    it('sends the verified request body shape — a JSON array with to[].address and body', async () => {
      global.fetch = jest.fn().mockResolvedValue({ ok: true }) as never;

      await service.send('27821234567', 'Test message');

      const [, options] = (global.fetch as jest.Mock).mock.calls[0];
      const body = JSON.parse(options.body);
      expect(body).toEqual([{ to: [{ address: '27821234567', type: 'INTERNATIONAL' }], body: 'Test message' }]);
    });

    it('returns true on a successful send', async () => {
      global.fetch = jest.fn().mockResolvedValue({ ok: true }) as never;
      const result = await service.send('27821234567', 'Test message');
      expect(result).toBe(true);
    });

    it('returns false, not a thrown error, on a non-OK response', async () => {
      global.fetch = jest.fn().mockResolvedValue({ ok: false, status: 401 }) as never;
      const result = await service.send('27821234567', 'Test message');
      expect(result).toBe(false);
    });

    it('returns false when the request errors entirely (network failure, timeout)', async () => {
      global.fetch = jest.fn().mockRejectedValue(new Error('network error')) as never;
      const result = await service.send('27821234567', 'Test message');
      expect(result).toBe(false);
    });

    it('returns false without calling fetch at all when not configured', async () => {
      config.BULKSMS_TOKEN_ID = undefined;
      global.fetch = jest.fn();

      const result = await service.send('27821234567', 'Test message');

      expect(result).toBe(false);
      expect(global.fetch).not.toHaveBeenCalled();
    });
  });
});
