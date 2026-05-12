/**
 * Converts a HEIC/HEIF file to a JPEG Blob.
 * Falls through for non-HEIC files.
 */
export async function normalizeImageFile(file: File): Promise<{ file: File; ext: string }> {
  const isHeic =
    file.type === 'image/heic' ||
    file.type === 'image/heif' ||
    /\.(heic|heif)$/i.test(file.name);

  if (!isHeic) {
    const ext = file.name.split('.').pop()?.toLowerCase() || 'jpg';
    return { file, ext };
  }

  // Dynamically import to avoid bundling overhead for non-HEIC users
  const heic2any = (await import('heic2any')).default;
  const blob = await heic2any({ blob: file, toType: 'image/jpeg', quality: 0.85 });
  const jpegBlob = Array.isArray(blob) ? blob[0] : blob;
  const converted = new File(
    [jpegBlob],
    file.name.replace(/\.(heic|heif)$/i, '.jpg'),
    { type: 'image/jpeg' }
  );
  return { file: converted, ext: 'jpg' };
}
