import { renderSuspended } from '@nuxt/test-utils/runtime';
import { screen } from '@testing-library/vue';
import { describe, expect, it } from 'vitest';
import Document from './Document.vue';

describe('legal Document', () => {
  it.each(['notice', 'privacy', 'terms'] as const)(
    'renders the heading, lead and sections of the %s document',
    async (namespace) => {
      await renderSuspended(Document, {
        props: { namespace },
        global: { stubs: { ULink: { template: '<a><slot /></a>' } } },
      });

      expect(screen.getByRole('heading', { level: 1 }).textContent?.trim()).not.toBe('');
      expect(screen.getAllByRole('heading', { level: 2 }).length).toBeGreaterThan(0);
      expect(document.body.textContent).not.toContain('legal.');
    },
  );
});
