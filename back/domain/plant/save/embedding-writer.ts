import { Inject, Injectable } from '@nestjs/common';
import { and, eq } from 'drizzle-orm';
import {
  DATABASE,
  type Database,
} from '../../../infrastructure/database/token';
import { BackgroundTasks } from '../../../infrastructure/background/service';
import { AiService } from '../../../infrastructure/ai/service';
import {
  embeddingTextOf,
  type PlantEmbeddingRequest,
  SemanticEmbeddingService,
} from '../../aiWorker/embedding/service';
import { plant } from '../schema';

const EMBEDDING_TIMEOUT_MS = 60_000;

// Runs OFF the request path so saving a plant is never blocked by the slow embedding call.
// Co-located embedder when there is one, else routed through the worker queue.
@Injectable()
export class PlantEmbeddingWriter {
  constructor(
    @Inject(DATABASE) private readonly database: Database,
    private readonly ai: AiService,
    private readonly embedding: SemanticEmbeddingService,
    private readonly background: BackgroundTasks,
  ) {}

  // The caller returns immediately; the registry logs a failure, caps the slow
  // embedding call and has a shutdown wait for it before the pool ends.
  schedule(request: PlantEmbeddingRequest): void {
    this.background.run(
      `Embedding of plant ${request.plantId}`,
      () => this.write(request),
      EMBEDDING_TIMEOUT_MS,
    );
  }

  private async write(request: PlantEmbeddingRequest): Promise<void> {
    const { plantId, userId } = request;
    const embedding = await this.embed(request);
    if (embedding === undefined) {
      // No co-located embedder (public deploy): route it through the worker
      // queue so the user's GPU embeds it whenever it is online.
      await this.embedding.enqueuePlant(request);
      return;
    }
    await this.database
      .update(plant)
      .set({ embedding })
      .where(and(eq(plant.id, plantId), eq(plant.userId, userId)));
  }

  private embed(request: PlantEmbeddingRequest): Promise<number[] | undefined> {
    return this.ai.embed(embeddingTextOf(request));
  }
}
