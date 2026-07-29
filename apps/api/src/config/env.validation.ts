import * as Joi from 'joi';

// Without this, a missing KEYCLOAK_ISSUER_URL (for example) doesn't fail
// until the first authenticated request comes in and the JWKS client
// throws something cryptic deep in passport-jwt. Validating at boot turns
// a confusing runtime failure into an immediate, readable one: the process
// won't start at all, and the error names the exact missing variable.
export const envValidationSchema = Joi.object({
  NODE_ENV: Joi.string().valid('development', 'production', 'test').default('development'),
  PORT: Joi.number().default(3001),

  DATABASE_URL: Joi.string().uri().required(),

  KEYCLOAK_ISSUER_URL: Joi.string().uri().required(),
  KEYCLOAK_JWKS_URI: Joi.string().uri().required(),
  KEYCLOAK_AUDIENCE: Joi.string().required(),

  // Not required yet — trade-credit and notifications aren't wired into
  // any request path this codebase actually exercises today (see
  // docs/AGENTS.md's remaining-modules list).
  AI_SERVICE_URL: Joi.string().uri().optional(),

  // Optional — see src/instrument.ts. No Sentry project exists for this
  // codebase yet; error tracking is simply off until this is set.
  SENTRY_DSN: Joi.string().uri().optional(),

  // Consumed by PaymentsModule. Optional at the schema level so the app can
  // still boot without payment credentials configured (local dev, or any
  // environment not yet doing checkout) — PaymentsService.requireConfig()
  // throws a clear error at the moment a payment is actually attempted
  // without these set, rather than blocking every other feature's startup
  // on a module some environments won't use yet.
  PAYFAST_MERCHANT_ID: Joi.string().allow('').optional(),
  PAYFAST_MERCHANT_KEY: Joi.string().allow('').optional(),
  PAYFAST_PASSPHRASE: Joi.string().allow('').optional(),
  PAYFAST_MODE: Joi.string().valid('sandbox', 'production').default('sandbox'),

  // No real ShipLogic account exists for this project yet — same
  // situation as PayFast before real credentials existed. When unset,
  // ShippingService falls back to the flat placeholder delivery fee
  // rather than attempting a real rate quote (see ShipLogicService).
  SHIPLOGIC_API_KEY: Joi.string().allow('').optional(),
  // Bellwether's own collection/origin address for every rate quote —
  // real values, not placeholders, since a wrong "from" address would
  // make every quoted rate meaningless even with a real API key
  // configured. Required only alongside SHIPLOGIC_API_KEY in practice
  // (ShipLogicService checks both are present before calling out), but
  // kept optional at the schema level for the same local-dev-can-still-
  // boot reasoning as the PayFast vars above.
  WAREHOUSE_COMPANY: Joi.string().allow('').optional(),
  WAREHOUSE_STREET_ADDRESS: Joi.string().allow('').optional(),
  WAREHOUSE_LOCAL_AREA: Joi.string().allow('').optional(),
  WAREHOUSE_CITY: Joi.string().allow('').optional(),
  WAREHOUSE_ZONE: Joi.string().allow('').optional(), // province
  WAREHOUSE_POSTAL_CODE: Joi.string().allow('').optional(),

  // Real, stated fact (Bellwether's own legal entity name), not a
  // placeholder — see docs/AGENTS.md. Physical address and VAT number,
  // by contrast, are genuinely not known and left unconfigured by
  // default — see InvoiceService's own comment on why a document
  // generated without a real VAT number is deliberately NOT labeled a
  // "Tax Invoice" (a legal term with real requirements under South
  // African VAT law), rather than fabricating one just to fill the
  // field.
  INVOICE_COMPANY_NAME: Joi.string()
    .allow('')
    .optional()
    .default('Bellwether Systems & Water Engineering (Pty) Ltd'),
  INVOICE_COMPANY_ADDRESS: Joi.string().allow('').optional(),
  INVOICE_VAT_NUMBER: Joi.string().allow('').optional(),

  // No real BulkSMS account exists for this project yet — same situation
  // as every other third-party integration before real credentials
  // existed. When unset, SmsService.isConfigured() is false and SMS is
  // silently skipped (see NotificationsProcessor) — email still sends
  // either way, SMS is an addition, not a dependency.
  BULKSMS_TOKEN_ID: Joi.string().allow('').optional(),
  BULKSMS_TOKEN_SECRET: Joi.string().allow('').optional(),

  // Used to build PayFast's return_url/cancel_url (web) and notify_url
  // (api) — same requiredness reasoning as the PAYFAST_* vars above.
  PUBLIC_WEB_URL: Joi.string().uri().optional(),
  PUBLIC_API_URL: Joi.string().uri().optional(),

  REDIS_URL: Joi.string().uri().required(), // now actually required — the notifications queue depends on it, unlike before when it was provisioned but unused

  // Consumed by the worker process (src/worker.ts), not the API. 'log' is
  // the default and needs no further config — see
  // channels/log-notification.channel.ts. Only relevant when 'ses'.
  NOTIFICATION_CHANNEL: Joi.string().valid('log', 'ses').default('log'),
  AWS_SES_REGION: Joi.string().optional(),
  NOTIFICATIONS_FROM_ADDRESS: Joi.string().email().optional(),
});
