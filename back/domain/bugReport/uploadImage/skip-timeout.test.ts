import { Reflector } from '@nestjs/core';
import { describe, expect, it } from 'vitest';
import { BugImageUploadController } from './controller';

describe('the bug report image upload', () => {
  it('is exempt from the global request timeout', () => {
    expect(
      new Reflector().get<boolean | undefined>(
        'skipRequestTimeout',
        BugImageUploadController,
      ),
    ).toBe(true);
  });
});
