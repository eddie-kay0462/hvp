import { test } from 'node:test';
import assert from 'node:assert/strict';

// config/supabase.js throws without env and instantiates a real client. Set
// dummy env BEFORE importing so the module loads without touching prod.
process.env.SUPABASE_URL ||= 'http://localhost:54321';
process.env.SUPABASE_ANON_KEY ||= 'test-anon-key';

const { assertBuyerCanPayBooking, resolveBuyerOwnsBooking } = await import(
  '../src/services/momoPaymentService.js'
);

test('assertBuyerCanPayBooking allows the paid-eligible statuses', () => {
  for (const status of ['accepted', 'in_progress', 'delivered']) {
    assert.equal(assertBuyerCanPayBooking({ status }), null, `${status} should be payable`);
  }
});

test('assertBuyerCanPayBooking blocks a pending booking with an accept-first message', () => {
  const r = assertBuyerCanPayBooking({ status: 'pending' });
  assert.equal(r.status, 400);
  assert.match(r.msg, /accept/i);
});

test('assertBuyerCanPayBooking blocks a cancelled booking', () => {
  const r = assertBuyerCanPayBooking({ status: 'cancelled' });
  assert.equal(r.status, 400);
  assert.match(r.msg, /cancelled/i);
});

test('assertBuyerCanPayBooking blocks unknown/terminal statuses and null generically', () => {
  assert.equal(assertBuyerCanPayBooking({ status: 'completed' }).status, 400);
  assert.equal(assertBuyerCanPayBooking(null).status, 400);
});

test('resolveBuyerOwnsBooking is true only when buyer_id equals the auth user id', () => {
  assert.equal(resolveBuyerOwnsBooking(null, 'user-1', { buyer_id: 'user-1' }), true);
  assert.equal(resolveBuyerOwnsBooking(null, 'user-1', { buyer_id: 'user-2' }), false);
  assert.equal(resolveBuyerOwnsBooking(null, 'user-1', {}), false);
});

test('resolveBuyerOwnsBooking rejects missing ids (no undefined === undefined match)', () => {
  assert.equal(resolveBuyerOwnsBooking(null, undefined, { buyer_id: undefined }), false);
  assert.equal(resolveBuyerOwnsBooking(null, undefined, {}), false);
  assert.equal(resolveBuyerOwnsBooking(null, '', { buyer_id: '' }), false);
});
