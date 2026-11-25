import { describe, expect, it } from 'vitest';
import { IdentifyController } from './identify/controller';
import { UploadController } from './uploadImage/controller';

const skipsTimeout = (target: object): boolean =>
  Reflect.getMetadata('skipRequestTimeout', target) === true;

describe('the plant photograph routes', () => {
  it.each([
    ['the identification upload', IdentifyController],
    ['the plant image upload', UploadController],
  ])('exempt %s from the global request timeout', (_name, controller) => {
    expect(skipsTimeout(controller)).toBe(true);
  });
});
