/**
 * One-time migration: convert HEIC/HEIF service images to JPEG in-place.
 *
 * What it does:
 *   1. Scans all rows in the `services` table for HEIC/HEIF URLs in image_urls
 *   2. Downloads each HEIC file from the `service-images` bucket
 *   3. Converts it to JPEG (85% quality)
 *   4. Uploads the JPEG back to the same bucket
 *   5. Updates the service row's image_urls to point to the new JPEG URLs
 *   6. Deletes the original HEIC file from storage
 *
 * Usage:
 *   node scripts/convert-heic-images.mjs
 *
 * Prerequisites:
 *   .env at repo root with SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY
 */

import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';
import heicConvert from 'heic-convert';

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const BUCKET = 'service-images';

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env');
  process.exit(1);
}

const db = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

const isHeic = (url) => /\.(heic|heif)(\?|$)/i.test(url);

/**
 * Extract the storage object path from a public URL.
 * Public URLs look like:
 *   https://<project>.supabase.co/storage/v1/object/public/service-images/<path>
 */
const extractStoragePath = (url) => {
  const marker = `/object/public/${BUCKET}/`;
  const idx = url.indexOf(marker);
  if (idx === -1) return null;
  // Strip query string if any
  return decodeURIComponent(url.slice(idx + marker.length).split('?')[0]);
};

async function convertFile(storagePath) {
  // Download
  const { data, error } = await db.storage.from(BUCKET).download(storagePath);
  if (error) throw new Error(`Download failed for ${storagePath}: ${error.message}`);

  const inputBuffer = Buffer.from(await data.arrayBuffer());

  // Convert HEIC → JPEG
  const outputBuffer = await heicConvert({
    buffer: inputBuffer,
    format: 'JPEG',
    quality: 0.85,
  });

  // New path: same directory, .jpg extension
  const newPath = storagePath.replace(/\.(heic|heif)$/i, '.jpg');

  // Upload JPEG
  const { error: uploadError } = await db.storage
    .from(BUCKET)
    .upload(newPath, Buffer.from(outputBuffer), {
      contentType: 'image/jpeg',
      cacheControl: '3600',
      upsert: true,
    });
  if (uploadError) throw new Error(`Upload failed for ${newPath}: ${uploadError.message}`);

  // Get new public URL
  const { data: { publicUrl } } = db.storage.from(BUCKET).getPublicUrl(newPath);

  // Delete old HEIC file
  const { error: deleteError } = await db.storage.from(BUCKET).remove([storagePath]);
  if (deleteError) {
    console.warn(`  Warning: could not delete old file ${storagePath}: ${deleteError.message}`);
  }

  return publicUrl;
}

async function run() {
  console.log('Fetching services with HEIC images...\n');

  const { data: services, error } = await db
    .from('services')
    .select('id, title, image_urls')
    .not('image_urls', 'is', null);

  if (error) {
    console.error('Failed to fetch services:', error.message);
    process.exit(1);
  }

  const affected = services.filter(
    (s) => Array.isArray(s.image_urls) && s.image_urls.some(isHeic)
  );

  if (affected.length === 0) {
    console.log('No HEIC images found. Nothing to do.');
    return;
  }

  console.log(`Found ${affected.length} service(s) with HEIC images.\n`);

  let totalConverted = 0;
  let totalFailed = 0;

  for (const service of affected) {
    console.log(`Service: "${service.title}" (${service.id})`);
    const newUrls = [...service.image_urls];

    for (let i = 0; i < newUrls.length; i++) {
      const url = newUrls[i];
      if (!isHeic(url)) continue;

      const storagePath = extractStoragePath(url);
      if (!storagePath) {
        console.warn(`  [skip] Could not parse storage path from: ${url}`);
        continue;
      }

      process.stdout.write(`  Converting ${storagePath} → `);
      try {
        const newUrl = await convertFile(storagePath);
        newUrls[i] = newUrl;
        console.log(`${newUrl.split('/').pop()} ✓`);
        totalConverted++;
      } catch (err) {
        console.error(`FAILED — ${err.message}`);
        totalFailed++;
      }
    }

    // Update the row only if at least one URL changed
    if (newUrls.some((u, i) => u !== service.image_urls[i])) {
      const { error: updateError } = await db
        .from('services')
        .update({ image_urls: newUrls })
        .eq('id', service.id);

      if (updateError) {
        console.error(`  DB update failed for service ${service.id}: ${updateError.message}`);
      } else {
        console.log(`  DB updated ✓\n`);
      }
    }
  }

  console.log('─'.repeat(50));
  console.log(`Done. Converted: ${totalConverted}  Failed: ${totalFailed}`);
}

run().catch((err) => {
  console.error('Unexpected error:', err);
  process.exit(1);
});
