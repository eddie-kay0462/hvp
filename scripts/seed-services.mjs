/**
 * Seed public.services with Ghana / streetwear marketplace dummies.
 *
 * Prerequisites:
 *   - Apply database_migrations/truncate_services_rpc.sql on your Supabase project.
 *   - .env at repo root with SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY.
 *   - At least one auth user (profiles row) unless SEED_USER_ID is set.
 *
 * Usage:
 *   NODE_ENV=development node scripts/seed-services.mjs
 *   SEED_CONFIRM=yes node scripts/seed-services.mjs   # non-interactive when not development
 *
 * WARNING: truncate_services() uses TRUNCATE ... CASCADE and removes dependent rows
 * (bookings, reviews, etc. that reference services).
 */

import { createClient } from '@supabase/supabase-js';
import { faker } from '@faker-js/faker';
import dotenv from 'dotenv';
import readline from 'node:readline/promises';
import { stdin as input, stdout as output } from 'node:process';

dotenv.config();

const CATEGORY_ROWS = [
  {
    slug: 'design_creative',
    name: 'Design & creative',
    description: 'Logos, lookbooks, pattern-making, photography, and brand identity for streetwear labels.',
    display_order: 10,
    is_active: true,
  },
  {
    slug: 'printing_merch',
    name: 'Printing & merch',
    description: 'Screen print, DTG, embroidery for tees, hoodies, and campus drops.',
    display_order: 15,
    is_active: true,
  },
  {
    slug: 'shipping_logistics',
    name: 'Shipping & logistics',
    description: 'Domestic Ghana shipping, courier, and Accra pickup / locker handoffs.',
    display_order: 16,
    is_active: true,
  },
  {
    slug: 'tech_dev',
    name: 'Tech & dev',
    description: 'NFC authentication, e-commerce builds, and digital product tooling for Ghana brands.',
    display_order: 20,
    is_active: true,
  },
];

/** Twenty-eight realistic rows — prices in GHS, Unsplash image URLs. */
const DUMMY_SERVICES = [
  {
    title: 'Custom hoodie screen print — Accra pickup',
    description:
      'Two-colour plastisol prints on your blanks. Film prep, exposure, and press done in Osu. Great for campus streetwear drops — rush options for hall weeks.',
    category: 'printing_merch',
    default_price: 450,
    default_delivery_time: '5–7 business days',
    express_price: 650,
    express_delivery_time: '48 hours (max 24 units)',
    image_urls: [
      'https://images.unsplash.com/photo-1556821840-3a63f95609a7?w=1200&q=80',
    ],
  },
  {
    title: 'DTG full-colour photo tees',
    description:
      'Direct-to-garment printing for photoreal graphics on cotton blends. Colour profiles tuned for deep black and Accra humidity — ideal for lookbooks and artist merch.',
    category: 'printing_merch',
    default_price: 85,
    default_delivery_time: '3–5 days',
    express_price: 140,
    express_delivery_time: '36 hours',
    image_urls: [
      'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=1200&q=80',
    ],
  },
  {
    title: 'Embroidered dad caps & beanies',
    description:
      '3D puff or flat stitch logos on premium caps. We digitize DST files and match thread to Pantone refs for consistent brand colour across Accra pop-ups.',
    category: 'design_creative',
    default_price: 120,
    default_delivery_time: '6–8 days',
    express_price: 190,
    express_delivery_time: '4 days',
    image_urls: [
      'https://images.unsplash.com/photo-1588850561407-ed78c282e89b?w=1200&q=80',
    ],
  },
  {
    title: 'Heat-press name & number kits for jerseys',
    description:
      'Vinyl names, numbers, and sponsor patches for basketball and football kits. Campus league packages with bulk pricing for halls in Berekuso / East Legon.',
    category: 'printing_merch',
    default_price: 35,
    default_delivery_time: '2–4 days',
    express_price: 55,
    express_delivery_time: '24 hours',
    image_urls: [
      'https://images.unsplash.com/photo-1577219491135-ce391730fb2c?w=1200&q=80',
    ],
  },
  {
    title: 'Sneaker repaint & suede nap refresh',
    description:
      'Angelus-based custom colourways, midsole re-whitening, and suede brushing for vintage runners. Drop-off at Labone or courier to your hostel gate.',
    category: 'design_creative',
    default_price: 280,
    default_delivery_time: '7–10 days',
    express_price: 380,
    express_delivery_time: '5 days',
    image_urls: [
      'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=1200&q=80',
    ],
  },
  {
    title: 'Streetwear lookbook shoot — outdoor + studio',
    description:
      'Half-day shoot with two looks, natural light around Campus Rd plus portable strobe. Includes 15 retouched stills sized for Instagram and Shopify.',
    category: 'design_creative',
    default_price: 350,
    default_delivery_time: '10 days',
    express_price: 480,
    express_delivery_time: '6 days',
    image_urls: [
      'https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=1200&q=80',
    ],
  },
  {
    title: 'Logo & wordmark for streetwear label',
    description:
      'Vector logo lockups, stacked and horizontal variants, plus garment label guidance. Delivery as AI / SVG / PDF for suppliers in Tema and local printers.',
    category: 'design_creative',
    default_price: 420,
    default_delivery_time: '7–14 days',
    express_price: 620,
    express_delivery_time: '5 days',
    image_urls: [
      'https://images.unsplash.com/photo-1626785774573-4b799314346d?w=1200&q=80',
    ],
  },
  {
    title: 'Accra → Kumasi merch box courier',
    description:
      'Insured road freight for boxed apparel (up to 25 kg). Tracking WhatsApp updates, Kejetia/CBD drop or door in Kumasi metro.',
    category: 'shipping_logistics',
    default_price: 95,
    default_delivery_time: '48–72 hours',
    express_price: 150,
    express_delivery_time: '24-hour sprint slot',
    image_urls: [
      'https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?w=1200&q=80',
    ],
  },
  {
    title: 'Takoradi freight booking — pallet & sea quotes',
    description:
      'Consolidation advice for imports via Takoradi, customs paperwork checklist, and last-mile to Accra creative studios.',
    category: 'shipping_logistics',
    default_price: 1200,
    default_delivery_time: 'Quote in 2 days; sailing varies',
    express_price: null,
    express_delivery_time: null,
    image_urls: [
      'https://images.unsplash.com/photo-1494412519320-aa613dfb7738?w=1200&q=80',
    ],
  },
  {
    title: 'Oversized fit pattern tweaks for cut-n-sew',
    description:
      'Adjust shoulder drop, body length, and sleeve taper for boxy hoodies. Tech inputs for local tailors or CMT partners.',
    category: 'design_creative',
    default_price: 200,
    default_delivery_time: '5 days',
    express_price: 300,
    express_delivery_time: '3 days',
    image_urls: [
      'https://images.unsplash.com/photo-1434389677669-e08b4cac310d?w=1200&q=80',
    ],
  },
  {
    title: 'E-com flatlays & ghost mannequin pack',
    description:
      '20 assets per batch — ghost mannequin tops and flat lays on seamless paper. Colour-corrected for Ghana daylight bulbs and mobile screens.',
    category: 'design_creative',
    default_price: 300,
    default_delivery_time: '6 days',
    express_price: 420,
    express_delivery_time: '4 days',
    image_urls: [
      'https://images.unsplash.com/photo-1558769132-cb1aea458c5e?w=1200&q=80',
    ],
  },
  {
    title: 'Screen separation & Pantone ink mixing',
    description:
      'CMYK + spot separations for mesh counts 110–230. Wet samples photographed under daylight for sign-off before your production run.',
    category: 'printing_merch',
    default_price: 150,
    default_delivery_time: '4 days',
    express_price: 220,
    express_delivery_time: '2 days',
    image_urls: [
      'https://images.unsplash.com/photo-1582735689369-4fe89db7114c?w=1200&q=80',
    ],
  },
  {
    title: 'Woven neck labels + side-seam stitch',
    description:
      'Low minimums on damask labels, fold style advice, and installation on finished goods — works with campus streetwear micro-runs.',
    category: 'printing_merch',
    default_price: 180,
    default_delivery_time: '10 days',
    express_price: 260,
    express_delivery_time: '7 days',
    image_urls: [
      'https://images.unsplash.com/photo-1503341504253-dff4815485f1?w=1200&q=80',
    ],
  },
  {
    title: 'Hall week rush: tees + totes same stencil',
    description:
      'Matched graphics on ring-spun tees and canvas totes with shared screens — coordinated pickup at your paa paa night venue (Greater Accra).',
    category: 'printing_merch',
    default_price: 800,
    default_delivery_time: '5 days',
    express_price: 1100,
    express_delivery_time: '72 hours (cap 80 units)',
    image_urls: [
      'https://images.unsplash.com/photo-1503342217505-b0a15ec3261c?w=1200&q=80',
    ],
  },
  {
    title: 'Vector redraw for low-res client logos',
    description:
      'Clean beziers from phone snaps or PNG artifacts, print-ready for A3 posters through to 6 cm chest prints.',
    category: 'design_creative',
    default_price: 160,
    default_delivery_time: '3 days',
    express_price: 240,
    express_delivery_time: '24 hours',
    image_urls: [
      'https://images.unsplash.com/photo-1561070791-2526d30994b5?w=1200&q=80',
    ],
  },
  {
    title: 'Drop-week Instagram carousel templates',
    description:
      'Five editable Canva / Figma frames with Ghana cedi price badges, countdown stickers, and size-chart slide.',
    category: 'design_creative',
    default_price: 220,
    default_delivery_time: '4 days',
    express_price: 320,
    express_delivery_time: '48 hours',
    image_urls: [
      'https://images.unsplash.com/photo-1611162617474-5b21e879641a?w=1200&q=80',
    ],
  },
  {
    title: 'Bulk tote screen print — fifty-piece run',
    description:
      'One colour on natural 10 oz canvas totes. folding + polybag optional; MOQ-friendly for societies.',
    category: 'printing_merch',
    default_price: 3200,
    default_delivery_time: '12 days',
    express_price: 3900,
    express_delivery_time: '8 days',
    image_urls: [
      'https://images.unsplash.com/photo-1597484661643-2f5fef640dd1?w=1200&q=80',
    ],
  },
  {
    title: 'Kotoka meet & greet — factory sample handoff',
    description:
      'Receive airfreight samples at Terminal 3 arrivals or deliver outbound lookbook pieces to your buyer flying out.',
    category: 'shipping_logistics',
    default_price: 75,
    default_delivery_time: 'Book 24h ahead',
    express_price: 120,
    express_delivery_time: 'Same-day standby',
    image_urls: [
      'https://images.unsplash.com/photo-1436491865332-7a61a109cc05?w=1200&q=80',
    ],
  },
  {
    title: 'Denim taper & hem while you wait (Labone)',
    description:
      'Chain stitch or plain hem, reproportion skinny/baggy silhouettes for thrifts and vintage Levi imports.',
    category: 'design_creative',
    default_price: 90,
    default_delivery_time: 'Same day when slots open',
    express_price: 130,
    express_delivery_time: '2-hour express queue',
    image_urls: [
      'https://images.unsplash.com/photo-1542272604-787c3835535d?w=1200&q=80',
    ],
  },
  {
    title: 'NFC hang-tags + QR authenticity cards',
    description:
      'Program NTAG213 chips linking to your verification page; QR backup for non-NFC phones. Batch numbering for limited drops.',
    category: 'tech_dev',
    default_price: 450,
    default_delivery_time: '8 days',
    express_price: 600,
    express_delivery_time: '5 days',
    image_urls: [
      'https://images.unsplash.com/photo-1551817956-d3e72804f829?w=1200&q=80',
    ],
  },
  {
    title: 'Influencer seeding kit assembly',
    description:
      'Pick-pack of tees, stickers, and hand-written notes into branded mailers; Accra-only bicycle courier same-day to media list.',
    category: 'shipping_logistics',
    default_price: 550,
    default_delivery_time: '3 days setup',
    express_price: 750,
    express_delivery_time: '24h after goods arrive',
    image_urls: [
      'https://images.unsplash.com/photo-1513475382583-d06e58bcb0e0?w=1200&q=80',
    ],
  },
  {
    title: 'Pop-up booth bundle — banner + fifty tees',
    description:
      'Roll-up banner design + single-spot plastisol on fifty Gildan softstyle; coordinated delivery to your mall weekend slot.',
    category: 'printing_merch',
    default_price: 1400,
    default_delivery_time: '10 days',
    express_price: 1850,
    express_delivery_time: '7 days',
    image_urls: [
      'https://images.unsplash.com/photo-1540575861501-7af9a19d690a?w=1200&q=80',
    ],
  },
  {
    title: 'Care cards, thank-you notes & sticker sheets',
    description:
      'A6 recycled care cards with washing icons, die-cut vinyl logo stickers — bilingual EN/GA snippets on request.',
    category: 'design_creative',
    default_price: 130,
    default_delivery_time: '5 days',
    express_price: 190,
    express_delivery_time: '3 days',
    image_urls: [
      'https://images.unsplash.com/photo-1606107557195-0e29a4d5c6b8?w=1200&q=80',
    ],
  },
  {
    title: 'Jogger leg lettering — stretch vinyl',
    description:
      'Curved text down the thigh or calf on tech fleece; tested stretch for cycling commutes in Accra heat.',
    category: 'printing_merch',
    default_price: 110,
    default_delivery_time: '3 days',
    express_price: 160,
    express_delivery_time: '24 hours',
    image_urls: [
      'https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?w=1200&q=80',
    ],
  },
  {
    title: 'Factory-ready tech pack PDF',
    description:
      'Graded specs, BOM, stitch & seam diagrams, measurement charts — export friendly for Alibaba or Tema cut-make-trim partners.',
    category: 'design_creative',
    default_price: 950,
    default_delivery_time: '14 days',
    express_price: 1300,
    express_delivery_time: '10 days',
    image_urls: [
      'https://images.unsplash.com/photo-1586281380117-5a60ae2050cc?w=1200&q=80',
    ],
  },
  {
    title: 'Monthly creative retainer — two hero designs',
    description:
      'Two new hero graphics per month plus minor tweaks on existing files; Slack / WhatsApp async reviews tuned to GMT.',
    category: 'design_creative',
    default_price: 1200,
    default_delivery_time: 'Billed monthly',
    express_price: null,
    express_delivery_time: null,
    image_urls: [
      'https://images.unsplash.com/photo-1552664730-d307ca884978?w=1200&q=80',
    ],
  },
  {
    title: 'Dzorwulu secure locker handoff — after hours',
    description:
      'PIN locker pickup for folded orders 6–10 p.m.; CCTV-monitored location shared after payment clears.',
    category: 'shipping_logistics',
    default_price: 25,
    default_delivery_time: 'Same evening',
    express_price: 40,
    express_delivery_time: 'Within 2 hours',
    image_urls: [
      'https://images.unsplash.com/photo-1566576912321-d58ddd7a6088?w=1200&q=80',
    ],
  },
  {
    title: 'Vintage mineral wash & enzyme distress batch',
    description:
      'Small-batch garment dye for sun-faded aesthetics; pre-shrunk controls and shade approval swatches.',
    category: 'printing_merch',
    default_price: 420,
    default_delivery_time: '8 days',
    express_price: 580,
    express_delivery_time: '5 days',
    image_urls: [
      'https://images.unsplash.com/photo-1503342394128-c104d54dba01?w=1200&q=80',
    ],
  },
];

function createServiceRoleClient() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in environment.');
    process.exit(1);
  }
  return createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

async function ensureDevSafetyGate() {
  if (process.env.NODE_ENV === 'production') {
    console.error('ABORT: NODE_ENV is production. Refusing to truncate or seed.');
    process.exit(1);
  }

  if (process.env.NODE_ENV !== 'development') {
    console.warn(
      '[seed] NODE_ENV is not "development". Truncating services is destructive (CASCADE may empty related bookings, reviews, etc.).',
    );
    if (process.env.SEED_CONFIRM === 'yes') {
      return;
    }
    if (input.isTTY) {
      const rl = readline.createInterface({ input, output });
      const answer = await rl.question('Type YES to continue: ');
      rl.close();
      if (answer.trim() !== 'YES') {
        console.log('Aborted.');
        process.exit(0);
      }
    } else {
      console.error('Non-interactive run requires SEED_CONFIRM=yes');
      process.exit(1);
    }
  }
}

async function resolveSeedUserId(supabase) {
  const direct = process.env.SEED_USER_ID?.trim();
  if (direct) {
    const { data: profile, error } = await supabase
      .from('profiles')
      .select('id')
      .eq('id', direct)
      .maybeSingle();
    if (error || !profile) {
      console.error('SEED_USER_ID does not match a profiles.id row:', error?.message || 'not found');
      process.exit(1);
    }
    return direct;
  }

  const { data: profiles, error } = await supabase
    .from('profiles')
    .select('id')
    .order('created_at', { ascending: true })
    .limit(1);

  if (error || !profiles?.length) {
    console.error('No profiles found. Create a user or set SEED_USER_ID.', error?.message);
    process.exit(1);
  }
  console.log('[seed] Using first profile id as seller:', profiles[0].id);
  return profiles[0].id;
}

async function main() {
  await ensureDevSafetyGate();
  const supabase = createServiceRoleClient();

  console.log('Deleting existing services via truncate_services() — CASCADE may clear dependent rows...');
  const { error: truncErr } = await supabase.rpc('truncate_services');
  if (truncErr) {
    console.error('truncate_services failed:', truncErr);
    console.error(
      'Apply database_migrations/truncate_services_rpc.sql in the Supabase SQL editor, then retry.',
    );
    process.exit(1);
  }

  const { error: catErr } = await supabase.from('categories').upsert(CATEGORY_ROWS, {
    onConflict: 'slug',
  });
  if (catErr) {
    console.error('Category upsert failed:', catErr);
    process.exit(1);
  }

  const userId = await resolveSeedUserId(supabase);

  const rows = DUMMY_SERVICES.map((row) => ({
    user_id: userId,
    title: row.title,
    description:
      row.description +
      ' ' +
      faker.company.catchPhrase() +
      ' · Serving ' +
      faker.helpers.arrayElement(['Accra', 'Kumasi', 'Tema', 'Takoradi', 'Cape Coast']),
    category: row.category,
    default_price: row.default_price,
    default_delivery_time: row.default_delivery_time,
    express_price: row.express_price,
    express_delivery_time: row.express_delivery_time,
    portfolio: null,
    is_verified: true,
    is_active: true,
    image_urls: row.image_urls,
    rejection_reason: null,
    verified_at: new Date().toISOString(),
    admin_notes: 'Seeded by scripts/seed-services.mjs',
  }));

  const { error: insErr } = await supabase.from('services').insert(rows);
  if (insErr) {
    console.error('Bulk insert failed:', insErr);
    process.exit(1);
  }

  const { count, error: cntErr } = await supabase
    .from('services')
    .select('*', { count: 'exact', head: true });

  if (cntErr) {
    console.error('Count query failed:', cntErr);
    process.exit(1);
  }

  console.log(`Success: services row count = ${count}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
