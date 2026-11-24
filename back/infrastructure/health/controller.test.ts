import { ServiceUnavailableException } from '@nestjs/common';
import { describe, expect, it } from 'vitest';
import { HealthController } from './controller';

describe('HealthController', () => {
  it('is alive even when the database is down', () => {
    const controller = new HealthController({
      execute: () => Promise.reject(new Error('down')),
    });

    expect(controller.checkLiveness()).toEqual({ status: 'ok' });
  });

  it('is not ready, with a 503, when the database is down', async () => {
    const controller = new HealthController({
      execute: () => Promise.reject(new Error('connect ECONNREFUSED')),
    });

    await expect(controller.checkReadiness()).rejects.toBeInstanceOf(
      ServiceUnavailableException,
    );
  });
});
