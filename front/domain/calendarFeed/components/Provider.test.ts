import { renderSuspended } from '@nuxt/test-utils/runtime';
import { screen } from '@testing-library/vue';
import { describe, expect, it } from 'vitest';
import Provider from './Provider.vue';

const props = {
  title: 'Google Agenda',
  lead: 'Ajoutez le calendrier.',
  openLabel: 'Ouvrir',
  to: 'https://calendar.example/add',
};

describe('CalendarFeedProvider', () => {
  it('opens an external provider in a new window and announces it', async () => {
    await renderSuspended(Provider, { props: { ...props, external: true } });

    const link = screen.getByRole('link', { name: /Ouvrir/ });
    expect(link.getAttribute('href')).toBe(props.to);
    expect(link.getAttribute('target')).toBe('_blank');
    expect(link.getAttribute('rel')).toBe('noopener noreferrer');
    expect(link.querySelector('.sr-only')).not.toBeNull();
  });

  it('hands off to the OS without a new window when it is not external', async () => {
    await renderSuspended(Provider, { props });

    const link = screen.getByRole('link', { name: 'Ouvrir' });
    expect(link.getAttribute('target')).toBeNull();
    expect(link.querySelector('.sr-only')).toBeNull();
  });
});
