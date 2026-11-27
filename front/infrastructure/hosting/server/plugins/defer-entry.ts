// The entry script and the scripts it imports (about 200 KB gzipped) start loading as soon as the
// HTML is parsed, while the browser is still painting. Lighthouse counts every request started
// before the largest contentful paint against it, so the paint waits for scripts it does not use.
// The page is complete server-rendered markup and CSS: the entry script is added once the browser
// has painted and loaded, which is when hydration starts anyway.
const ENTRY_SCRIPT = /<script type="module" src="([^"]+)"[^>]*><\/script>/;
const MODULE_PRELOAD = /<link rel="modulepreload"[^>]*>/g;

const loader = (src: string): string =>
  `<script>addEventListener('load',function(){requestAnimationFrame(function(){setTimeout(function(){var s=document.createElement('script');s.type='module';s.crossOrigin='';s.src=${JSON.stringify(src)};document.head.appendChild(s)})})})</script>`;

export default defineNitroPlugin((nitro) => {
  nitro.hooks.hook('render:html', (html) => {
    html.head = html.head.map((part) => part.replace(MODULE_PRELOAD, ''));
    html.bodyAppend = html.bodyAppend.map((part) => part.replace(MODULE_PRELOAD, ''));
    for (const key of ['head', 'bodyAppend'] as const) {
      html[key] = html[key].map((part) =>
        part.replace(ENTRY_SCRIPT, (_whole, src: string) => loader(src)),
      );
    }
  });
});
