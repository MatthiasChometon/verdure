import { afterEach, describe, expect, it, vi } from 'vitest';
import { useStagedReveal } from './useStagedReveal';

const settle = (): Promise<void> => new Promise((resolve) => setTimeout(resolve, 20));

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('useStagedReveal', () => {
  it('runs the renders in the order they were staged', async () => {
    const order: string[] = [];
    const { stage } = useStagedReveal();

    stage((): void => void order.push('bio'));
    stage((): void => void order.push('care'));
    stage((): void => void order.push('calendar'));
    await settle();

    expect(order).toEqual(['bio', 'care', 'calendar']);
  });

  it('gives the browser a turn between two renders', async () => {
    const yielded = vi.fn((): Promise<void> => Promise.resolve());
    vi.stubGlobal('scheduler', { yield: yielded });
    const done: number[] = [];
    const { stage } = useStagedReveal();

    stage((): void => void done.push(yielded.mock.calls.length));
    stage((): void => void done.push(yielded.mock.calls.length));
    await settle();

    expect(done).toHaveLength(2);
    expect(done[1]).toBeGreaterThan(done[0] ?? 0);
  });

  it('keeps each render in its own task under a simulated slowdown', async () => {
    const { stage } = useStagedReveal();
    const longestRun: number[] = [];
    const slowRender = (): void => {
      const start = performance.now();
      while (performance.now() - start < 15) {
        // simulated 15 ms of rendering
      }
      longestRun.push(performance.now() - start);
    };
    let sequential = 0;
    stage(slowRender);
    stage(slowRender);
    stage((): void => {
      sequential = longestRun.length;
    });
    await vi.waitFor((): void => {
      expect(sequential).toBe(2);
    });

    expect(sequential).toBe(2);
    expect(Math.max(...longestRun)).toBeLessThan(50);
  });
});
