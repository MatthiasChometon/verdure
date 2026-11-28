import { Logger } from '@nestjs/common';
import type { default as Sharp } from 'sharp';

type SharpModule = typeof Sharp;

const logger = new Logger('Sharp');
let loading: Promise<SharpModule | undefined> | undefined;

// sharp is a native module: it is loaded on first use, never at boot, so a host where its
// prebuilt binary does not load (glibc too old, missing optional dependency) keeps the API up.
// The failure is logged once; callers get `undefined` and serve the original image.
export const loadSharp = (): Promise<SharpModule | undefined> => {
  loading ??= import('sharp').then(
    (module) => module.default,
    (error: unknown) => {
      logger.warn(
        `sharp cannot be loaded, images are served unresized: ${String(error)}`,
      );
      return undefined;
    },
  );
  return loading;
};

// For tests only: forget the cached outcome.
export const resetSharpForTests = (): void => {
  loading = undefined;
};
