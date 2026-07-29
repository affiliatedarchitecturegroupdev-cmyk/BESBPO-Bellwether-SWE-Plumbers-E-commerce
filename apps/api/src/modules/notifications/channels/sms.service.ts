import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

// Endpoint, auth mechanism, and request body shape verified against
// BulkSMS.com's own published API specification (v1 JSON API — the EAPI
// is explicitly deprecated in their own docs) before writing any of
// this, cross-checked against an independent, actively-maintained
// third-party Node client for the same API confirming the same
// username/password Basic Auth mechanism. Not guessed at or
// pattern-matched from a generic SMS gateway shape — same research
// discipline as ShipLogicService.
//
// BulkSMS.com is South African in origin, long-established, with real
// reach into South African mobile networks — chosen for consistency with
// every other real integration in this codebase being SA-first
// (PayFast, ShipLogic), not because it's the only option.
@Injectable()
export class SmsService {
  private readonly logger = new Logger(SmsService.name);
  private static readonly MESSAGES_URL = 'https://api.bulksms.com/v1/messages';

  constructor(private readonly config: ConfigService) {}

  isConfigured(): boolean {
    return (
      Boolean(this.config.get<string>('BULKSMS_TOKEN_ID')) && Boolean(this.config.get<string>('BULKSMS_TOKEN_SECRET'))
    );
  }

  // Returns true/false rather than throwing — an SMS failure should
  // never break whatever triggered it (see NotificationsProcessor,
  // which sends SMS as a best-effort addition alongside email, not a
  // replacement for it). Silently does nothing and returns false when
  // not configured, same graceful-degradation shape as every other
  // optional integration in this codebase.
  async send(toMsisdn: string, body: string): Promise<boolean> {
    const tokenId = this.config.get<string>('BULKSMS_TOKEN_ID');
    const tokenSecret = this.config.get<string>('BULKSMS_TOKEN_SECRET');
    if (!tokenId || !tokenSecret) return false;

    try {
      const response = await fetch(SmsService.MESSAGES_URL, {
        method: 'POST',
        headers: {
          // BulkSMS.com's "API token" feature is a scoped username/password
          // pair used exactly like account credentials would be — Basic
          // Auth either way, per their own spec.
          Authorization: `Basic ${Buffer.from(`${tokenId}:${tokenSecret}`).toString('base64')}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify([
          {
            to: [{ address: toMsisdn, type: 'INTERNATIONAL' }],
            body,
          },
        ]),
        signal: AbortSignal.timeout(8000),
      });

      if (!response.ok) {
        this.logger.warn(`BulkSMS send failed: HTTP ${response.status}`);
        return false;
      }
      return true;
    } catch (err) {
      this.logger.warn(`BulkSMS send errored: ${err}`);
      return false;
    }
  }
}
