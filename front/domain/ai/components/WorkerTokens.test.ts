import { renderSuspended } from '@nuxt/test-utils/runtime';
import { screen } from '@testing-library/vue';
import { describe, expect, it } from 'vitest';
import WorkerTokens from './WorkerTokens.vue';

const tokens = [{ id: '1', label: 'Bureau', online: true, lastSeenAt: '2026-01-01T00:00:00Z' }];

describe('WorkerTokens', () => {
  it('raises an alert when a computer could not be removed', async () => {
    await renderSuspended(WorkerTokens, {
      props: { tokens, revokingId: undefined, revokeFailed: true },
    });

    expect(screen.getByRole('alert').textContent).toContain('Impossible de retirer');
  });

  it('stays silent when nothing failed', async () => {
    await renderSuspended(WorkerTokens, {
      props: { tokens, revokingId: undefined, revokeFailed: false },
    });

    expect(screen.queryByRole('alert')).toBeNull();
  });
});
