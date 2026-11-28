import { entryOf, localise } from './lookup';

describe('entryOf', () => {
  const catalog = { monstera: 'known' };

  it('finds an entry of the catalog', () => {
    expect(entryOf(catalog, 'monstera')).toBe('known');
  });

  it('does not see what the catalog inherits from Object.prototype', () => {
    expect(entryOf(catalog, 'constructor')).toBeUndefined();
    expect(entryOf(catalog, '__proto__')).toBeUndefined();
  });
});

describe('localise', () => {
  const text = { fr: 'bonjour', en: 'hello' };

  it.each(['fr', 'FR', 'fr-FR'])('answers French for %s', (lang) => {
    expect(localise(text, lang)).toBe('bonjour');
  });

  it.each(['en', 'de', ''])('answers English for %s', (lang) => {
    expect(localise(text, lang)).toBe('hello');
  });
});
