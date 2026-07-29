import { createHash } from 'crypto';

// PayFast's signature algorithm has two easy-to-get-wrong details that
// account for most real-world integration bugs (confirmed by PayFast's own
// support docs and multiple public "signature mismatch" post-mortems):
//
// 1. Field order for the CHECKOUT signature (the redirect-to-pay form) is
//    NOT alphabetical — it's the order PayFast declares in their docs.
//    Alphabetical order is only for their separate REST API signature.
//    Getting this backwards is the single most common cause of "Signature
//    mismatch" errors.
// 2. Encoding must exactly match PHP's urlencode(), which targets
//    application/x-www-form-urlencoded — not JavaScript's
//    encodeURIComponent(), which is RFC 3986 and disagrees on several
//    characters. Concretely: spaces become '+' (not '%20'), and
//    ! ' ( ) * ~ get percent-encoded (encodeURIComponent leaves all six of
//    those as literal characters, since they're RFC 3986 "unreserved").
//    payfastEncode() below uses URLSearchParams, which already matches
//    form-urlencoded rules for everything except '*' — verified against
//    PHP's documented urlencode() output for a string containing all of
//    !'()*~, space, and several reserved characters (see the conversation
//    this was built in for the worked verification; the '*' gap is the one
//    character URLSearchParams still gets wrong, hence the explicit
//    .replace below).
export function payfastEncode(value: string): string {
  const encoded = new URLSearchParams({ v: value.trim() }).toString().slice('v='.length);
  return encoded.replace(/\*/g, '%2A');
}

// Accepts entries in the exact order they should appear in the signature
// base string — callers control order explicitly (an array of tuples, not
// an object) so there's no risk of a future refactor accidentally changing
// field order via object-key reordering.
export function buildParameterString(entries: [string, string][], passphrase?: string): string {
  const nonBlank = entries.filter(([, value]) => value !== '' && value !== undefined && value !== null);
  const pairs = nonBlank.map(([key, value]) => `${key}=${payfastEncode(String(value))}`);

  if (passphrase) {
    pairs.push(`passphrase=${payfastEncode(passphrase)}`);
  }

  return pairs.join('&');
}

export function generatePayfastSignature(entries: [string, string][], passphrase?: string): string {
  const parameterString = buildParameterString(entries, passphrase);
  return createHash('md5').update(parameterString).digest('hex');
}

// PayFast's Refunds API (api.payfast.co.za) is a different surface from the
// checkout/ITN flow above — different base URL, different auth (custom
// headers instead of form fields), and critically: ALPHABETICAL field
// order for its signature, not the declared order CHECKOUT_SIGNATURE_FIELD_ORDER
// uses. This is exactly the distinction flagged in the comment at the top
// of this file ("alphabetical ordering is only for their separate REST
// API") — it wasn't needed until the refund API, so it's implemented here
// rather than left theoretical. Reuses generatePayfastSignature/
// buildParameterString as-is; only the entries' order differs.
export function generateApiSignature(fields: Record<string, string>, passphrase?: string): string {
  const sortedEntries = Object.entries(fields).sort(([a], [b]) => a.localeCompare(b));
  return generatePayfastSignature(sortedEntries, passphrase);
}

// The order PayFast's own checkout documentation declares fields in for
// signature purposes — see the file-level comment above. Only the subset
// this integration actually sends (once-off payments, no subscriptions) is
// listed; the full order also includes cell_number and various
// custom_int/custom_str and recurring-billing fields this codebase doesn't
// use yet.
export const CHECKOUT_SIGNATURE_FIELD_ORDER = [
  'merchant_id',
  'merchant_key',
  'return_url',
  'cancel_url',
  'notify_url',
  'name_first',
  'name_last',
  'email_address',
  'm_payment_id',
  'amount',
  'item_name',
  'item_description',
] as const;
