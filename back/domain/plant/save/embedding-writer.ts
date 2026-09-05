import { Inject, Injectable, Logger } from '@nestjs/common';
import { and, eq } from 'drizzle-orm';
import {
  DATABASE,
  type Database,
} from '../../../infrastructure/database/token';
import { AiService } from '../../../infrastructure/ai/service';
import { SemanticEmbeddingService } from '../../aiWorker/embedding/service';
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
  schedule(
    plantId: string,
    userId: string,
    name: string,
    species: string,
    description: string | null,
  ): void {
    void this.write(plantId, userId, name, species, description);
  }

  private async write(
    plantId: string,
    userId: string,
    name: string,
    species: string,
    description: string | null,
  ): Promise<void> {
    try {
      const embedding = await this.embed(name, species, description);
      if (embedding === undefined) {
        // No co-located embedder (public deploy): route it through the worker
        // queue so the user's GPU embeds it whenever it is online.
        await this.embedding.enqueuePlant(
          userId,
          plantId,
          name,
          species,
          description,
        );
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

  private embed(
    name: string,
    species: string,
    description: string | null,
  ): Promise<number[] | undefined> {
    const parts = [name, species, description].filter(
      (part): part is string => part !== null && part !== '',
    );
    return this.ai.embed(parts.join('. '));
  }
}
