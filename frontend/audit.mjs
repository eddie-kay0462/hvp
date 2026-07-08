import { chromium } from 'playwright';
import fs from 'fs';

const BASE = 'http://localhost:8081';
const OUT  = '/tmp/mobile-audit/screenshots';

const VIEWPORTS = [
  { name: 'iphone-se',   width: 375, height: 667 },
  { name: 'iphone-14',   width: 390, height: 844 },
  { name: 'android-412', width: 412, height: 915 },
];

const PAGES = [
  { name: '01-landing',            path: '/' },
  { name: '02-services',           path: '/services' },
  { name: '03-login',              path: '/login' },
  { name: '04-signup',             path: '/signup' },
  { name: '05-messages',           path: '/messages' },
  { name: '06-bookings',           path: '/my-bookings' },
  { name: '07-profile',            path: '/profile' },
  { name: '08-seller-dashboard',   path: '/seller/dashboard' },
  { name: '09-seller-services',    path: '/seller/services' },
  { name: '10-seller-bookings',    path: '/seller/bookings' },
];

async function audit() {
  const browser = await chromium.launch({ headless: true });
  const findings = [];

  for (const vp of VIEWPORTS) {
    console.log(`\n=== ${vp.name} (${vp.width}×${vp.height}) ===`);

    const ctx = await browser.newContext({
      viewport: { width: vp.width, height: vp.height },
      userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1',
      deviceScaleFactor: 2,
      isMobile: true,
      hasTouch: true,
    });
    const page = await ctx.newPage();

    // Capture console errors
    const consoleErrors = [];
    page.on('console', msg => { if (msg.type() === 'error') consoleErrors.push(msg.text()); });
    page.on('pageerror', err => consoleErrors.push(`PAGE ERROR: ${err.message}`));

    for (const pg of PAGES) {
      try {
        await page.goto(`${BASE}${pg.path}`, { waitUntil: 'networkidle', timeout: 12000 });
        await page.waitForTimeout(800);

        const slug = `${pg.name}--${vp.name}`;
        const screenshotPath = `${OUT}/${slug}.png`;
        await page.screenshot({ path: screenshotPath, fullPage: true });

        // --- Measure overflow ---
        const overflowInfo = await page.evaluate(() => {
          const body = document.body;
          const html = document.documentElement;
          const bodyW = body.scrollWidth;
          const viewW = window.innerWidth;
          const overflowX = bodyW > viewW + 2;
          // Find elements wider than viewport
          const allEls = [...document.querySelectorAll('*')];
          const offenders = allEls
            .filter(el => {
              const r = el.getBoundingClientRect();
              return r.right > viewW + 5 && r.width > 0;
            })
            .slice(0, 5)
            .map(el => ({
              tag: el.tagName,
              class: el.className?.toString().slice(0, 60),
              right: Math.round(el.getBoundingClientRect().right),
              width: Math.round(el.getBoundingClientRect().width),
            }));
          return { overflowX, bodyScrollWidth: bodyW, viewportWidth: viewW, offenders };
        });

        // --- Tap target sizes ---
        const tapTargets = await page.evaluate(() => {
          const interactive = [...document.querySelectorAll('a, button, [role="button"], input, select, textarea')];
          const small = interactive
            .filter(el => {
              const r = el.getBoundingClientRect();
              return r.width > 0 && r.height > 0 && (r.width < 44 || r.height < 44);
            })
            .slice(0, 8)
            .map(el => ({
              tag: el.tagName,
              text: (el.textContent || el.getAttribute('aria-label') || el.getAttribute('placeholder') || '').trim().slice(0, 40),
              w: Math.round(el.getBoundingClientRect().width),
              h: Math.round(el.getBoundingClientRect().height),
            }));
          return small;
        });

        // --- Text too small ---
        const smallText = await page.evaluate(() => {
          const els = [...document.querySelectorAll('p, span, li, a, label, h1, h2, h3, h4, td')];
          return els
            .filter(el => {
              const fs = parseFloat(window.getComputedStyle(el).fontSize);
              const r = el.getBoundingClientRect();
              return fs < 12 && r.width > 0 && (el.textContent || '').trim().length > 3;
            })
            .slice(0, 5)
            .map(el => ({
              tag: el.tagName,
              fontSize: window.getComputedStyle(el).fontSize,
              text: (el.textContent || '').trim().slice(0, 40),
            }));
        });

        // --- Horizontal scroll check ---
        const hasHScroll = await page.evaluate(() => document.body.scrollWidth > window.innerWidth + 2);

        const pageFinding = {
          page: pg.name,
          viewport: vp.name,
          screenshot: screenshotPath,
          overflowX: overflowInfo.overflowX,
          offendingElements: overflowInfo.offenders,
          smallTapTargets: tapTargets,
          smallTextElements: smallText,
          consoleErrors: [...consoleErrors],
          hasHScroll,
        };
        findings.push(pageFinding);
        consoleErrors.length = 0;

        const issues = [];
        if (overflowInfo.overflowX) issues.push(`OVERFLOW: body ${overflowInfo.bodyScrollWidth}px > viewport ${overflowInfo.viewportWidth}px`);
        if (tapTargets.length) issues.push(`SMALL TARGETS: ${tapTargets.length} interactive elements < 44px`);
        if (smallText.length) issues.push(`SMALL TEXT: ${smallText.length} elements < 12px`);

        console.log(`  ${pg.name}: ${issues.length === 0 ? '✓ clean' : issues.join(' | ')}`);
        if (overflowInfo.offenders.length) {
          overflowInfo.offenders.forEach(o => console.log(`    overflow: <${o.tag}> ${o.class} right=${o.right}px w=${o.width}px`));
        }
        if (tapTargets.length) {
          tapTargets.forEach(t => console.log(`    tap: <${t.tag}> "${t.text}" ${t.w}×${t.h}px`));
        }

      } catch (err) {
        console.log(`  ${pg.name}: ERROR — ${err.message}`);
        findings.push({ page: pg.name, viewport: vp.name, error: err.message });
      }
    }

    // --- Special: messages page with conversation selected ---
    try {
      // Get a conversation id if one exists
      await page.goto(`${BASE}/messages`, { waitUntil: 'networkidle', timeout: 10000 });
      await page.waitForTimeout(500);
      const convLink = await page.$('[href^="/messages/"]');
      if (convLink) {
        await convLink.click();
        await page.waitForTimeout(1000);
        await page.screenshot({ path: `${OUT}/11-chat-open--${vp.name}.png`, fullPage: true });
        console.log(`  11-chat-open: screenshot taken`);
      }
    } catch (e) {
      console.log(`  11-chat-open: ${e.message}`);
    }

    await ctx.close();
  }

  fs.writeFileSync('/tmp/mobile-audit/findings.json', JSON.stringify(findings, null, 2));
  console.log('\nAudit complete. Findings saved to /tmp/mobile-audit/findings.json');
  await browser.close();
}

audit().catch(err => { console.error(err); process.exit(1); });
