import sharp from 'sharp';

// A 3000x2000 smooth, photo-like JPEG (what a phone camera uploads), a few hundred KB.
export const samplePhoto = async (): Promise<Buffer> => {
  const [width, height] = [3000, 2000];
  const pixels = Buffer.alloc(width * height * 3);
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const at = (y * width + x) * 3;
      const grain = (x * 7 + y * 13) % 5;
      pixels[at] = 90 + 80 * Math.sin(x / 300) + grain;
      pixels[at + 1] = 120 + 60 * Math.cos(y / 250) + grain;
      pixels[at + 2] = 70 + 50 * Math.sin((x + y) / 400) + grain;
    }
  }
  return sharp(pixels, { raw: { width, height, channels: 3 } })
    .jpeg({ quality: 92 })
    .toBuffer();
};
