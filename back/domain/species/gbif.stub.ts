import { SpeciesMatch } from '../../infrastructure/taxonomy/type';

// Stub GBIF so the tests stay deterministic and offline.
export class GbifStub {
  matches: SpeciesMatch[] = [];
  queries: string[] = [];

  suggest(search: string): Promise<SpeciesMatch[]> {
    this.queries.push(search);
    return Promise.resolve(this.matches);
  }
}
