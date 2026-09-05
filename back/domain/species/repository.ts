import { Inject, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { asc, sql } from 'drizzle-orm';
import { DATABASE, type Database } from '../../infrastructure/database/token';
import { SpeciesMatch } from '../../infrastructure/taxonomy/type';
import { species } from './schema';

// Trigram word-similarity floor (below this a fuzzy match is noise). Lower than
// the pg_trgm default so a typo like "raflésia" still reaches "Rafflesia".
const WORD_SIMILARITY_THRESHOLD = 0.3;

@Injectable()
export class SpeciesRepository {
  // Old Postgres (no pg_trgm) falls back to a plain prefix ILIKE. Species names
  // are unaccented Latin, so a diacritic-stripped query still matches.
  private readonly simpleSearch: boolean;

  constructor(
    @Inject(DATABASE) private readonly database: Database,
    config: ConfigService,
  ) {
    this.simpleSearch = config.get('SEARCH_MODE') === 'simple';
  }

  // Autocomplete over the local index: exact prefix first, then trigram
  // fuzzy so typos still resolve. Both clauses use the GIN trigram index.
  async search(term: string, limit: number): Promise<{ name: string }[]> {
    // Species names are unaccented Latin, so strip diacritics from the query:
    // "raflésia" -> "raflesia" scores far higher against "Rafflesia".
    const trimmed = term
      .trim()
      .normalize('NFD')
      .replace(/\p{Diacritic}/gu, '');
    if (trimmed.length < 2) {
      return [];
    }
    const prefix = `${trimmed}%`;

    if (this.simpleSearch) {
      return this.database
        .select({ name: species.name })
        .from(species)
        .where(sql`${species.name} ilike ${prefix}`)
        .orderBy(asc(species.name))
        .limit(limit);
    }

    return this.database.transaction(async (tx) => {
      // SET does not accept bind parameters, so inline the (constant) value.
      await tx.execute(
        sql.raw(
          `set local pg_trgm.word_similarity_threshold = ${WORD_SIMILARITY_THRESHOLD}`,
        ),
      );
      return tx
        .select({ name: species.name })
        .from(species)
        .where(
          sql`(${species.name} ilike ${prefix} or ${trimmed} <% ${species.name})`,
        )
        .orderBy(
          // Exact prefix wins, then closeness to the full name, then to the
          // genus (first word) — "raflesia" ranks Rafflesia above a mere substring match.
          sql`(${species.name} ilike ${prefix}) desc`,
          sql`word_similarity(${trimmed}, ${species.name}) desc`,
          sql`word_similarity(${trimmed}, split_part(${species.name}, ' ', 1)) desc`,
          asc(species.name),
        )
        .limit(limit);
    });
  }

  // Reconcile a free-text guess (e.g. from the vision model) to the closest
  // real species in the index, or undefined if nothing is close enough.
  async match(query: string): Promise<string | undefined> {
    const [best] = await this.search(query, 1);
    return best?.name;
  }

  async count(): Promise<number> {
    const [row] = await this.database
      .select({ count: sql<number>`count(*)`.mapWith(Number) })
      .from(species);
    return row?.count ?? 0;
  }

  async cache(matches: SpeciesMatch[]): Promise<void> {
    if (matches.length === 0) {
      return;
    }
    await this.database
      .insert(species)
      .values(
        matches.map((match) => ({ gbifKey: match.key, name: match.name })),
      )
      .onConflictDoNothing();
  }
}
