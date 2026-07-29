import { substitutePlaceholders } from './notification.substitute';

describe('substitutePlaceholders', () => {
  it('replaces a known placeholder with its context value', () => {
    expect(substitutePlaceholders('Order {{orderNumber}} confirmed', { orderNumber: 'BSWE-1' })).toBe(
      'Order BSWE-1 confirmed',
    );
  });

  it('replaces multiple different placeholders in the same template', () => {
    const result = substitutePlaceholders('{{a}} and {{b}}', { a: 'first', b: 'second' });
    expect(result).toBe('first and second');
  });

  it('replaces every occurrence of a repeated placeholder, not just the first', () => {
    const result = substitutePlaceholders('{{name}}, {{name}}, {{name}}', { name: 'x' });
    expect(result).toBe('x, x, x');
  });

  it('leaves an unknown placeholder literally in place — a typo or wrong-type reference should be visible, not silently blank', () => {
    const result = substitutePlaceholders('Hello {{doesNotExist}}', { orderNumber: 'BSWE-1' });
    expect(result).toBe('Hello {{doesNotExist}}');
  });

  it('leaves plain text with no placeholders completely unchanged', () => {
    expect(substitutePlaceholders('No placeholders here', {})).toBe('No placeholders here');
  });

  it('substitutes an empty-string context value correctly, not treating it as "unknown"', () => {
    const result = substitutePlaceholders('Tracking:{{trackingLine}}', { trackingLine: '' });
    expect(result).toBe('Tracking:');
  });
});
