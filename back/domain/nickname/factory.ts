import { Injectable } from '@nestjs/common';
import { NicknameRow, NicknameVocabulary } from './type';

const LANGS = ['fr', 'en'] as const;
type Lang = (typeof LANGS)[number];

const VOWELS = 'aeiouyhàâäéèêëîïôöûü';

// The comedy is a human FIRST name on a plant ("Jean-Michel le Monstera").
@Injectable()
export class NicknameFactory {
  // Every nickname row for both languages: a generic bank ('' genus) plus one
  // bank per genus.
  build(vocabulary: NicknameVocabulary): NicknameRow[] {
    const rows: NicknameRow[] = [];
    for (const lang of LANGS) {
      rows.push(...this.bucketRows(vocabulary, '', lang));
      for (const genus of vocabulary.genera) {
        rows.push(...this.bucketRows(vocabulary, genus, lang));
      }
    }
    return rows;
  }

  private bucketRows(
    vocabulary: NicknameVocabulary,
    genus: string,
    lang: Lang,
  ): NicknameRow[] {
    const names = vocabulary.names[lang];
    const words = vocabulary.words[lang];
    const display = this.cap(genus);
    const set = new Set<string>();

    names.forEach((first, index) => {
      if (genus === '') {
        // Generic bank: the bare name plus a lightly decorated variant.
        set.add(first);
        const word = words[index % words.length];
        set.add(word === undefined ? first : `${first} ${word}`);
      } else if (lang === 'fr') {
        set.add(`${first} ${this.frArticle(display)}`);
      } else {
        set.add(`${first} the ${display}`);
      }
    });

    return [...set].map((name) => ({ genus, lang, name }));
  }

  private cap(word: string): string {
    return word.charAt(0).toUpperCase() + word.slice(1);
  }

  // French article with elision before a vowel/mute-h ("le Monstera", "l'Aloe").
  private frArticle(display: string): string {
    return VOWELS.includes(display.charAt(0).toLowerCase())
      ? `l'${display}`
      : `le ${display}`;
  }
}
