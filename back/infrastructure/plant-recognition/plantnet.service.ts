import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

type PlantNetResult = {
  score: number;
  species?: { scientificNameWithoutAuthor?: string };
};
type PlantNetResponse = { results?: PlantNetResult[] };

// Cloud plant identification via the Pl@ntNet API (my.plantnet.org). It is the
// default recogniser when the user has no local worker online — no GPU and no
// install needed, so recognition works for everyone. The API key stays
// server-side (this call runs on the API, never in the browser), so Pl@ntNet's
// "expose my API key" / CORS option must stay OFF.
@Injectable()
export class PlantNetService {
  private readonly apiKey: string | undefined;

  constructor(config: ConfigService) {
    this.apiKey = config.get<string>('PLANTNET_API_KEY') || undefined;
  }

  // Whether a shared Pl@ntNet key is configured at all — lets the caller tell
  // "cloud identification isn't set up" (e.g. a fresh dev checkout) apart from an
  // exhausted quota or a rejected key, so the user gets an actionable message.
  hasSharedKey(): boolean {
    return this.apiKey !== undefined;
  }

  // The best-matching species ("Genus species") for the photo, or null when no
  // key is available, the request fails, or nothing matched — the caller then
  // marks the job failed exactly as it would for a worker that found nothing.
  // `userKey` (the caller's own Pl@ntNet key) wins over the shared one, so each
  // person can identify on their own 500/day quota.
  // Returns { species, available }. `available` is false when Pl@ntNet could not
  // be used at all — no key, exhausted quota (429), a rejected key, or a network
  // failure — so the caller can tell the user (vs. a plain "not recognised", which
  // is available: true with species null).
  async identify(
    image: Buffer,
    contentType: string,
    userKey?: string | null,
  ): Promise<{ species: string | null; available: boolean }> {
    const apiKey = userKey || this.apiKey;
    if (apiKey === undefined || apiKey === null) {
      return { species: null, available: false };
    }
    const form = new FormData();
    form.append(
      'images',
      new Blob([new Uint8Array(image)], { type: contentType }),
      'photo.jpg',
    );
    // Let Pl@ntNet detect the organ (leaf/flower/fruit) itself.
    form.append('organs', 'auto');
    const url =
      'https://my-api.plantnet.org/v2/identify/all' +
      `?api-key=${apiKey}&nb-results=1`;
    try {
      const response = await fetch(url, {
        method: 'POST',
        body: form,
        // Cap the wait so a slow Pl@ntNet never hangs the upload request.
        signal: AbortSignal.timeout(15_000),
      });
      if (!response.ok) {
        // 429 (quota), 401/403 (bad key), 5xx… — the service is unusable here.
        return { species: null, available: false };
      }
      const data = (await response.json()) as PlantNetResponse;
      const species = data.results?.[0]?.species?.scientificNameWithoutAuthor;
      return {
        species:
          species !== undefined && species.trim() !== ''
            ? species.trim()
            : null,
        available: true,
      };
    } catch {
      return { species: null, available: false };
    }
  }
}
