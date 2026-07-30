import { test } from 'node:test';
import assert from 'node:assert/strict';

// config/supabase.js throws without env and instantiates a real client. Set
// dummy env BEFORE importing so the module loads without touching prod.
process.env.SUPABASE_URL ||= 'http://localhost:54321';
process.env.SUPABASE_ANON_KEY ||= 'test-anon-key';

const { SELLER_BUSY_STATUSES } = await import('../src/services/bookingService.js');
const { assertBuyerCanPayBooking } = await import('../src/services/momoPaymentService.js');

// The bug this guards against: 'pending' was in the busy set, so a single booking
// the seller never answered took their service off the market for every other
// buyer, with no expiry and no way for the blocked buyers to clear it.
test('a status that makes a seller busy must be one the buyer can advance', () => {
  for (const status of SELLER_BUSY_STATUSES) {
    assert.equal(
      assertBuyerCanPayBooking({ status }),
      null,
      `'${status}' blocks other buyers but the buyer cannot pay to move it along — ` +
        `it would strand the service`
    );
  }
});

test('an unanswered booking does not make the seller unavailable', () => {
  assert.ok(!SELLER_BUSY_STATUSES.includes('pending'));
});

test('terminal statuses never make a seller unavailable', () => {
  for (const status of ['completed', 'cancelled']) {
    assert.ok(!SELLER_BUSY_STATUSES.includes(status), `'${status}' must not block new bookings`);
  }
});
