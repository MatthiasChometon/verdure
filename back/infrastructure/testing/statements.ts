import { sql } from 'drizzle-orm';
import { type Database } from '../database/token';

// What the database did for one operation, read from pg_stat_statements: the
// extension updates its counters as each statement ends (the table statistics
// of pg_stat_user_tables flush up to 10 s later, which made a fixed sleep).
export type StatementWork = {
  // Statements the operation sent: the guard against a query per row (N+1).
  calls: number;
  // 8 kB pages the statements touched, in cache or read from disk.
  blocks: number;
  // The same, for the statements that read `table`.
  blocksOn: (table: string) => number;
};

type StatementRow = { query: string; calls: string; blocks: string };

export const statementsAvailable = async (
  database: Database,
): Promise<boolean> => {
  const rows = await database.execute<{ present: boolean }>(
    sql`select exists (select 1 from pg_extension where extname = 'pg_stat_statements') as present`,
  );
  return rows[0]?.present === true;
};

// Runs `operation` between a reset and a read of the counters. The statements
// that read the counters themselves are left out.
export const measureStatements = async (
  database: Database,
  operation: () => Promise<unknown>,
): Promise<StatementWork> => {
  await database.execute(sql`select pg_stat_statements_reset()`);
  await operation();
  const rows = await database.execute<StatementRow>(sql`
    select query, calls::text as calls,
           (shared_blks_hit + shared_blks_read)::text as blocks
    from pg_stat_statements
    where dbid = (select oid from pg_database where datname = current_database())
      and query not ilike '%pg_stat_statements%'`);
  return {
    calls: rows.reduce((total, row) => total + Number(row.calls), 0),
    blocks: rows.reduce((total, row) => total + Number(row.blocks), 0),
    blocksOn: (table) =>
      rows
        .filter((row) => row.query.includes(`"${table}"`))
        .reduce((total, row) => total + Number(row.blocks), 0),
  };
};
