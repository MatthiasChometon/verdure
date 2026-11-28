// Writes the 20 photos of the showcase plants (seed.sql, keys 20000000-0000-4000-8000-0000000000NN)
// into the API's disk storage: a JPEG each of about the weight of a phone photo shown at card size,
// with the content-type sidecar the disk driver reads. Run from back/ (it uses the back's sharp):
//   node ../devops/load/seed-images.mjs <storage dir>
import { mkdirSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { join } from 'node:path';

const sharp = createRequire(join(process.cwd(), 'package.json'))('sharp');
const dir = process.argv[2];
if (!dir) {
  throw new Error('usage: seed-images.mjs <storage dir>');
}
mkdirSync(dir, { recursive: true });

for (let n = 1; n <= 20; n += 1) {
  const key = `20000000-0000-4000-8000-${String(n).padStart(12, '0')}`;
  const jpeg = await sharp({
    create: {
      width: 800,
      height: 800,
      channels: 3,
      background: { r: 30 + n * 8, g: 110, b: 60 },
      noise: { type: 'gaussian', mean: 128, sigma: 14 },
    },
  })
    .blur(1.2)
    .jpeg({ quality: 70 })
    .toBuffer();
  writeFileSync(join(dir, key), jpeg);
  writeFileSync(join(dir, `${key}.type`), 'image/jpeg');
}
