import { gzipSync } from 'node:zlib';

// The Nitro server compresses the built assets (compressPublicAssets) but not the
// pages it renders: a page is about 76 KB of markup and payload, which is seconds
// on the slow 4G the LCP budget is measured on. Two things fix that here:
// - the stylesheets are inlined, so the first paint no longer waits for a second
//   round trip to fetch them (a render-blocking request costs one on that network);
// - the page is gzipped when the browser accepts it.
const STYLESHEET = /<link rel="stylesheet" href="(\/_nuxt\/[^"]+\.css)"[^>]*>/g;

type Nitro = Parameters<Parameters<typeof defineNitroPlugin>[0]>[0];

const styles = new Map<string, string>();

const inlinedStyle = async (nitro: Nitro, href: string): Promise<string | undefined> => {
  if (!styles.has(href)) {
    const response = await nitro.localFetch(href);
    if (!response.ok) return undefined;
    // The sheet's relative urls (../_fonts/...) were relative to /_nuxt/.
    styles.set(href, (await response.text()).replaceAll('url(../', 'url(/'));
  }
  return styles.get(href);
};

const inlineStylesheets = async (nitro: Nitro, html: string): Promise<string> => {
  let result = html;
  for (const [link, href] of html.matchAll(STYLESHEET)) {
    const css = await inlinedStyle(nitro, href as string).catch(() => undefined);
    if (css !== undefined) result = result.replace(link, () => `<style>${css}</style>`);
  }
  return result;
};

export default defineNitroPlugin((nitro) => {
  nitro.hooks.hook('render:response', async (response, { event }) => {
    const accepts = String(event.node.req.headers['accept-encoding'] ?? '');
    const isHtml = String(response.headers?.['content-type'] ?? '').includes('text/html');
    if (!isHtml || typeof response.body !== 'string') return;
    const html = await inlineStylesheets(nitro, response.body);
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
