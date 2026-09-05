import { HttpService } from '@nestjs/axios';
import { Injectable, Logger } from '@nestjs/common';
import { firstValueFrom, retry, timer } from 'rxjs';
import { GbifSearchResponse, GbifSuggestion, SpeciesMatch } from './type';

const GBIF = 'https://api.gbif.org/v1';
const PLANTAE_KEY = 6;
const SWEEP_PAGE = 1000;
const SWEEP_CONCURRENCY = 8;
const SEARCH_RETRIES = 4;
const RETRY_BASE_MS = 1000;

@Injectable()
export class TaxonomyService {
  private readonly logger = new Logger(TaxonomyService.name);

  constructor(private readonly http: HttpService) {}

  // `/species/suggest` does prefix matching (unlike `/species/search`, which is
  // full-text) but spans every kingdom, so we keep only plants.
  async suggest(search: string): Promise<SpeciesMatch[]> {
    const query = search.trim();
    if (query.length < 2) {
      return [];
    }

    // Scientific names are unaccented Latin, so strip diacritics: a French user
    // typing "Rafflésia" still matches "Rafflesia".
    const normalised = query.normalize('NFD').replace(/\p{Diacritic}/gu, '');

    try {
      const { data } = await firstValueFrom(
        this.http.get<GbifSuggestion[]>(`${GBIF}/species/suggest`, {
          params: { q: normalised, rank: 'SPECIES', limit: '20' },
        }),
      );
      const seen = new Set<string>();
      const matches: SpeciesMatch[] = [];
      for (const entry of data) {
        const name = entry.canonicalName ?? entry.scientificName;
        if (
          entry.kingdom !== 'Plantae' ||
          entry.key === undefined ||
          name === undefined ||
          name === '' ||
          seen.has(name)
        ) {
          continue;
        }
        seen.add(name);
        matches.push({ key: entry.key, name });
        if (matches.length >= 10) {
          break;
        }
      }
      return matches;
    } catch (error) {
      this.logger.warn(
        `Species suggest failed for "${query}": ${String(error)}`,
      );
      return [];
    }
  }

  // GBIF pagination caps at 100k, so page per family (none exceeds that) and
  // process families concurrently.
  async sweepPlantSpecies(
    onBatch: (matches: SpeciesMatch[]) => Promise<void>,
  ): Promise<void> {
    const queue = [...(await this.familyKeys())];
    const worker = async (): Promise<void> => {
      for (;;) {
        const familyKey = queue.shift();
        if (familyKey === undefined) {
          return;
        }
        await this.seedFamily(familyKey, onBatch);
      }
    };
    await Promise.all(
      Array.from({ length: SWEEP_CONCURRENCY }, () => worker()),
    );
  }

  private async search(
    params: Record<string, string>,
  ): Promise<GbifSearchResponse> {
    const { data } = await firstValueFrom(
      this.http
        .get<GbifSearchResponse>(`${GBIF}/species/search`, { params })
        .pipe(
          retry({
            count: SEARCH_RETRIES,
            delay: (_error, retryCount) => timer(retryCount * RETRY_BASE_MS),
          }),
        ),
    );
    return data;
  }

  private async familyKeys(): Promise<number[]> {
    const keys: number[] = [];
    for (let offset = 0; ; offset += SWEEP_PAGE) {
      const page = await this.search({
        highertaxonKey: String(PLANTAE_KEY),
        rank: 'FAMILY',
        status: 'ACCEPTED',
        limit: String(SWEEP_PAGE),
        offset: String(offset),
      });
      keys.push(...page.results.map((result) => result.key));
      if (page.endOfRecords) {
        return keys;
      }
    }
  }

  private async seedFamily(
    familyKey: number,
    onBatch: (matches: SpeciesMatch[]) => Promise<void>,
  ): Promise<void> {
    for (let offset = 0; ; offset += SWEEP_PAGE) {
      const page = await this.search({
        highertaxonKey: String(familyKey),
        rank: 'SPECIES',
        status: 'ACCEPTED',
        limit: String(SWEEP_PAGE),
        offset: String(offset),
      });

      // Dedupe by name within the batch: a single upsert cannot touch a row twice.
      const byName = new Map<string, SpeciesMatch>();
      for (const result of page.results) {
        const name = result.canonicalName;
        if (name !== undefined && name !== '' && !byName.has(name)) {
          byName.set(name, { key: result.key, name });
        }
      }
      if (byName.size > 0) {
        await onBatch([...byName.values()]);
      }

      if (page.endOfRecords) {
        return;
      }
    }
  }
}
