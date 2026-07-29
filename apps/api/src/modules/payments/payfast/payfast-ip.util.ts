import { Logger } from '@nestjs/common';
import { promises as dns } from 'dns';

const logger = new Logger('PayfastIpValidation');

// PayFast's own integration guide resolves these hostnames at request time
// rather than shipping a static IP list — deliberately followed here for
// the same reason they recommend it: PayFast's IP ranges have changed more
// than once (documented incidents of ITNs being silently rejected after an
// unannounced range change), and a hardcoded list would need updating
// every time that happens. DNS resolution is the intended way to stay
// current without a code change.
const PAYFAST_HOSTNAMES = ['www.payfast.co.za', 'sandbox.payfast.co.za', 'w1w.payfast.co.za', 'w2w.payfast.co.za'];

export async function isValidPayfastSourceIp(sourceIp: string): Promise<boolean> {
  const validIps = new Set<string>();

  await Promise.all(
    PAYFAST_HOSTNAMES.map(async (hostname) => {
      try {
        const addresses = await dns.resolve4(hostname);
        addresses.forEach((ip) => validIps.add(ip));
      } catch (err) {
        // A single hostname failing to resolve (transient DNS issue, one
        // of the four being briefly unreachable) shouldn't fail the whole
        // check — the other hostnames may still cover the real source IP.
        logger.warn(`Could not resolve ${hostname} while validating PayFast source IP: ${err}`);
      }
    }),
  );

  // IPv4-mapped IPv6 addresses (::ffff:1.2.3.4) are common behind proxies —
  // Render sits in front of this service, so normalize before comparing.
  const normalizedIp = sourceIp.replace(/^::ffff:/, '');
  return validIps.has(normalizedIp);
}
