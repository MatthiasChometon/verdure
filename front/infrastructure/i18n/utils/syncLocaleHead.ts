// Any head entry (the i18n tags are interfaces without an index signature).
type HeadTag = object;

const attributeValue = (tag: HeadTag, name: string): string | undefined => {
  const value: unknown = Reflect.get(tag, name);
  return typeof value === 'string' ? value : undefined;
};

// A `<link>` is identified by its rel and, for alternates, its hreflang; a `<meta>` by its
// property. Everything else on the tag (href, content) is what a locale change updates.
const findLink = (doc: Document, tag: HeadTag): Element | null => {
  const rel = attributeValue(tag, 'rel');
  if (rel === 'canonical') return doc.head.querySelector('link[rel="canonical"]');
  const hreflang = attributeValue(tag, 'hreflang');
  return rel === 'alternate' && hreflang
    ? doc.head.querySelector(`link[rel="alternate"][hreflang="${CSS.escape(hreflang)}"]`)
    : null;
};
const findMeta = (doc: Document, tag: HeadTag): Element | null => {
  const property = attributeValue(tag, 'property');
  const content = attributeValue(tag, 'content');
  if (property === 'og:locale:alternate' && content) {
    return doc.head.querySelector(
      `meta[property="og:locale:alternate"][content="${CSS.escape(content)}"]`,
    );
  }
  return property === 'og:url' || property === 'og:locale'
    ? doc.head.querySelector(`meta[property="${property}"]`)
    : null;
};

const apply = (doc: Document, name: 'link' | 'meta', tag: HeadTag, found: Element | null): void => {
  const element = found ?? doc.head.appendChild(doc.createElement(name));
  for (const [attribute, value] of Object.entries(tag)) {
    if (typeof value === 'string') element.setAttribute(attribute, value);
  }
};

/**
 * Keeps the canonical URL, the hreflang alternates, `og:url` and `og:locale` in line with the
 * current language after a client-side language change. The server renders them once; instead of
 * making every page keep about 20 reactive head entries alive, only these tags are patched in
 * place, and only when the language actually changes.
 */
export const syncLocaleHead = (doc: Document, links: HeadTag[], metas: HeadTag[]): void => {
  for (const tag of links) {
    const rel = attributeValue(tag, 'rel');
    if (rel === 'canonical' || rel === 'alternate') apply(doc, 'link', tag, findLink(doc, tag));
  }
  for (const tag of metas) {
    const property = attributeValue(tag, 'property');
    if (property === 'og:url' || property === 'og:locale' || property === 'og:locale:alternate') {
      apply(doc, 'meta', tag, findMeta(doc, tag));
    }
  }
};
