import { describe, expect, it } from 'vitest';
import { RecognitionRequestController } from './request.controller';
import { WorkerChannelController } from './worker.controller';

const skipsTimeout = (target: object): boolean =>
  Reflect.getMetadata('skipRequestTimeout', target) === true;

describe('the worker routes held open on purpose', () => {
  it('exempt the recognition requests from the global request timeout', () => {
    expect(skipsTimeout(RecognitionRequestController)).toBe(true);
  });

  it('exempt the worker long poll from the global request timeout', () => {
    // eslint-disable-next-line @typescript-eslint/unbound-method -- read for its metadata, never called
    const { nextJob } = WorkerChannelController.prototype;
    expect(skipsTimeout(nextJob)).toBe(true);
  });
});
