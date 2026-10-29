import { test, beforeEach } from 'node:test';
import assert from 'node:assert/strict';

const { parseCampusSiteUrls, getCampusSiteUrl } = await import('../src/config/campusSites.js');

beforeEach(() => {
  delete process.env.CAMPUS_SITE_URLS;
});

test('parses slug=url pairs and strips trailing slashes', () => {
  assert.deepEqual(
    parseCampusSiteUrls(' ashesi=https://ashesi.hustlevillage.app/ , knust=https://knust.hustlevillage.app'),
    { ashesi: 'https://ashesi.hustlevillage.app', knust: 'https://knust.hustlevillage.app' }
  );
});

test('ignores malformed entries rather than producing bad email links', () => {
  assert.deepEqual(
    parseCampusSiteUrls('Ashesi=https://x.app,ashesi=javascript:alert(1),ashesi,=https://x.app,ug=https://x.app/path'),
    {}
  );
  assert.deepEqual(parseCampusSiteUrls(undefined), {});
});

// Unset means emails keep linking to FRONTEND_URL, exactly as before.
test('getCampusSiteUrl returns null when unset or for an unknown campus', () => {
  assert.equal(getCampusSiteUrl('ashesi'), null);
  process.env.CAMPUS_SITE_URLS = 'ashesi=https://ashesi-staging.hustlevillage.app';
  assert.equal(getCampusSiteUrl('ashesi'), 'https://ashesi-staging.hustlevillage.app');
  assert.equal(getCampusSiteUrl('knust'), null);
});
