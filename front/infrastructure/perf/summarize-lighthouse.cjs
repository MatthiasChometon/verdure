// Per URL: the benchmarkIndex of every Lighthouse run, and the TBT of every run, with
// median, min and max, on one greppable line each ("LH-SUMMARY"). A TBT median only compares
// with another run whose benchmarkIndex is close: the CI runner speed varies between jobs.
// The throttling factor applied and the free RAM of the runner are on the line too: the factor is
// 4 * benchmarkIndex / reference, so TBT is read against a speed-corrected budget.
const fs = require('node:fs');
const os = require('node:os');

const median = (values) => {
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 1 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2;
};

const stats = (values) =>
  `median ${Math.round(median(values))} min ${Math.round(Math.min(...values))} max ${Math.round(Math.max(...values))}`;

const summarize = (dirs, freeRamMb = Math.round(os.freemem() / 1024 / 1024)) => {
  const byUrl = new Map();
  for (const dir of dirs) {
    if (!fs.existsSync(dir)) continue;
    for (const file of fs.readdirSync(dir).filter((name) => /report\.json$/.test(name))) {
      const report = JSON.parse(fs.readFileSync(`${dir}/${file}`, 'utf8'));
      const entry = byUrl.get(report.finalUrl) ?? { tbt: [], bench: [], factor: [] };
      entry.tbt.push(report.audits['total-blocking-time'].numericValue);
      entry.bench.push(report.environment.benchmarkIndex);
      entry.factor.push(report.configSettings.throttling.cpuSlowdownMultiplier);
      byUrl.set(report.finalUrl, entry);
    }
  }
  return [...byUrl].map(
    ([url, { tbt, bench, factor }]) =>
      `LH-SUMMARY ${url} runs ${tbt.length} | benchmarkIndex ${stats(bench)} [${bench.map(Math.round).join(', ')}] | cpuSlowdown ${[...new Set(factor)].join('/')} | free RAM ${freeRamMb} MB | TBT ms ${stats(tbt)} [${tbt.map(Math.round).join(', ')}]`,
  );
};

if (require.main === module) {
  for (const line of summarize(process.argv.slice(2))) console.log(line);
}

module.exports = { median, summarize };
