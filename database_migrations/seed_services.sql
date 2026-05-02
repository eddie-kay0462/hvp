-- =============================================================================
-- Streetwear / marketplace services seed (companion to scripts/seed-services.mjs)
-- =============================================================================
-- Prereqs:
--   • public.categories contains slugs referenced below (design_creative, tech_dev, …).
--   • At least one row in public.profiles (seed user).
--   • Apply truncate_services RPC first: database_migrations/truncate_services_rpc.sql
--
-- Dev-only reset (DANGER: TRUNCATE ... CASCADE also clears bookings, reviews, etc.
-- that reference services):
--   SELECT public.truncate_services();
--
-- After truncate, run the INSERT below, or prefer:
--   NODE_ENV=development node scripts/seed-services.mjs
-- =============================================================================

INSERT INTO public.categories (slug, name, description, display_order, is_active)
VALUES
  (
    'design_creative',
    'Design & creative',
    'Logos, lookbooks, pattern-making, photography, and brand identity for streetwear labels.',
    10,
    true
  ),
  (
    'printing_merch',
    'Printing & merch',
    'Screen print, DTG, embroidery for tees, hoodies, and campus drops.',
    15,
    true
  ),
  (
    'shipping_logistics',
    'Shipping & logistics',
    'Domestic Ghana shipping, courier, and Accra pickup / locker handoffs.',
    16,
    true
  ),
  (
    'tech_dev',
    'Tech & dev',
    'NFC authentication, e-commerce builds, and digital product tooling for Ghana brands.',
    20,
    true
  )
ON CONFLICT (slug) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  display_order = EXCLUDED.display_order,
  is_active = EXCLUDED.is_active;

WITH seed_user AS (
  SELECT id AS user_id FROM public.profiles ORDER BY created_at ASC LIMIT 1
)
INSERT INTO public.services (
  user_id,
  title,
  description,
  category,
  default_price,
  default_delivery_time,
  express_price,
  express_delivery_time,
  is_verified,
  is_active,
  image_urls,
  verified_at,
  admin_notes
)
SELECT
  seed_user.user_id,
  v.title,
  v.description,
  v.category,
  v.default_price,
  v.default_delivery_time,
  v.express_price,
  v.express_delivery_time,
  true,
  true,
  v.image_urls,
  now(),
  'seed_services.sql'
FROM seed_user
CROSS JOIN (
  VALUES
    (
      'Custom hoodie screen print — Accra pickup',
      'Two-colour plastisol prints on your blanks. Film prep, exposure, and press in Osu. Rush options for hall weeks.',
      'printing_merch',
      450::numeric,
      '5–7 business days',
      650::numeric,
      '48 hours (max 24 units)',
      ARRAY['https://images.unsplash.com/photo-1556821840-3a63f95609a7?w=1200&q=80']::text[]
    ),
    (
      'DTG full-colour photo tees',
      'Direct-to-garment for photoreal graphics on cotton blends; tuned for Accra humidity.',
      'printing_merch',
      85::numeric,
      '3–5 days',
      140::numeric,
      '36 hours',
      ARRAY['https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=1200&q=80']::text[]
    ),
    (
      'Embroidered dad caps & beanies',
      '3D puff or flat stitch logos; DST digitizing and Pantone-matched thread.',
      'design_creative',
      120::numeric,
      '6–8 days',
      190::numeric,
      '4 days',
      ARRAY['https://images.unsplash.com/photo-1588850561407-ed78c282e89b?w=1200&q=80']::text[]
    ),
    (
      'Heat-press name & number kits for jerseys',
      'Vinyl names and numbers for campus football and basketball kits; bulk hall pricing.',
      'printing_merch',
      35::numeric,
      '2–4 days',
      55::numeric,
      '24 hours',
      ARRAY['https://images.unsplash.com/photo-1577219491135-ce391730fb2c?w=1200&q=80']::text[]
    ),
    (
      'Sneaker repaint & suede nap refresh',
      'Custom colourways and midsole re-whitening; drop-off Labone or hostel courier.',
      'design_creative',
      280::numeric,
      '7–10 days',
      380::numeric,
      '5 days',
      ARRAY['https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=1200&q=80']::text[]
    ),
    (
      'Streetwear lookbook shoot — outdoor + studio',
      'Half-day shoot, 15 retouched stills for Instagram and Shopify.',
      'design_creative',
      350::numeric,
      '10 days',
      480::numeric,
      '6 days',
      ARRAY['https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=1200&q=80']::text[]
    ),
    (
      'Logo & wordmark for streetwear label',
      'Vector logo lockups and garment label guidance; AI/SVG/PDF for local printers.',
      'design_creative',
      420::numeric,
      '7–14 days',
      620::numeric,
      '5 days',
      ARRAY['https://images.unsplash.com/photo-1626785774573-4b799314346d?w=1200&q=80']::text[]
    ),
    (
      'Accra → Kumasi merch box courier',
      'Insured road freight up to 25 kg with WhatsApp tracking and CBD drop.',
      'shipping_logistics',
      95::numeric,
      '48–72 hours',
      150::numeric,
      '24-hour sprint',
      ARRAY['https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?w=1200&q=80']::text[]
    ),
    (
      'Takoradi freight booking — pallet & sea quotes',
      'Consolidation advice, customs checklist, last-mile coordination to Accra studios.',
      'shipping_logistics',
      1200::numeric,
      'Quote in 2 days',
      NULL::numeric,
      NULL::text,
      ARRAY['https://images.unsplash.com/photo-1494412519320-aa613dfb7738?w=1200&q=80']::text[]
    ),
    (
      'Oversized fit pattern tweaks for cut-n-sew',
      'Adjust shoulder drop and silhouette for boxy hoodies; CMT-ready notes.',
      'design_creative',
      200::numeric,
      '5 days',
      300::numeric,
      '3 days',
      ARRAY['https://images.unsplash.com/photo-1434389677669-e08b4cac310d?w=1200&q=80']::text[]
    ),
    (
      'E-com flatlays & ghost mannequin pack',
      '20 assets per batch — ghost mannequin and flat lays, colour-corrected.',
      'design_creative',
      300::numeric,
      '6 days',
      420::numeric,
      '4 days',
      ARRAY['https://images.unsplash.com/photo-1558769132-cb1aea458c5e?w=1200&q=80']::text[]
    ),
    (
      'Screen separation & Pantone ink mixing',
      'CMYK + spot separations; wet samples under daylight for sign-off.',
      'printing_merch',
      150::numeric,
      '4 days',
      220::numeric,
      '2 days',
      ARRAY['https://images.unsplash.com/photo-1582735689369-4fe89db7114c?w=1200&q=80']::text[]
    ),
    (
      'Woven neck labels + side-seam stitch',
      'Low MOQ damask labels and installation on finished streetwear runs.',
      'printing_merch',
      180::numeric,
      '10 days',
      260::numeric,
      '7 days',
      ARRAY['https://images.unsplash.com/photo-1503341504253-dff4815485f1?w=1200&q=80']::text[]
    ),
    (
      'Hall week rush: tees + totes same stencil',
      'Matched graphics on tees and totes; pickup near Greater Accra venues.',
      'printing_merch',
      800::numeric,
      '5 days',
      1100::numeric,
      '72 hours (cap 80 units)',
      ARRAY['https://images.unsplash.com/photo-1503342217505-b0a15ec3261c?w=1200&q=80']::text[]
    ),
    (
      'Vector redraw for low-res client logos',
      'Print-ready beziers from rough references; poster through chest-print sizes.',
      'design_creative',
      160::numeric,
      '3 days',
      240::numeric,
      '24 hours',
      ARRAY['https://images.unsplash.com/photo-1561070791-2526d30994b5?w=1200&q=80']::text[]
    ),
    (
      'Drop-week Instagram carousel templates',
      'Five editable frames with cedi price badges and countdown stickers.',
      'design_creative',
      220::numeric,
      '4 days',
      320::numeric,
      '48 hours',
      ARRAY['https://images.unsplash.com/photo-1611162617474-5b21e879641a?w=1200&q=80']::text[]
    ),
    (
      'Bulk tote screen print — fifty-piece run',
      'One colour on 10 oz canvas totes; optional fold and polybag.',
      'printing_merch',
      3200::numeric,
      '12 days',
      3900::numeric,
      '8 days',
      ARRAY['https://images.unsplash.com/photo-1597484661643-2f5fef640dd1?w=1200&q=80']::text[]
    ),
    (
      'Kotoka meet & greet — factory sample handoff',
      'Terminal 3 arrivals pickup or outbound handoff for buyers.',
      'shipping_logistics',
      75::numeric,
      'Book 24h ahead',
      120::numeric,
      'Same-day standby',
      ARRAY['https://images.unsplash.com/photo-1436491865332-7a61a109cc05?w=1200&q=80']::text[]
    ),
    (
      'Denim taper & hem while you wait (Labone)',
      'Chain stitch hem and taper for thrift denim and vintage imports.',
      'design_creative',
      90::numeric,
      'Same day slots',
      130::numeric,
      '2-hour express queue',
      ARRAY['https://images.unsplash.com/photo-1542272604-787c3835535d?w=1200&q=80']::text[]
    ),
    (
      'NFC hang-tags + QR authenticity cards',
      'NTAG programming plus QR fallback; batch numbering for limited drops.',
      'tech_dev',
      450::numeric,
      '8 days',
      600::numeric,
      '5 days',
      ARRAY['https://images.unsplash.com/photo-1551817956-d3e72804f829?w=1200&q=80']::text[]
    ),
    (
      'Influencer seeding kit assembly',
      'Pick-pack mailers with tees and stickers; bicycle courier in Accra.',
      'shipping_logistics',
      550::numeric,
      '3 days setup',
      750::numeric,
      '24h after goods in',
      ARRAY['https://images.unsplash.com/photo-1513475382583-d06e58bcb0e0?w=1200&q=80']::text[]
    ),
    (
      'Pop-up booth bundle — banner + fifty tees',
      'Roll-up banner design plus single-colour plastisol on fifty softstyle tees.',
      'printing_merch',
      1400::numeric,
      '10 days',
      1850::numeric,
      '7 days',
      ARRAY['https://images.unsplash.com/photo-1540575861501-7af9a19d690a?w=1200&q=80']::text[]
    ),
    (
      'Care cards, thank-you notes & sticker sheets',
      'A6 care cards and die-cut stickers; optional bilingual EN/GA snippets.',
      'design_creative',
      130::numeric,
      '5 days',
      190::numeric,
      '3 days',
      ARRAY['https://images.unsplash.com/photo-1606107557195-0e29a4d5c6b8?w=1200&q=80']::text[]
    ),
    (
      'Jogger leg lettering — stretch vinyl',
      'Curved thigh or calf text on tech fleece; stretch-tested for heat.',
      'printing_merch',
      110::numeric,
      '3 days',
      160::numeric,
      '24 hours',
      ARRAY['https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?w=1200&q=80']::text[]
    ),
    (
      'Factory-ready tech pack PDF',
      'Graded specs, BOM, diagrams for Tema or offshore CMT partners.',
      'design_creative',
      950::numeric,
      '14 days',
      1300::numeric,
      '10 days',
      ARRAY['https://images.unsplash.com/photo-1586281380117-5a60ae2050cc?w=1200&q=80']::text[]
    ),
    (
      'Monthly creative retainer — two hero designs',
      'Two new hero graphics monthly plus tweaks; async reviews GMT.',
      'design_creative',
      1200::numeric,
      'Billed monthly',
      NULL::numeric,
      NULL::text,
      ARRAY['https://images.unsplash.com/photo-1552664730-d307ca884978?w=1200&q=80']::text[]
    ),
    (
      'Dzorwulu secure locker handoff — after hours',
      'PIN locker 6–10 p.m.; CCTV-monitored; PIN after payment clears.',
      'shipping_logistics',
      25::numeric,
      'Same evening',
      40::numeric,
      'Within 2 hours',
      ARRAY['https://images.unsplash.com/photo-1566576912321-d58ddd7a6088?w=1200&q=80']::text[]
    ),
    (
      'Vintage mineral wash & enzyme distress batch',
      'Garment dye for sun-faded look; pre-shrink controls and swatches.',
      'printing_merch',
      420::numeric,
      '8 days',
      580::numeric,
      '5 days',
      ARRAY['https://images.unsplash.com/photo-1503342394128-c104d54dba01?w=1200&q=80']::text[]
    )
) AS v (
  title,
  description,
  category,
  default_price,
  default_delivery_time,
  express_price,
  express_delivery_time,
  image_urls
)
WHERE EXISTS (SELECT 1 FROM seed_user);

-- Verify:
-- SELECT count(*) FROM public.services;
