// mimeType lets a caller force JPEG (Pl@ntNet may reject WebP) instead of the
// WebP default. Returns the original untouched if it cannot be processed.
export const useImageDownscale = (
  source: Blob,
  maxSide: number,
  options: { quality?: number; mimeType?: string } = {},
): Promise<Blob> => {
  // Older Safari couldn't encode WebP via canvas and silently fell back to PNG —
  // check first. Memoised for this call's lifetime.
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

  // WebP when the browser can encode it (smaller than JPEG at equal quality),
  // JPEG otherwise. Never PNG.
  const pickOutputType = (): string => (canEncodeWebp() ? 'image/webp' : 'image/jpeg');

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
