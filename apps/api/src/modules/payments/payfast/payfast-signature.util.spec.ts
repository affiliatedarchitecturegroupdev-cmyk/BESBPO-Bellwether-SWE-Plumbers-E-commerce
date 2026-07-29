import { payfastEncode, buildParameterString, generatePayfastSignature } from './payfast-signature.util';

describe('payfastEncode', () => {
  it('encodes spaces as + (form-urlencoded), not %20 (RFC 3986)', () => {
    expect(payfastEncode('test product')).toBe('test+product');
  });

  it('percent-encodes characters encodeURIComponent leaves alone: ! \' ( ) * ~', () => {
    // This is the exact case that breaks naive encodeURIComponent-based
    // implementations — verified against PHP urlencode()'s documented
    // behavior before this test was written, not assumed.
    expect(payfastEncode("test value!'()*~:/?&=")).toBe(
      'test+value%21%27%28%29%2A%7E%3A%2F%3F%26%3D',
    );
  });

  it('leaves alphanumerics and -_. unescaped', () => {
    expect(payfastEncode('abc-123_test.com')).toBe('abc-123_test.com');
  });
});

describe('buildParameterString', () => {
  it('joins entries in the exact order given, not alphabetically', () => {
    const result = buildParameterString([
      ['z_field', '1'],
      ['a_field', '2'],
    ]);
    expect(result).toBe('z_field=1&a_field=2');
  });

  it('excludes blank values entirely, rather than including them empty', () => {
    const result = buildParameterString([
      ['name_first', 'John'],
      ['name_last', ''],
      ['email_address', 'john@example.com'],
    ]);
    expect(result).toBe('name_first=John&email_address=john%40example.com');
  });

  it('appends the passphrase last, when provided', () => {
    const result = buildParameterString([['amount', '100.00']], 'secret pass');
    expect(result).toBe('amount=100.00&passphrase=secret+pass');
  });

  it('omits the passphrase segment entirely when none is provided', () => {
    const result = buildParameterString([['amount', '100.00']]);
    expect(result).toBe('amount=100.00');
  });
});

describe('generatePayfastSignature', () => {
  it('produces a 32-character lowercase hex MD5 digest', () => {
    const signature = generatePayfastSignature([['merchant_id', '10000100']]);
    expect(signature).toMatch(/^[a-f0-9]{32}$/);
  });

  it('produces a stable, verified signature for a known parameter set', () => {
    // Value confirmed by running this exact algorithm standalone before
    // committing this test — see the conversation this module was built
    // in. If this ever fails, the algorithm changed; check that against
    // PayFast's docs before assuming the test is wrong.
    const entries: [string, string][] = [
      ['merchant_id', '10000100'],
      ['merchant_key', '46f0cd694581a'],
      ['return_url', 'https://bellwetherswe.shop/checkout/success'],
      ['cancel_url', 'https://bellwetherswe.shop/checkout/cancelled'],
      ['notify_url', 'https://api.bellwetherswe.shop/v1/payments/payfast/notify'],
      ['name_first', 'John'],
      ['name_last', 'Doe'],
      ['email_address', 'john@example.com'],
      ['m_payment_id', 'order-uuid-123'],
      ['amount', '150.00'],
      ['item_name', 'Bellwether SWE Order'],
    ];
    expect(generatePayfastSignature(entries)).toBe('4ce8dbd485e72649ff676162256c3e77');
    expect(generatePayfastSignature(entries, 'testpass123')).toBe('6bf8d40d21aceabac4fe7cae46cfa0b4');
  });

  it('different field order produces a different signature — order is significant', () => {
    const a = generatePayfastSignature([
      ['amount', '100.00'],
      ['item_name', 'Widget'],
    ]);
    const b = generatePayfastSignature([
      ['item_name', 'Widget'],
      ['amount', '100.00'],
    ]);
    expect(a).not.toBe(b);
  });
});
