import { HttpService } from '@nestjs/axios';
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom } from 'rxjs';

@Injectable()
export class AiService {
  private readonly logger = new Logger(AiService.name);
  private readonly baseUrl: string;

  constructor(
    private readonly http: HttpService,
    config: ConfigService,
  ) {
    // The verdure-ai bundle (ComfyUI) exposes the embedding pipeline.
    this.baseUrl = config.get<string>('AI_API_URL') ?? 'http://localhost:8000';
  }

  // Best-effort: returns a unit-normalised embedding, or undefined when the
  // model is unreachable so writes and search degrade gracefully.
  async embed(text: string): Promise<number[] | undefined> {
    const input = text.trim();
    if (input === '') {
      return;
    }

    try {
      const { data } = await firstValueFrom(
        this.http.post<{ embedding?: number[] | null }>(
          `${this.baseUrl}/embed`,
          { text: input },
        ),
      );
      const vector = data.embedding;
      if (vector === null || vector === undefined || vector.length === 0) {
        return;
      }
      return this.normalise(vector);
    } catch (error) {
      this.logger.warn(`Embedding failed: ${String(error)}`);
      return;
    }
  }

  // Unit-normalise so a cosine similarity reduces to a plain dot product.
  private normalise(vector: number[]): number[] {
    const norm = Math.sqrt(
      vector.reduce((sum, value) => sum + value * value, 0),
    );
    if (norm === 0) {
      return vector;
    }
    return vector.map((value) => value / norm);
  }
}
