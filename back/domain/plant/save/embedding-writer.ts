import { Inject, Injectable, Logger } from '@nestjs/common';
import { and, eq } from 'drizzle-orm';
import {
  DATABASE,
  type Database,
} from '../../../infrastructure/database/token';
import { AiService } from '../../../infrastructure/ai/service';
import {
  type PlantEmbeddingRequest,
  SemanticEmbeddingService,
} from '../../aiWorker/embedding/service';
import { plant } from '../schema';

// Runs OFF the request path so saving a plant is never blocked by the slow embedding call.
// Co-located embedder when there is one, else routed through the worker queue.
@Injectable()
export class PlantEmbeddingWriter {
  private readonly logger = new Logger(PlantEmbeddingWriter.name);

  constructor(
    @Inject(DATABASE) private readonly database: Database,
    private readonly ai: AiService,
    private readonly embedding: SemanticEmbeddingService,
  ) {}

  // Fire-and-forget: the caller returns immediately, this runs in the background.
  schedule(request: PlantEmbeddingRequest): void {
    void this.write(request);
  }

  private async write(request: PlantEmbeddingRequest): Promise<void> {
    const { plantId, userId } = request;
    try {
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
    } catch (error) {
      this.logger.warn(
        `Embedding update failed for plant ${plantId}: ${String(error)}`,
      );
    }
  }

  private embed({
    name,
    species,
    description,
  }: PlantEmbeddingRequest): Promise<number[] | undefined> {
    const parts = [name, species, description].filter(
      (part): part is string =>
        part !== null && part !== undefined && part !== '',
    );
    return this.ai.embed(parts.join('. '));
  }
}
