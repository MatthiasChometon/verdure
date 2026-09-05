import { HttpService } from '@nestjs/axios';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom } from 'rxjs';
import type { PlantNetResponse } from './type';

const PLANTNET_TIMEOUT_MS = 15_000;

// Default recogniser when no local worker is online (no GPU/install needed).
// Key stays server-side, so Pl@ntNet's "expose my API key"/CORS must stay OFF.
@Injectable()
export class PlantNetService {
  private readonly apiKey: string | undefined;

  constructor(
    private readonly http: HttpService,
    config: ConfigService,
  ) {
    this.apiKey = config.get<string>('PLANTNET_API_KEY') || undefined;
  }

  // Lets the caller tell "not set up" (fresh dev checkout) apart from an
  // exhausted quota or rejected key, for an actionable message.
  hasSharedKey(): boolean {
    return this.apiKey !== undefined;
  }

  // `userKey` wins over the shared key (own quota). `available: false` means
  // Pl@ntNet was unusable (no/rejected key, 429, network) — not "not recognised".
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
      const { data } = await firstValueFrom(
        // Cap the wait so a slow Pl@ntNet never hangs the upload request.
        this.http.post<PlantNetResponse>(url, form, {
          timeout: PLANTNET_TIMEOUT_MS,
        }),
      );
      const species = data.results?.[0]?.species?.scientificNameWithoutAuthor;
      return {
        species:
          species !== undefined && species.trim() !== ''
            ? species.trim()
            : null,
        available: true,
      };
    } catch {
      // Non-2xx (429 quota, 401/403 bad key, 5xx…) and network failures both
      // land here — the service is unusable in every one of those cases.
      return { species: null, available: false };
    }
  }
}
