// Fails when the API declares a GraphQL query, mutation or REST route that has no entry in
// budgets.ts (and so no p95/p99 budget and no k6 call: api.ts is typed by that table).
// Run from devops/load: `node check-coverage.mjs`. No dependency.
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

const BACK = join(import.meta.dirname, '..', '..', 'back');

const sourcesUnder = (directory) =>
  readdirSync(directory).flatMap((name) => {
    const path = join(directory, name);
    if (statSync(path).isDirectory())
      return name === 'node_modules' ? [] : sourcesUnder(path);
    return /\.ts$/.test(name) && !/\.test\.ts$/.test(name) ? [path] : [];
  });

const routeTag = (method, path) =>
  `${method}_${path.replace(/[^a-zA-Z0-9]+/g, '_').replace(/^_|_$/g, '')}`;

const routes = ['domain', 'infrastructure'].flatMap((root) =>
  sourcesUnder(join(BACK, root)).flatMap((file) => {
    const source = readFileSync(file, 'utf8');
    const prefix = /@Controller\('([^']*)'\)/.exec(source)?.[1];
    if (prefix === undefined) return [];
    return [...source.matchAll(/@(Get|Post)\((?:'([^']*)')?\)/g)].map(
      ([, method, path]) =>
        routeTag(
          method.toUpperCase(),
          `/${[prefix, path].filter(Boolean).join('/')}`,
        ),
    );
  }),
);

const schema = readFileSync(
  join(BACK, 'infrastructure', 'graphql', 'schema.gql'),
  'utf8',
)
  .replace(/\r\n/g, '\n')
  .replace(/"""[\s\S]*?"""/g, '');
const operations = ['Query', 'Mutation'].flatMap((root) => {
  const body = new RegExp(`type ${root} \\{([\\s\\S]*?)\\n\\}`).exec(
    schema,
  )?.[1];
  return [...(body ?? '').matchAll(/^\s{2}(\w+)/gm)].map(([, field]) => field);
});

// The tags budgets.ts declares: every quoted word of its BUDGETS table.
const budgets = readFileSync(join(import.meta.dirname, 'budgets.ts'), 'utf8');
const table = budgets.slice(
  budgets.indexOf('export const BUDGETS'),
  budgets.indexOf('export type Operation'),
);
const budgeted = new Set([...table.matchAll(/'(\w+)'/g)].map(([, tag]) => tag));

const missing = [...operations, ...routes].filter((tag) => !budgeted.has(tag));
const stale = [...budgeted].filter(
  (tag) => !operations.includes(tag) && !routes.includes(tag),
);
if (missing.length > 0 || stale.length > 0) {
  console.error(`No budget for: ${missing.join(', ') || '-'}`);
  console.error(`Budget without operation: ${stale.join(', ') || '-'}`);
  process.exit(1);
}
console.log(`${budgeted.size} operations, each with a budget and a k6 call.`);
