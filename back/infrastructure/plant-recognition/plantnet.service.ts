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

  // The best-matching species ("Genus species") for the photo, or null when the
  // key is unset, the request fails, or nothing matched — the caller then marks
  // the job failed exactly as it would for a worker that found nothing.
  async identify(image: Buffer, contentType: string): Promise<string | null> {
    if (this.apiKey === undefined) {
      return null;
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
      `?api-key=${this.apiKey}&nb-results=1`;
    try {
      const response = await fetch(url, {
        method: 'POST',
        body: form,
        // Cap the wait so a slow Pl@ntNet never hangs the upload request; on
        // timeout the catch below returns null (job marked failed).
        signal: AbortSignal.timeout(15_000),
      });
      if (!response.ok) {
        return null;
      }
      const data = (await response.json()) as PlantNetResponse;
      const species = data.results?.[0]?.species?.scientificNameWithoutAuthor;
      return species !== undefined && species.trim() !== ''
        ? species.trim()
        : null;
    } catch {
      return null;
    }
  }
}
