import { test } from 'node:test';
import assert from 'node:assert/strict';

const {
  isValidCommunitySlug,
  normalizeWhatsapp,
  normalizeInstagram,
  normalizeWebUrl,
  validateContactInput,
  validatePortfolioInput,
  portfolioImagePrefix,
  PORTFOLIO_MAX_IMAGES,
} = await import('../src/services/vendorProfileValidation.js');

const USER = '11111111-1111-1111-1111-111111111111';
const OTHER = '22222222-2222-2222-2222-222222222222';
const SUPABASE_URL = 'https://abc.supabase.co/';
const opts = { userId: USER, supabaseUrl: SUPABASE_URL };
const ownImage = (name) => `${portfolioImagePrefix(SUPABASE_URL, USER)}${name}`;

test('community slugs: lowercase words joined by single hyphens', () => {
  for (const ok of ['ashesi', 'knust', 'ug-legon', 'a1']) assert.ok(isValidCommunitySlug(ok), ok);
  for (const bad of ['Ashesi', 'ug_legon', '-ashesi', 'ashesi-', 'a--b', '', ' ashesi', '../x', null]) {
    assert.ok(!isValidCommunitySlug(bad), String(bad));
  }
});

test('WhatsApp: Ghana local numbers become +233, other formats keep their digits', () => {
  assert.equal(normalizeWhatsapp('0241234567'), '233241234567');
  assert.equal(normalizeWhatsapp('+233 24 123 4567'), '233241234567');
  assert.equal(normalizeWhatsapp('233-24-123-4567'), '233241234567');
  assert.equal(normalizeWhatsapp('+1 (415) 555-0100'), '14155550100');
  assert.equal(normalizeWhatsapp('12345'), null);
  assert.equal(normalizeWhatsapp('1234567890123456'), null);
});

test('Instagram: accepts @handle, handle or profile URL; rejects junk', () => {
  assert.equal(normalizeInstagram('@ashesi.designs'), 'ashesi.designs');
  assert.equal(normalizeInstagram('ashesi_designs'), 'ashesi_designs');
  assert.equal(normalizeInstagram('https://www.instagram.com/ashesi.designs/?hl=en'), 'ashesi.designs');
  assert.equal(normalizeInstagram('instagram.com/ashesi'), 'ashesi');
  assert.equal(normalizeInstagram('has space'), null);
  assert.equal(normalizeInstagram('a'.repeat(31)), null);
});

test('web URLs: http(s) only, https:// added when missing', () => {
  assert.equal(normalizeWebUrl('mysite.com'), 'https://mysite.com/');
  assert.equal(normalizeWebUrl('http://mysite.com/work'), 'http://mysite.com/work');
  for (const bad of ['javascript:alert(1)', 'ftp://x.com', 'data:text/html,hi', 'localhost', 'https://']) {
    assert.equal(normalizeWebUrl(bad), null, bad);
  }
});

test('contact input: only sent fields are written, blanks clear a field', () => {
  const { data, error } = validateContactInput({
    whatsapp_number: '0241234567',
    contact_email: ' Me@Example.COM ',
    instagram_handle: '',
    website_url: null,
  });
  assert.equal(error, null);
  assert.deepEqual(data, {
    whatsapp_number: '233241234567',
    contact_email: 'me@example.com',
    instagram_handle: null,
    website_url: null,
  });
});

test('contact input: rejects bad values and empty requests', () => {
  assert.match(validateContactInput({ contact_email: 'not-an-email' }).error, /email/i);
  assert.match(validateContactInput({ website_url: 'javascript:alert(1)' }).error, /website/i);
  assert.match(validateContactInput({ bio: 'x'.repeat(1001) }).error, /bio/i);
  assert.match(validateContactInput({}).error, /no contact fields/i);
  // Unknown keys are ignored, not written (no mass assignment).
  assert.match(validateContactInput({ is_verified: true, user_id: OTHER }).error, /no contact fields/i);
});

test('portfolio create: requires a title and trims it', () => {
  assert.match(validatePortfolioInput({}, opts).error, /title is required/i);
  assert.match(validatePortfolioInput({ title: '   ' }, opts).error, /title is required/i);
  assert.match(validatePortfolioInput({ title: 'x'.repeat(121) }, opts).error, /120/);
  assert.deepEqual(validatePortfolioInput({ title: '  Logo for Ashesi SRC ' }, opts).data, {
    title: 'Logo for Ashesi SRC',
  });
});

test('portfolio update: title optional, but something must change', () => {
  const partial = { ...opts, partial: true };
  assert.deepEqual(validatePortfolioInput({ position: 2 }, partial).data, { position: 2 });
  assert.match(validatePortfolioInput({}, partial).error, /no fields/i);
  assert.match(validatePortfolioInput({ title: '' }, partial).error, /title is required/i);
});

test('portfolio images: only this user’s uploads in our bucket', () => {
  assert.equal(validatePortfolioInput({ title: 't', image_urls: [ownImage('a.jpg')] }, opts).error, null);

  for (const bad of [
    'https://evil.com/a.jpg',
    `${portfolioImagePrefix(SUPABASE_URL, OTHER)}a.jpg`, // another vendor's folder
    `${portfolioImagePrefix(SUPABASE_URL, USER)}../${OTHER}/a.jpg`, // path traversal
    'https://abc.supabase.co/storage/v1/object/public/service-images/' + USER + '/a.jpg', // wrong bucket
  ]) {
    assert.match(validatePortfolioInput({ title: 't', image_urls: [bad] }, opts).error, /uploaded/i, bad);
  }

  const tooMany = Array.from({ length: PORTFOLIO_MAX_IMAGES + 1 }, (_, i) => ownImage(`${i}.jpg`));
  assert.match(validatePortfolioInput({ title: 't', image_urls: tooMany }, opts).error, /at most/i);
  assert.match(validatePortfolioInput({ title: 't', image_urls: 'a.jpg' }, opts).error, /list/i);
});

test('portfolio dates, links and positions', () => {
  const check = (body) => validatePortfolioInput({ title: 't', ...body }, opts);
  assert.equal(check({ completed_on: '2026-05-31' }).data.completed_on, '2026-05-31');
  assert.match(check({ completed_on: '2026-02-30' }).error, /date/i);
  assert.match(check({ completed_on: '31/05/2026' }).error, /date/i);
  assert.equal(check({ completed_on: '' }).data.completed_on, null);

  assert.equal(check({ link_url: 'behance.net/me' }).data.link_url, 'https://behance.net/me');
  assert.match(check({ link_url: 'javascript:alert(1)' }).error, /link/i);

  assert.match(check({ position: -1 }).error, /position/i);
  assert.match(check({ position: 1.5 }).error, /position/i);
});
