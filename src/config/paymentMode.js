import dotenv from 'dotenv';

dotenv.config();

/**
 * paystack — full Paystack initialize/verify (default for existing deployments)
 * momo_manual — Hustle Village MoMo number + buyer submits proof; admin verifies
 */
export function getPaymentProvider() {
  return (process.env.PAYMENT_PROVIDER || 'paystack').toLowerCase();
}

export function isMomoManualMode() {
  return getPaymentProvider() === 'momo_manual';
}
