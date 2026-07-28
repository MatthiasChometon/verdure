import { Inject, Injectable } from '@nestjs/common';
import { and, eq, notInArray, or, sql } from 'drizzle-orm';
import { DATABASE, type Database } from '../../infrastructure/database/token';
import { nickname, nicknameSource } from './schema';
import { type NicknameRow, type NicknameVocabulary } from './type';

// Postgres caps a statement at 65535 bind parameters; 3 columns per row means we
// insert in chunks well under that.
const INSERT_CHUNK = 5000;

@Injectable()
export class NicknameRepository {
  constructor(@Inject(DATABASE) private readonly database: Database) {}

  async count(): Promise<number> {
    const [row] = await this.database
      .select({ count: sql<number>`count(*)`.mapWith(Number) })
      .from(nickname);
    return row?.count ?? 0;
  }

  // The curated source vocabulary the bank is generated from, assembled from the
  // flat nickname_source rows seeded by the migration.
  async loadVocabulary(): Promise<NicknameVocabulary> {
    const rows = await this.database
      .select({
        kind: nicknameSource.kind,
        lang: nicknameSource.lang,
        value: nicknameSource.value,
      })
      .from(nicknameSource);

    const vocabulary: NicknameVocabulary = {
      names: { fr: [], en: [] },
      words: { fr: [], en: [] },
      genera: [],
    };
    for (const row of rows) {
      const lang = row.lang === 'fr' ? 'fr' : 'en';
      if (row.kind === 'genus') {
        vocabulary.genera.push(row.value);
      } else if (row.kind === 'name') {
        vocabulary.names[lang].push(row.value);
      } else if (row.kind === 'word') {
        vocabulary.words[lang].push(row.value);
      }
    }
    return vocabulary;
  }

  // Replace the whole bank with a freshly generated set (used by the boot seeder
  // and the CLI seed). Chunked to stay under Postgres' parameter limit.
  async replaceAll(rows: NicknameRow[]): Promise<void> {
    await this.database.delete(nickname);
    for (let i = 0; i < rows.length; i += INSERT_CHUNK) {
      await this.database
        .insert(nickname)
        .values(rows.slice(i, i + INSERT_CHUNK));
    }
  }

  // Pick a random pre-generated nickname for the plant genus (or the generic
  // bank when no genus is given) in `lang`, skipping names the user already uses.
  // Genus-specific names are preferred; the generic bank is the fallback both
  // for un-seeded genera and when every genus name is already taken.
  async pick(
    genus: string | undefined,
    lang: string,
    taken: string[],
  ): Promise<string | undefined> {
    const key = (genus ?? '').trim().toLowerCase();
    const takenLower = taken.map((value) => value.toLowerCase());
    const scope =
      key === ''
        ? eq(nickname.genus, '')
        : or(eq(nickname.genus, key), eq(nickname.genus, ''));

    const [row] = await this.database
      .select({ name: nickname.name })
      .from(nickname)
      .where(
        and(
          eq(nickname.lang, lang),
          scope,
          takenLower.length > 0
            ? notInArray(sql`lower(${nickname.name})`, takenLower)
            : undefined,
        ),
      )
      // Genus-specific first, then a random one within that group.
      .orderBy(sql`(${nickname.genus} = ${key}) desc`, sql`random()`)
      .limit(1);

    return row?.name ?? null;
  }
}
