import { Injectable } from '@nestjs/common';
import { NicknameRow, NicknameVocabulary } from './type';

type Lang = 'fr' | 'en';

const VOWELS = 'aeiouyhàâäéèêëîïôöûü';

// Builds the funny-nickname bank rows from a curated vocabulary (first names,
// decorator words and genera, loaded from the database). The comedy is a human
// FIRST name on a plant ("Jean-Michel le Monstera", "Donald the Cactus").
@Injectable()
export class NicknameFactory {
  // Every nickname row for both languages: a generic bank ('' genus) plus one
  // bank per genus.
  build(vocabulary: NicknameVocabulary): NicknameRow[] {
    const rows: NicknameRow[] = [];
    for (const lang of ['fr', 'en'] as Lang[]) {
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
        set.add(`${first} ${words[index % words.length]}`);
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
