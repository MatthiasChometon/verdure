import { Inject, Injectable } from '@nestjs/common';
import { and, desc, eq, isNull } from 'drizzle-orm';
import { AiService } from '../../../infrastructure/ai/service';
import {
  DATABASE,
  type Database,
} from '../../../infrastructure/database/token';
import { plant } from '../../plant/schema';
import { RecognitionJobRepository } from '../job/repository';
import { WorkerTokenRepository } from '../token/repository';

const CACHE_TTL_MS = 15 * 60 * 1000;
const CACHE_MAX = 500;

// Embeds queries and keeps plant embeddings populated: direct AiService when co-located
// (local full-stack), else routed through the job queue (shared hosting, NAT blocks the worker).
@Injectable()
export class SemanticEmbeddingService {
  // A small LRU-ish cache of query text -> vector so a repeated search (and the
  // front's retry while a job is in flight) resolves without re-embedding.
  private readonly queryCache = new Map<
    string,
    { vector: number[]; at: number }
  >();

  constructor(
    @Inject(DATABASE) private readonly database: Database,
    private readonly jobs: RecognitionJobRepository,
    private readonly workers: WorkerTokenRepository,
    private readonly ai: AiService,
  ) {}

  // pending:true tells the caller to fall back to keyword ranking and retry later.
  // Neither vector nor pending when there's no worker online and no co-located embedder.
  async resolveQueryEmbedding(
    userId: string,
    text: string,
  ): Promise<{ vector?: number[]; pending: boolean }> {
    const key = text.trim().toLowerCase();
    if (key === '') {
      return { pending: false };
    }

    const cached = this.readCache(key);
    if (cached !== undefined) {
      return { vector: cached, pending: false };
    }

    // Co-located embedder (local full-stack): embed inline and cache it.
    const direct = await this.ai.embed(text);
    if (direct !== undefined) {
      this.writeCache(key, direct);
      return { vector: direct, pending: false };
    }

    if (await this.workers.isOnline(userId)) {
      await this.jobs.enqueueQueryEmbedding(userId, text);
      return { pending: true };
    }
    return { pending: false };
  }

  // On a worker's embed result: store it where it belongs — a plant's row, or the
  // query cache — using what the completed job recorded.
  async applyEmbeddingResult(
    userId: string,
    target: { plantId: string | null; inputText: string | null },
    vector: number[],
  ): Promise<void> {
    if (target.plantId !== null) {
      await this.database
        .update(plant)
        .set({ embedding: vector })
        .where(and(eq(plant.id, target.plantId), eq(plant.userId, userId)));
      return;
    }
    if (target.inputText !== null) {
      this.writeCache(target.inputText.trim().toLowerCase(), vector);
    }
  }

  // Queue a single plant that still has no embedding, so an idle worker's poll
  // steadily backfills the collection. Returns whether one was queued.
  async enqueueBackfill(userId: string): Promise<boolean> {
    const [next] = await this.database
      .select({
        id: plant.id,
        name: plant.name,
        species: plant.species,
        description: plant.description,
      })
      .from(plant)
      .where(and(eq(plant.userId, userId), isNull(plant.embedding)))
      .orderBy(desc(plant.createdAt))
      .limit(1);
    if (next === undefined) {
      return false;
    }
    // False when this plant already has a job in flight — the loop should then
    // wait rather than spin (the job is being processed).
    return this.jobs.enqueuePlantEmbedding(
      userId,
      next.id,
      this.plantText(next),
    );
  }

  // Queue one plant's (re)embedding — used on create/update when there is no
  // co-located embedder, so the worker keeps it fresh.
  async enqueuePlant(
    userId: string,
    plantId: string,
    name: string,
    species: string,
    description: string | null,
  ): Promise<void> {
    await this.jobs.enqueuePlantEmbedding(
      userId,
      plantId,
      this.plantText({ name, species, description }),
    );
  }

  private plantText(row: {
    name: string;
    species: string;
    description: string | null;
  }): string {
    return [row.name, row.species, row.description]
      .filter((part): part is string => part !== null && part !== '')
      .join('. ');
  }

  private readCache(key: string): number[] | undefined {
    const hit = this.queryCache.get(key);
    if (hit === undefined) {
      return undefined;
    }
    if (Date.now() - hit.at > CACHE_TTL_MS) {
      this.queryCache.delete(key);
      return undefined;
    }
    return hit.vector;
  }

  private writeCache(key: string, vector: number[]): void {
    // Bounded: drop the oldest insertion when full (Map keeps insertion order).
    if (this.queryCache.size >= CACHE_MAX) {
      for (const oldest of this.queryCache.keys()) {
        this.queryCache.delete(oldest);
        break;
      }
    }
    this.queryCache.set(key, { vector, at: Date.now() });
  }
}
