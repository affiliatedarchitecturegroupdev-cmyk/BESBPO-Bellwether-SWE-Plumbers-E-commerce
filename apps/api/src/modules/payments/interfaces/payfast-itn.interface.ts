// Every field PayFast's ITN POST can carry arrives as a string — it's a
// application/x-www-form-urlencoded body, there's no native typing. Only
// the fields this integration actually reads are declared; PayFast sends
// more (custom_str1-5, custom_int1-5, etc.) that pass through untyped.
export interface PayfastItnPayload {
  m_payment_id: string; // set to Order.id at checkout time — the correlation key back to our order
  pf_payment_id: string; // PayFast's own transaction id
  payment_status: string; // 'COMPLETE' | 'FAILED' | others — compared as a string, not an enum, since it's PayFast's vocabulary, not ours
  amount_gross: string;
  merchant_id: string;
  signature: string;
  [key: string]: string | undefined;
}

export interface PayfastCheckoutFields {
  merchant_id: string;
  merchant_key: string;
  return_url: string;
  cancel_url: string;
  notify_url: string;
  name_first: string;
  name_last: string;
  email_address: string;
  m_payment_id: string;
  amount: string;
  item_name: string;
  item_description: string;
  signature: string;
}
