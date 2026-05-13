const IMAGE_EXTENSIONS = /\.(jpe?g|png|gif|webp|bmp|tiff?|avif|svg|ico|heic|heif)$/i;

/**
 * Returns true if the file is a recognised image by MIME type or extension.
 * Checking both handles cases where the OS/browser leaves type empty.
 */
export function isImageFile(file: File): boolean {
  return file.type.startsWith('image/') || IMAGE_EXTENSIONS.test(file.name);
}

const MAX_DIMENSION = 1400; // px — enough for display, much smaller upload
const JPEG_QUALITY = 0.82;

/**
 * Compresses an image file using a canvas, capping the longest side at
 * MAX_DIMENSION and encoding as JPEG. SVG and GIF are returned as-is.
 */
async function compressImage(file: File): Promise<File> {
  // Skip formats that don't benefit from canvas compression
  if (file.type === 'image/svg+xml' || file.type === 'image/gif') return file;

  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(url);
      let { width, height } = img;

      // Scale down if needed
      if (width > MAX_DIMENSION || height > MAX_DIMENSION) {
        const ratio = Math.min(MAX_DIMENSION / width, MAX_DIMENSION / height);
        width = Math.round(width * ratio);
        height = Math.round(height * ratio);
      }

      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      canvas.getContext('2d')!.drawImage(img, 0, 0, width, height);

      canvas.toBlob(
        (blob) => {
          if (!blob) return reject(new Error('Canvas compression failed'));
          const compressed = new File(
            [blob],
            file.name.replace(/\.[^.]+$/, '.jpg'),
            { type: 'image/jpeg' }
          );
          // Only use compressed version if it's actually smaller
          resolve(compressed.size < file.size ? compressed : file);
        },
        'image/jpeg',
        JPEG_QUALITY
      );
    };
    img.onerror = () => { URL.revokeObjectURL(url); resolve(file); }; // fallback
    img.src = url;
  });
}

/**
 * Converts a HEIC/HEIF file to JPEG, then compresses.
 * Non-HEIC files are compressed directly.
 */
export async function normalizeImageFile(file: File): Promise<{ file: File; ext: string }> {
  const isHeic =
    file.type === 'image/heic' ||
    file.type === 'image/heif' ||
    /\.(heic|heif)$/i.test(file.name);

  let workingFile = file;

  if (isHeic) {
    const heic2any = (await import('heic2any')).default;
    const blob = await heic2any({ blob: file, toType: 'image/jpeg', quality: 0.85 });
    const jpegBlob = Array.isArray(blob) ? blob[0] : blob;
    workingFile = new File(
      [jpegBlob],
      file.name.replace(/\.(heic|heif)$/i, '.jpg'),
      { type: 'image/jpeg' }
    );
  }

  const compressed = await compressImage(workingFile);
  const ext = compressed.name.split('.').pop()?.toLowerCase() || 'jpg';
  return { file: compressed, ext };
}
