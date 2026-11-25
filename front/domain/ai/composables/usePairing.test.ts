import { mockNuxtImport, renderSuspended } from '@nuxt/test-utils/runtime';
import { describe, expect, it, vi } from 'vitest';
import { defineComponent, h, ref, type VNode } from 'vue';

const { routeQuery } = vi.hoisted((): { routeQuery: { value: Record<string, unknown> } } => ({
  routeQuery: { value: {} },
}));
mockNuxtImport('useRoute', () => (): Record<string, unknown> => ({ query: routeQuery.value }));
mockNuxtImport('useAuth', () => (): Record<string, unknown> => ({ user: ref() }));

const readCode = async (query: Record<string, unknown>): Promise<string> => {
  routeQuery.value = query;
  let code = 'unset';
  await renderSuspended(
    defineComponent({
      setup(): () => VNode {
        code = usePairing().code.value;
        return () => h('div');
      },
    }),
  );
  return code;
};

describe('usePairing code', () => {
  it('reads a single code', async () => {
    expect(await readCode({ code: 'ABCD-1234' })).toBe('ABCD-1234');
  });

  it('refuses a repeated parameter instead of joining the values', async () => {
    expect(await readCode({ code: ['AAAA', 'BBBB'] })).toBe('');
  });

  it('refuses a bare `?code` and a missing parameter', async () => {
    expect(await readCode({ code: null })).toBe('');
    expect(await readCode({})).toBe('');
  });
});
