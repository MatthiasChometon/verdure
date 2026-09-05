import { HttpService } from '@nestjs/axios';
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom } from 'rxjs';

@Injectable()
export class AiService {
  private readonly logger = new Logger(AiService.name);
  private readonly baseUrl: string;
  private readonly configured: boolean;

  constructor(
    private readonly http: HttpService,
    config: ConfigService,
  ) {
    // AI_API_URL wires the verdure-ai (ComfyUI) embedder (local full-stack
    // only); the public deploy has none, so embedding is skipped.
    const url = config.get<string>('AI_API_URL');
    this.configured = url !== undefined && url !== '';
    this.baseUrl = url ?? 'http://localhost:8000';
  }

  // Whether an embedder is wired at all — lets callers offer semantic search
  // only where it can actually run, without probing on every request.
  isConfigured(): boolean {
    return this.configured;
  }

  // Best-effort: undefined when no embedder is wired or unreachable, so
  // writes and search degrade gracefully.
  async embed(text: string): Promise<number[] | undefined> {
    const input = text.trim();
    if (!this.configured || input === '') {
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
