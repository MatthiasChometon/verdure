import { describe, expect, it } from 'vitest';

type Messages = { [key: string]: string | Messages };

// Raw text, parsed here: the Nuxt i18n transform compiles imported JSON messages
// into an AST, which is not what the files contain.
const localeFiles = import.meta.glob<string>(
  ['../../*/translation/{fr,en}.json', '../../../infrastructure/*/translation/{fr,en}.json'],
  { query: '?raw', import: 'default', eager: true },
);

const flatten = (messages: Messages, prefix = ''): string[] =>
  Object.entries(messages).flatMap(([key, value]): string[] =>
    typeof value === 'string' ? [`${prefix}${key}`] : flatten(value, `${prefix}${key}.`),
  );

const keysOf = (matches: (path: string) => boolean): string[] =>
  Object.entries(localeFiles)
    .filter(([path]): boolean => matches(path))
    .flatMap(([, raw]): string[] => flatten(JSON.parse(raw) as Messages));

const localesOf = (locale: 'fr' | 'en'): Map<string, string[]> =>
  new Map(
    Object.entries(localeFiles)
      .filter(([path]): boolean => path.endsWith(`/${locale}.json`))
      .map(([path, raw]): [string, string[]] => [
        path.replace(/\/(fr|en)\.json$/, ''),
        flatten(JSON.parse(raw) as Messages).sort(),
      ]),
  );
// Keys the slice may use but other layers own (legal.*, auth.*, accessibility.*, ...).
const withNamespaces = (keys: string[]): Set<string> =>
  new Set(
    keys.flatMap((key): string[] =>
      key.split('.').map((_, index, parts): string => parts.slice(0, index + 1).join('.')),
    ),
  );
// tm('legal') reads a whole namespace, so a namespace counts as defined too.
const allFr = withNamespaces(keysOf((path): boolean => path.endsWith('/fr.json')));
const allEn = withNamespaces(keysOf((path): boolean => path.endsWith('/en.json')));

// Every slice: a key may be looked up anywhere, whichever slice owns its block.
const sources = import.meta.glob<string>(['../../*/**/*.{vue,ts}'], {
  query: '?raw',
  import: 'default',
  eager: true,
});
const productionSources = Object.entries(sources).filter(
  ([path]): boolean => !path.endsWith('.test.ts'),
);

// Every way a message is looked up: t(), $t(), obj.t(), $i18n.t(), te(), tm().
// A word character before it (`set(`, `get(`) is not a lookup.
const CALL_HEAD = /(?<![\w$])(?:[\w$]+\.)*\$?(?:t|te|tm)\(\s*/g;
// What a static lookup looks like: one quoted literal, then the end of the arguments.
const STATIC_ARGUMENT = /^'([^'\n]+)'\s*[,)]/;

type Lookup = { call: string; key: string | undefined };

const lookupsIn = (source: string): Lookup[] =>
  [...source.matchAll(CALL_HEAD)].map((head): Lookup => {
    const start = (head.index ?? 0) + head[0].length;
    const argument = source.slice(start, start + 200);
    return { call: head[0] + argument.slice(0, 30), key: STATIC_ARGUMENT.exec(argument)?.[1] };
  });

const staticKeysIn = (source: string): string[] =>
  lookupsIn(source).flatMap(({ key }): string[] => (key === undefined ? [] : [key]));
const dynamicCallsIn = (source: string): string[] =>
  lookupsIn(source)
    .filter(({ key }): boolean => key === undefined)
    .map(({ call }): string => call);

describe('translations', () => {
  it('has the same keys in French and English in every translation folder', () => {
    const fr = localesOf('fr');
    const en = localesOf('en');

    expect(Object.fromEntries(fr)).toEqual(Object.fromEntries(en));
  });

  it('never builds a key dynamically in production code (variable, concatenation, template)', () => {
    const dynamic = productionSources.flatMap(([path, source]): string[] =>
      dynamicCallsIn(source).map((call): string => `${path}: ${call}`),
    );

    expect(dynamic).toEqual([]);
  });

  it('defines in French and in English every key production code looks up', () => {
    const used = new Set(productionSources.flatMap(([, source]): string[] => staticKeysIn(source)));

    expect({
      missingFr: [...used].filter((key): boolean => !allFr.has(key)),
      missingEn: [...used].filter((key): boolean => !allEn.has(key)),
    }).toEqual({ missingFr: [], missingEn: [] });
  });
});

describe('the lookup scanner itself', () => {
  it.each([
    ["t('a.b')", ['a.b']],
    ["$t('a.b', { n: 1 })", ['a.b']],
    ["$i18n.t('a.b')", ['a.b']],
    ["te('a.b')", ['a.b']],
    ["tm('a.b')", ['a.b']],
    ["set('a.b')", []],
    ["get('a.b')", []],
  ])('reads the static keys of %s', (source, keys) => {
    expect(staticKeysIn(source)).toEqual(keys);
  });

  it.each([
    't(key)',
    "t('a.' + suffix)",
    '$t(`a.${suffix}`)',
    'app.$i18n.t(name)',
    "te('a.' + id)",
    'tm(path)',
  ])('flags %s as a dynamic lookup', (source) => {
    expect(dynamicCallsIn(source)).toHaveLength(1);
  });
});
