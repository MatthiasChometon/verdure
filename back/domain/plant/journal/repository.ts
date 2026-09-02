import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { and, desc, eq } from 'drizzle-orm';
import {
  DATABASE,
  type Database,
} from '../../../infrastructure/database/token';
import { plant } from '../schema';
import { AddJournalEntryInput } from './input';
import { JournalEntry } from './model';
import { journalEntry } from './schema';

@Injectable()
export class JournalRepository {
  constructor(@Inject(DATABASE) private readonly database: Database) {}

  // A plant's journal, most recent first. Owner-scoped: filtering on userId means
  // an id the user does not own simply yields nothing.
  async entriesFor(userId: string, plantId: string): Promise<JournalEntry[]> {
    const rows = await this.database
      .select()
      .from(journalEntry)
      .where(
        and(eq(journalEntry.userId, userId), eq(journalEntry.plantId, plantId)),
      )
      .orderBy(desc(journalEntry.createdAt), desc(journalEntry.id));
    return rows.map((row) => this.toEntry(row));
  }

  async add(
    userId: string,
    input: AddJournalEntryInput,
  ): Promise<JournalEntry> {
    await this.ensureOwned(userId, input.plantId);
    const [created] = await this.database
      .insert(journalEntry)
      .values({
        plantId: input.plantId,
        userId,
        kind: input.kind,
        note: input.note ?? null,
        imageKey: input.imageKey ?? null,
      })
      .returning();
    return this.toEntry(created);
  }

  // Returns the removed entry's imageKey so the resolver can drop its stored
  // photo, or undefined when there was nothing to delete (wrong id / not owned).
  async remove(
    userId: string,
    id: string,
  ): Promise<{ imageKey: string | null } | undefined> {
    const [deleted] = await this.database
      .delete(journalEntry)
      .where(and(eq(journalEntry.id, id), eq(journalEntry.userId, userId)))
      .returning({ imageKey: journalEntry.imageKey });
    return deleted;
  }

  private async ensureOwned(userId: string, plantId: string): Promise<void> {
    const [owned] = await this.database
      .select({ id: plant.id })
      .from(plant)
      .where(and(eq(plant.id, plantId), eq(plant.userId, userId)))
      .limit(1);
    if (owned === undefined) {
      throw new NotFoundException('Plant not found.');
    }
  }

  private toEntry(row: typeof journalEntry.$inferSelect): JournalEntry {
    return {
      id: row.id,
      plantId: row.plantId,
      kind: row.kind,
      note: row.note,
      imageKey: row.imageKey,
      createdAt: row.createdAt.toISOString(),
    };
  }
}
