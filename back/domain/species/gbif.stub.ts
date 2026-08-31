import { SpeciesMatch } from '../../infrastructure/taxonomy/type';

// Stub GBIF so the tests stay deterministic and offline.
export class GbifStub {
  matches: SpeciesMatch[] = [];

  suggest(): Promise<SpeciesMatch[]> {
    return Promise.resolve(this.matches);
  }
}
