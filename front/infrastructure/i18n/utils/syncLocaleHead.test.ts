import { beforeEach, describe, expect, it } from 'vitest';
import { syncLocaleHead } from './syncLocaleHead';

beforeEach(() => {
  document.head.innerHTML = `
    <link rel="canonical" href="https://verdure.test/en">
    <link rel="alternate" hreflang="en" href="https://verdure.test/en">
    <link rel="alternate" hreflang="fr" href="https://verdure.test/fr">
    <meta property="og:url" content="https://verdure.test/en">
    <meta property="og:locale" content="en">
    <meta property="og:locale:alternate" content="fr">
    <meta name="description" content="kept">`;
});

describe('syncLocaleHead', () => {
  it('moves canonical, hreflang, og:url and og:locale to the new language', () => {
    syncLocaleHead(
      document,
      [
        { rel: 'canonical', href: 'https://verdure.test/fr' },
        { rel: 'alternate', hreflang: 'en', href: 'https://verdure.test/en' },
        { rel: 'alternate', hreflang: 'fr', href: 'https://verdure.test/fr' },
      ],
      [
        { property: 'og:url', content: 'https://verdure.test/fr' },
        { property: 'og:locale', content: 'fr' },
        { property: 'og:locale:alternate', content: 'en' },
      ],
    );

    expect(document.head.querySelector('link[rel=canonical]')?.getAttribute('href')).toBe(
      'https://verdure.test/fr',
    );
    expect(document.head.querySelectorAll('link[rel=canonical]')).toHaveLength(1);
    expect(document.head.querySelector('meta[property="og:url"]')?.getAttribute('content')).toBe(
      'https://verdure.test/fr',
    );
    expect(document.head.querySelector('meta[property="og:locale"]')?.getAttribute('content')).toBe(
      'fr',
    );
    expect(document.head.querySelector('meta[name=description]')?.getAttribute('content')).toBe(
      'kept',
    );
  });

  it('creates a tag the server did not render and never duplicates the others', () => {
    document.head.querySelector('link[hreflang=fr]')?.remove();

    syncLocaleHead(
      document,
      [{ rel: 'alternate', hreflang: 'fr', href: 'https://verdure.test/fr' }],
      [],
    );
    syncLocaleHead(
      document,
      [{ rel: 'alternate', hreflang: 'fr', href: 'https://verdure.test/fr' }],
      [],
    );

    expect(document.head.querySelectorAll('link[hreflang=fr]')).toHaveLength(1);
    expect(document.head.querySelectorAll('link[hreflang=en]')).toHaveLength(1);
  });
});
