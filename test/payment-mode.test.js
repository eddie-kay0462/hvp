import { test, beforeEach } from 'node:test';
import assert from 'node:assert/strict';

const { getPaymentProvider, isMomoManualMode } = await import('../src/config/paymentMode.js');

beforeEach(() => {
  delete process.env.PAYMENT_PROVIDER;
});

test('getPaymentProvider defaults to paystack when unset', () => {
  assert.equal(getPaymentProvider(), 'paystack');
  assert.equal(isMomoManualMode(), false);
});

test('getPaymentProvider is case-insensitive', () => {
  process.env.PAYMENT_PROVIDER = 'MoMo_Manual';
  assert.equal(getPaymentProvider(), 'momo_manual');
});

test('isMomoManualMode true only for the momo_manual provider', () => {
  process.env.PAYMENT_PROVIDER = 'momo_manual';
  assert.equal(isMomoManualMode(), true);

  process.env.PAYMENT_PROVIDER = 'paystack';
  assert.equal(isMomoManualMode(), false);
});
