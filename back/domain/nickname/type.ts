export type NicknameRow = { genus: string; lang: string; name: string };

export type NicknameSourceKind = 'name' | 'word' | 'genus';

export type NicknameVocabulary = {
  names: { fr: string[]; en: string[] };
  words: { fr: string[]; en: string[] };
  genera: string[];
};
