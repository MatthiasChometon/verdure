import type { Localised } from '../plant/type';

// A catalog is keyed by genus, which comes from user text: 'constructor' or
// '__proto__' must read as "not in the catalog", not as members inherited from
// Object.prototype.
export const entryOf = <Entry>(
  catalog: Readonly<Record<string, Entry>>,
  genus: string,
): Entry | undefined =>
  Object.hasOwn(catalog, genus) ? catalog[genus] : undefined;

// French for any French locale ('fr', 'fr-FR'), English for everything else.
export const localise = (text: Localised, lang: string): string =>
  lang.toLowerCase().startsWith('fr') ? text.fr : text.en;
