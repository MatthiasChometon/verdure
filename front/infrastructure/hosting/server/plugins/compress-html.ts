import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { gzipSync } from 'node:zlib';

// The Nitro server compresses the built assets (compressPublicAssets) but not the
// pages it renders: a page is about 76 KB of markup and payload, which is seconds
// on the slow 4G the LCP budget is measured on. Two things fix that here:
// - the stylesheets are inlined, so the first paint no longer waits for a second
//   round trip to fetch them (a render-blocking request costs one on that network);
// - the page is gzipped when the browser accepts it.
const STYLESHEET = /<link rel="stylesheet" href="(\/_nuxt\/[^"]+\.css)"[^>]*>/g;

const styles = new Map<string, string>();

// The plugin ends up in a chunk whose depth under .output/server varies: try each.
const PUBLIC_DIRECTORIES = ['../public', '../../public', '../../../public'].map(
  (relative) => new URL(`${relative}/`, import.meta.url),
);

const readPublic = (href: string): string | undefined => {
  for (const directory of PUBLIC_DIRECTORIES) {
    try {
      return readFileSync(fileURLToPath(new URL(href.slice(1), directory)), 'utf8');
    } catch {
      // Not this directory.
    }
  }
  return undefined;
};

const inlinedStyle = (href: string): string | undefined => {
  if (!styles.has(href)) {
    const css = readPublic(href);
    // The sheet's relative urls (../_fonts/...) were relative to /_nuxt/.
    if (css !== undefined) styles.set(href, css.replaceAll('url(../', 'url(/'));
  }
  return styles.get(href);
};

export default defineNitroPlugin((nitro) => {
  nitro.hooks.hook('render:response', (response, { event }) => {
    const accepts = String(event.node.req.headers['accept-encoding'] ?? '');
    const isHtml = String(response.headers?.['content-type'] ?? '').includes('text/html');
    if (!isHtml || typeof response.body !== 'string') return;
    const html = response.body.replace(STYLESHEET, (link, href: string) => {
      const css = inlinedStyle(href);
      return css === undefined ? link : `<style>${css}</style>`;
    });
    if (!accepts.includes('gzip')) {
      response.body = html;
      return;
    }
    response.body = gzipSync(html);
    response.headers = {
      ...response.headers,
      'content-encoding': 'gzip',
      vary: 'accept-encoding',
    };
  });
});
