import { test, beforeEach } from 'node:test';
import assert from 'node:assert/strict';

const { getPaymentProvider, isMomoManualMode, assertPaymentProviderConfigured } = await import(
  '../src/config/paymentMode.js'
);

beforeEach(() => {
  delete process.env.PAYMENT_PROVIDER;
});

// There is no safe default: falling back to paystack meant a box that forgot the
// variable ran in a mode where paying vendors out is unimplemented, and nothing
// surfaced that until a buyer tried to confirm a booking.
test('getPaymentProvider throws when PAYMENT_PROVIDER is unset', () => {
  assert.throws(() => getPaymentProvider(), /not set/i);
});

test('getPaymentProvider throws on an unrecognised value rather than falling back', () => {
  process.env.PAYMENT_PROVIDER = 'momo-manual'; // hyphen, not underscore
  assert.throws(() => getPaymentProvider(), /not recognised/i);
});

test('getPaymentProvider is case-insensitive and trims whitespace', () => {
  process.env.PAYMENT_PROVIDER = '  MoMo_Manual  ';
  assert.equal(getPaymentProvider(), 'momo_manual');
});

test('isMomoManualMode true only for the momo_manual provider', () => {
  process.env.PAYMENT_PROVIDER = 'momo_manual';
  assert.equal(isMomoManualMode(), true);

  process.env.PAYMENT_PROVIDER = 'paystack';
  assert.equal(isMomoManualMode(), false);
});

test('startup check warns for a provider that cannot pay vendors out', () => {
  process.env.PAYMENT_PROVIDER = 'paystack';
  const warnings = [];
  const log = { info: () => {}, warn: (m) => warnings.push(m), error: () => {} };

  assert.equal(assertPaymentProviderConfigured(log), 'paystack');
  assert.equal(warnings.length, 1);
  assert.match(warnings[0], /not implemented/i);
});

test('startup check passes quietly for a provider with a working payout path', () => {
  process.env.PAYMENT_PROVIDER = 'momo_manual';
  const warnings = [];
  const log = { info: () => {}, warn: (m) => warnings.push(m), error: () => {} };

  assert.equal(assertPaymentProviderConfigured(log), 'momo_manual');
  assert.equal(warnings.length, 0);
});

test('startup check propagates the configuration error when unset', () => {
  const log = { info: () => {}, warn: () => {}, error: () => {} };
  assert.throws(() => assertPaymentProviderConfigured(log), /not set/i);
});
