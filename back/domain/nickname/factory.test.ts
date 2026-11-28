import { NicknameFactory } from './factory';

const factory = new NicknameFactory();

describe('NicknameFactory.build', () => {
  const vocabulary = {
    names: { fr: ['Jean-Michel', 'Odile'], en: ['Kevin'] },
    words: { fr: ['Junior'], en: [] },
    genera: ['monstera', 'aloe'],
  };
  const rows = factory.build(vocabulary);
  const namesOf = (genus: string, lang: string): string[] =>
    rows
      .filter((row) => row.genus === genus && row.lang === lang)
      .map((row) => row.name);

  it('decorates generic names with the words of the language, cycling', () => {
    expect(namesOf('', 'fr')).toEqual([
      'Jean-Michel',
      'Jean-Michel Junior',
      'Odile',
      'Odile Junior',
    ]);
  });

  it('keeps the bare name when the language has no decorating word', () => {
    expect(namesOf('', 'en')).toEqual(['Kevin']);
  });

  it('builds a genus bank with the article of each language, eliding before a vowel', () => {
    expect(namesOf('monstera', 'fr')).toEqual([
      'Jean-Michel le Monstera',
      'Odile le Monstera',
    ]);
    expect(namesOf('aloe', 'fr')).toEqual([
      "Jean-Michel l'Aloe",
      "Odile l'Aloe",
    ]);
    expect(namesOf('monstera', 'en')).toEqual(['Kevin the Monstera']);
  });
});
