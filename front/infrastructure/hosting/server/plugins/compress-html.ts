import { gzipSync } from 'node:zlib';

// The Nitro server compresses the built assets (compressPublicAssets) but not the
// pages it renders: a page is about 76 KB of markup and payload, which is seconds
// on the slow 4G the LCP budget is measured on. Gzip it when the browser accepts it.
export default defineNitroPlugin((nitro) => {
  nitro.hooks.hook('render:response', (response, { event }) => {
    const accepts = String(event.node.req.headers['accept-encoding'] ?? '');
    const isHtml = String(response.headers?.['content-type'] ?? '').includes('text/html');
    if (!isHtml || !accepts.includes('gzip') || typeof response.body !== 'string') return;
    response.body = gzipSync(response.body) as unknown as string;
    response.headers = {
      ...response.headers,
      'content-encoding': 'gzip',
      vary: 'accept-encoding',
    };
  });
});
