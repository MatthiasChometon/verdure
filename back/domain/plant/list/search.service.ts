import { Inject, Injectable } from '@nestjs/common';
import { type SQL, sql } from 'drizzle-orm';
import {
  DATABASE,
  type Database,
} from '../../../infrastructure/database/token';
import { plant } from '../schema';
import { PlantsArgs } from './args';
import { Relevance } from './type';

// Below this trigram word-similarity a match is considered noise.
const SIMILARITY_THRESHOLD = 0.3;

// pg_trgm/unaccent may be missing on an old server (e.g. 9.6): probed once at runtime
// (memoised, not a static flag) and falls back to an accent-folded ILIKE.
@Injectable()
export class PlantSearchService {
  private simpleSearch = true;
  private advancedProbe: Promise<boolean> | undefined;

  constructor(@Inject(DATABASE) private readonly database: Database) {}

  // The relevance (where + rank) for the args' search term, or undefined when
  // there is no search. Settles the keyword mode first (once, memoised).
  async relevanceFor(args: PlantsArgs): Promise<Relevance | undefined> {
    await this.detectMode();
    const search = args.search?.trim();
    return search !== undefined && search !== ''
      ? this.buildRelevance(search)
      : undefined;
  }

  // Embeddings are unit-normalised, so cosine similarity is a plain dot
  // product; un-embedded plants sort last.
  semanticOrder(embedding: number[]): SQL {
    const literal = `{${embedding.join(',')}}`;
    return sql`cosine_similarity(${plant.embedding}, ${literal}::real[]) desc nulls last`;
  }

  private async detectMode(): Promise<void> {
    this.advancedProbe ??= this.probeAdvanced();
    this.simpleSearch = !(await this.advancedProbe);
  }

  // word_similarity (pg_trgm) and unaccent are the two features the advanced
  // relevance relies on; if either is missing the query throws and we stay simple.
  private async probeAdvanced(): Promise<boolean> {
    try {
      await this.database.execute(
        sql`select unaccent('x'), word_similarity('x', 'x')`,
      );
      return true;
    } catch {
      return false;
    }
  }

  // Full-text (prefix) matching for relevance + trigram word-similarity so a
  // typo like "montera" still finds "Monstera".
  private buildRelevance(search: string): Relevance {
    if (this.simpleSearch) {
      return this.simpleRelevance(search);
    }
    // unaccent both sides so "med" matches "Médore" (é vs e). The tsquery below
    // stays accent-sensitive; this fuzzy branch covers the accent-folded case.
    const nameSimilarity = sql`word_similarity(unaccent(${search}), unaccent(${plant.name}))`;
    const speciesSimilarity = sql`word_similarity(unaccent(${search}), unaccent(${plant.species}))`;
    const fuzzyMatch = sql`(${nameSimilarity} > ${SIMILARITY_THRESHOLD} or ${speciesSimilarity} > ${SIMILARITY_THRESHOLD})`;
    const bestSimilarity = sql`greatest(${nameSimilarity}, ${speciesSimilarity})`;

    // Turn the input into a prefix tsquery ("mons del" -> "mons:* & del:*"),
    // stripping anything that is not a letter or digit to stay injection-safe.
    const tsqueryString = search
      .split(/\s+/)
      .map((word) => word.replace(/[^\p{L}\p{N}]/gu, ''))
      .filter((word) => word.length > 0)
      .map((word) => `${word}:*`)
      .join(' & ');

    if (tsqueryString === '') {
      return { where: fuzzyMatch, rank: bestSimilarity };
    }

    const query = sql`to_tsquery('simple', ${tsqueryString})`;
    return {
      where: sql`(${plant.searchVector} @@ ${query} or ${fuzzyMatch})`,
      rank: sql`ts_rank(${plant.searchVector}, ${query}) + ${bestSimilarity}`,
    };
  }

  // `translate()` maps char-by-position, so both strings must stay the same length.
  // Lets an old Postgres fold accents without the unaccent extension.
  private static readonly ACCENTS_FROM = 'àáâãäåçèéêëìíîïñòóôõöùúûüýÿ';
  private static readonly ACCENTS_TO = 'aaaaaaceeeeiiiinooooouuuuyy';

  // No pg_trgm/unaccent here: accent/case-insensitive substring match, no typo tolerance.
  private simpleRelevance(search: string): Relevance {
    // Fold the query the same way the columns are folded (strip diacritics,
    // lowercase), then escape LIKE wildcards.
    const folded = search
      .normalize('NFD')
      .replace(/\p{Diacritic}/gu, '')
      .toLowerCase()
      .replace(/[\\%_]/g, '\\$&');
    const contains = `%${folded}%`;
    const prefix = `${folded}%`;
    const from = PlantSearchService.ACCENTS_FROM;
    const to = PlantSearchService.ACCENTS_TO;
    const name = sql`translate(lower(${plant.name}), ${from}, ${to})`;
    const species = sql`translate(lower(${plant.species}), ${from}, ${to})`;
    return {
      where: sql`(${name} like ${contains} or ${species} like ${contains})`,
      // A starts-with match ranks above a mere substring; ties fall back to id.
      rank: sql`(case when ${name} like ${prefix} or ${species} like ${prefix} then 1 else 0 end)`,
    };
  }
}
