import { test, beforeEach } from 'node:test';
import assert from 'node:assert/strict';

// authService imports config/supabase.js — give it dummy env before loading.
process.env.SUPABASE_URL ||= 'http://localhost:54321';
process.env.SUPABASE_ANON_KEY ||= 'test-anon-key';

const { getAuthEmailRedirectOrigin, isExistingEmailSignup } = await import(
  '../src/services/authService.js'
);

beforeEach(() => {
  // Make the fallback deterministic (default = https://hustlevillage.app).
  delete process.env.AUTH_SITE_URL;
  delete process.env.FRONTEND_URL;
});

const DEFAULT_ORIGIN = 'https://hustlevillage.app';

test('trusted origins are echoed back unchanged', () => {
  for (const origin of [
    'http://localhost:8080',
    'http://localhost:5173',
    'http://localhost:3000',
    'https://hustlevillage.app',
    'https://www.hustlevillage.app',
    'https://staging.hustlevillage.app',
  ]) {
    assert.equal(getAuthEmailRedirectOrigin(origin), origin, `${origin} should be trusted`);
  }
});

test('untrusted / attacker-controlled origins fall back, never echo (no open redirect)', () => {
  for (const origin of [
    'https://evil.com',
    'https://hustlevillage.app.evil.com', // suffix attack
    'https://evilhustlevillage.app', // prefix attack
    'http://hustlevillage.app', // wrong scheme for the apex
    'https://sub.staging.hustlevillage.app', // deeper subdomain not allowlisted
    'http://localhost.evil.com',
  ]) {
    assert.equal(
      getAuthEmailRedirectOrigin(origin),
      DEFAULT_ORIGIN,
      `${origin} must NOT be echoed back`,
    );
  }
});

test('missing origin falls back to the configured site URL', () => {
  assert.equal(getAuthEmailRedirectOrigin(undefined), DEFAULT_ORIGIN);
  assert.equal(getAuthEmailRedirectOrigin(''), DEFAULT_ORIGIN);
});

test('fallback prefers AUTH_SITE_URL, then FRONTEND_URL, and adds https:// when missing', () => {
  process.env.FRONTEND_URL = 'example.com';
  assert.equal(getAuthEmailRedirectOrigin(undefined), 'https://example.com');

  process.env.AUTH_SITE_URL = 'https://app.example.com';
  assert.equal(getAuthEmailRedirectOrigin(undefined), 'https://app.example.com');
});

test('isExistingEmailSignup detects the empty-identities duplicate-email response', () => {
  // Supabase returns an obfuscated user with identities: [] for an existing email.
  assert.equal(isExistingEmailSignup({ id: 'fabricated', identities: [] }), true);
  // A genuinely new signup has a populated identities array.
  assert.equal(isExistingEmailSignup({ id: 'real', identities: [{ provider: 'email' }] }), false);
  // Missing / malformed identities must not be treated as a duplicate.
  assert.equal(isExistingEmailSignup({ id: 'real' }), false);
  assert.equal(isExistingEmailSignup(null), false);
  assert.equal(isExistingEmailSignup(undefined), false);
});
