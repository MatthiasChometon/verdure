import { describe, expect, it } from 'vitest';

type Messages = { [key: string]: string | Messages };

// Raw text, parsed here: the Nuxt i18n transform compiles imported JSON messages
// into an AST, which is not what the files contain.
const locales = import.meta.glob<string>('./{fr,en}.json', {
  query: '?raw',
  import: 'default',
  eager: true,
});
const messagesOf = (file: string): Messages => JSON.parse(locales[file] ?? '{}') as Messages;

const flatten = (messages: Messages, prefix = ''): string[] =>
  Object.entries(messages).flatMap(([key, value]): string[] =>
    typeof value === 'string' ? [`${prefix}${key}`] : flatten(value, `${prefix}${key}.`),
  );

const sources = import.meta.glob<string>('../**/*.{vue,ts}', {
  query: '?raw',
  import: 'default',
  eager: true,
});
const productionSources = Object.entries(sources).filter(
  ([path]): boolean => !path.endsWith('.test.ts'),
);

// `t('key')` / `$t('key')` — the identifier must not be a method (`.set(`, `get(`).
const STATIC_CALL = /(?<![\w.])\$?t\(\s*'([^']+)'/g;
const ANY_CALL = /(?<![\w.])\$?t\(\s*([^\s)])/g;

const frKeys = flatten(messagesOf('./fr.json'));
const enKeys = flatten(messagesOf('./en.json'));

describe('plant translations', () => {
  it('has the same keys in French and English', () => {
    expect([...frKeys].sort()).toEqual([...enKeys].sort());
  });

  it('only calls t() with a string literal, never a key held in a variable', () => {
    const dynamic = productionSources.flatMap(([path, source]): string[] =>
      [...source.matchAll(ANY_CALL)]
        .filter((match): boolean => match[1] !== "'")
        .map((match): string => `${path}: ${match[0]}`),
    );

    expect(dynamic).toEqual([]);
  });

  it('defines, in both languages, every plant key the slice uses', () => {
    const used = new Set(
      productionSources.flatMap(([, source]): string[] =>
        [...source.matchAll(STATIC_CALL)]
          .map((match): string => match[1] ?? '')
          .filter((key): boolean => key.startsWith('plant.')),
      ),
    );
    const defined = new Set(frKeys);

    expect([...used].filter((key): boolean => !defined.has(key))).toEqual([]);
  });
});
