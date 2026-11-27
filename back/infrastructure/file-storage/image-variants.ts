import { createHash } from 'node:crypto';

// Resized copies of an uploaded image, made on the first request and kept in the storage like
// any other file (the process stays stateless). The original is never touched.
export const VARIANT_WIDTHS = [480, 960, 1280] as const;
export type VariantWidth = (typeof VARIANT_WIDTHS)[number];

export const isVariantWidth = (width: number): width is VariantWidth =>
  (VARIANT_WIDTHS as readonly number[]).includes(width);

// A UUID derived from the original key and the width: same inputs, same key, so a variant is
// found again without a table, and it passes the storage key check.
export const variantKey = (key: string, width: VariantWidth): string => {
  const hex = createHash('sha256').update(`${key}:${width}`).digest('hex');
  return [
    hex.slice(0, 8),
    hex.slice(8, 12),
    `4${hex.slice(13, 16)}`,
    `8${hex.slice(17, 20)}`,
    hex.slice(20, 32),
  ].join('-');
};

export const allVariantKeys = (key: string): string[] =>
  VARIANT_WIDTHS.map((width) => variantKey(key, width));
