/* eslint-disable @typescript-eslint/explicit-function-return-type -- plain CommonJS diagnostic script, no TypeScript return types */
// Diagnostic, not a budget: where the main thread of a page spends its time on the CI runner, at
// real speed (no throttling). The long-task list of Lighthouse says how long, this says on what.
//   node lighthouse-profile.cjs <url> [runs]
const { chromium } = require('@playwright/test');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const KINDS = [
  'EvaluateScript',
  'v8.compile',
  'v8.evaluateModule',
  'FunctionCall',
  'Layout',
  'UpdateLayoutTree',
  'Paint',
  'ParseHTML',
  'RunMicrotasks',
  'EventDispatch',
  'TimerFire',
  'FireAnimationFrame',
  'MinorGC',
  'MajorGC',
  'V8.GC_MARK_COMPACTOR',
  'ResourceFinish',
];

const urlOf = (e) => {
  const d = (e.args && e.args.data) || {};
  const u = d.url || d.fileName || d.scriptName || '';
  return u ? u.split('/').pop() : '';
};

const profile = async (browser, url) => {
  const page = await browser.newPage({ viewport: { width: 412, height: 823 } });
  const file = path.join(os.tmpdir(), `trace-${Date.now()}.json`);
  await browser.startTracing(page, {
    path: file,
    categories: ['devtools.timeline', 'v8.execute', 'disabled-by-default-devtools.timeline'],
  });
  await page.goto(url, { waitUntil: 'load' });
  await page.waitForTimeout(2500);
  await browser.stopTracing();
  await page.close();
  const events = JSON.parse(fs.readFileSync(file, 'utf8')).traceEvents;
  const mains = events.filter((e) => e.name === 'thread_name' && e.args.name === 'CrRendererMain');
  const busiest = (m) =>
    events
      .filter((e) => e.pid === m.pid && e.tid === m.tid && e.name === 'RunTask')
      .reduce((s, e) => s + e.dur, 0);
  const main = mains.sort((a, b) => busiest(b) - busiest(a))[0];
  return events.filter((e) => e.pid === main.pid && e.tid === main.tid && e.ph === 'X');
};

const report = (x) => {
  const t0 = Math.min(...x.map((e) => e.ts));
  const ms = (us) => Math.round(us / 100) / 10;
  const totals = {};
  for (const e of x) if (KINDS.includes(e.name)) totals[e.name] = (totals[e.name] || 0) + e.dur;
  console.log(
    ' totals ms',
    JSON.stringify(Object.fromEntries(Object.entries(totals).map(([k, v]) => [k, ms(v)]))),
  );
  const scripts = {};
  for (const e of x) {
    if (!['EvaluateScript', 'v8.compile', 'v8.evaluateModule'].includes(e.name)) continue;
    const u = urlOf(e) || '(inline)';
    scripts[u] = (scripts[u] || 0) + e.dur;
  }
  const top = Object.entries(scripts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8);
  console.log(' scripts ms', top.map(([u, v]) => `${u} ${ms(v)}`).join(' | '));
  for (const t of x
    .filter((e) => e.name === 'RunTask' && e.dur > 9000)
    .sort((a, b) => a.ts - b.ts)) {
    const kids = x
      .filter(
        (e) => e !== t && e.ts >= t.ts && e.ts + e.dur <= t.ts + t.dur && KINDS.includes(e.name),
      )
      .sort((a, b) => b.dur - a.dur)
      .slice(0, 3);
    const what = kids
      .map((k) => `${k.name}:${ms(k.dur)}${urlOf(k) ? ' ' + urlOf(k) : ''}`)
      .join(' | ');
    console.log(` task at ${Math.round((t.ts - t0) / 1000)} ms lasts ${ms(t.dur)} ms: ${what}`);
  }
};

(async () => {
  const url = process.argv[2];
  const runs = Number(process.argv[3] || 3);
  const browser = await chromium.launch({
    executablePath: process.env.CHROME_PATH || undefined,
    args: ['--no-sandbox'],
  });
  for (let i = 0; i < runs; i += 1) {
    console.log(`profile ${url} run ${i + 1}`);
    report(await profile(browser, url));
  }
  await browser.close();
})();
