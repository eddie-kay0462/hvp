import dotenv from 'dotenv';

dotenv.config();

/**
 * paystack — full Paystack initialize/verify
 * momo_manual — Hustle Village MoMo number + buyer submits proof; admin verifies
 */
export const VALID_PAYMENT_PROVIDERS = ['momo_manual', 'paystack'];

/**
 * Providers whose payout path is implemented end to end.
 *
 * paystack is deliberately absent: releasePayment and refundPayment are still
 * stubs there (see paymentService.js), so a booking can be paid but never
 * completed or paid out.
 */
const PROVIDERS_WITH_PAYOUT = new Set(['momo_manual']);

/**
 * Resolves the configured provider.
 *
 * This used to fall back to 'paystack' when PAYMENT_PROVIDER was unset, which
 * meant a box that simply forgot the variable ran in a mode where releasing
 * money to vendors is unimplemented — buyers got a 501 on confirming
 * completion, auto-release retried forever, and nothing said why. There is no
 * safe default to guess at here, so an unset or unrecognised value is a
 * configuration error.
 *
 * @throws {Error} if PAYMENT_PROVIDER is unset or not a recognised value
 */
export function getPaymentProvider() {
  const raw = process.env.PAYMENT_PROVIDER?.trim().toLowerCase();

  if (!raw) {
    throw new Error(
      `PAYMENT_PROVIDER is not set. Set it to one of: ${VALID_PAYMENT_PROVIDERS.join(', ')}.`
    );
  }

  if (!VALID_PAYMENT_PROVIDERS.includes(raw)) {
    throw new Error(
      `PAYMENT_PROVIDER="${raw}" is not recognised. Expected one of: ${VALID_PAYMENT_PROVIDERS.join(', ')}.`
    );
  }

  return raw;
}

export function isMomoManualMode() {
  return getPaymentProvider() === 'momo_manual';
}

/**
 * Validates payment configuration at startup, so a misconfigured deployment
 * fails immediately and visibly rather than at the moment a buyer tries to
 * confirm a booking. Returns the resolved provider.
 *
 * @param {{ error: Function, warn: Function, info: Function }} log
 */
export function assertPaymentProviderConfigured(log = console) {
  const provider = getPaymentProvider();

  if (!PROVIDERS_WITH_PAYOUT.has(provider)) {
    log.warn(
      `[payments] PAYMENT_PROVIDER="${provider}": paying vendors out is not implemented for this ` +
        `provider. Buyers will be blocked from confirming completion and no payouts can be made.`
    );
  } else {
    log.info(`[payments] provider: ${provider}`);
  }

  return provider;
}
