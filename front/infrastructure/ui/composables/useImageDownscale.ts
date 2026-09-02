// Whether this browser can ENCODE WebP through a canvas. All current browsers can
// (older Safari couldn't and silently fell back to PNG — we check first to avoid
// that). Memoised: the probe runs once.
let webpEncodable: boolean | undefined;
const canEncodeWebp = (): boolean => {
  if (webpEncodable === undefined) {
    try {
      webpEncodable = document
        .createElement('canvas')
        .toDataURL('image/webp')
        .startsWith('data:image/webp');
    } catch {
      webpEncodable = false;
    }
  }
  return webpEncodable;
};

// Preferred output format: WebP when the browser can encode it (smaller than JPEG
// at equal quality), JPEG otherwise. Never PNG.
const pickOutputType = (): string =>
  canEncodeWebp() ? 'image/webp' : 'image/jpeg';

// Resize an image in the browser so its longest side is at most `maxSide`,
// re-encoding it (WebP by default, or an explicit mimeType — e.g. JPEG for the
// identification copy, since Pl@ntNet may reject WebP). Aspect ratio is kept.
// Used to bound every stored image to a consistent size — a plant photo, a bug
// screenshot — since a phone capture is ~12 MP / several MB, far more than a
// card, the detail view or a report thumbnail needs. Returns the original
// untouched only if it cannot be processed, so a save is never blocked.
export const useImageDownscale = (
  source: Blob,
  maxSide: number,
  options: { quality?: number; mimeType?: string } = {},
): Promise<Blob> => {
  const quality = options.quality ?? 0.85;
  const mimeType = options.mimeType ?? pickOutputType();
  return new Promise((resolve): void => {
    const url = URL.createObjectURL(source);
    const image = new Image();
    image.onload = (): void => {
      URL.revokeObjectURL(url);
      const scale = Math.min(1, maxSide / Math.max(image.width, image.height));
      const canvas = document.createElement('canvas');
      canvas.width = Math.round(image.width * scale);
      canvas.height = Math.round(image.height * scale);
      const context = canvas.getContext('2d');
      if (context === null) {
        resolve(source);
        return;
      }
      context.drawImage(image, 0, 0, canvas.width, canvas.height);
      canvas.toBlob((blob): void => resolve(blob ?? source), mimeType, quality);
    };
    image.onerror = (): void => {
      URL.revokeObjectURL(url);
      resolve(source);
    };
    image.src = url;
  });
};
