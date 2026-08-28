// Resize an image in the browser so its longest side is at most `maxSide`,
// re-encoding it as JPEG. Aspect ratio is kept. Used to bound every stored plant
// photo to a consistent size (a phone photo is ~12 MP / several MB, far more than
// a card thumbnail or detail view needs) and, at a smaller size, for the copy
// sent to identification. Returns the original untouched if it is already small
// enough or anything fails, so a save is never blocked.
export const downscaleImage = (
  source: Blob,
  maxSide: number,
  quality = 0.85,
): Promise<Blob> =>
  new Promise((resolve): void => {
    const url = URL.createObjectURL(source);
    const image = new Image();
    image.onload = (): void => {
      URL.revokeObjectURL(url);
      const scale = Math.min(1, maxSide / Math.max(image.width, image.height));
      if (scale === 1) {
        resolve(source);
        return;
      }
      const canvas = document.createElement('canvas');
      canvas.width = Math.round(image.width * scale);
      canvas.height = Math.round(image.height * scale);
      const context = canvas.getContext('2d');
      if (context === null) {
        resolve(source);
        return;
      }
      context.drawImage(image, 0, 0, canvas.width, canvas.height);
      canvas.toBlob(
        (blob): void => resolve(blob ?? source),
        'image/jpeg',
        quality,
      );
    };
    image.onerror = (): void => {
      URL.revokeObjectURL(url);
      resolve(source);
    };
    image.src = url;
  });
