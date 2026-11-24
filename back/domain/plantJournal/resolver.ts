import { Logger, ParseUUIDPipe, UseGuards } from '@nestjs/common';
import {
  Args,
  Context,
  ID,
  Mutation,
  Parent,
  Query,
  ResolveField,
  Resolver,
} from '@nestjs/graphql';
import type { FastifyRequest } from 'fastify';
import { ImageUrl } from '../../infrastructure/file-storage/image-url';
import { FileStorageService } from '../../infrastructure/file-storage/service';
import { CurrentUser } from '../auth/currentUser/current-user';
import { AuthGuard } from '../auth/currentUser/guard';
import { User } from '../user/model';
import { AddJournalEntryInput } from './input';
import { JournalEntry } from './model';
import { JournalRepository } from './repository';

@Resolver(() => JournalEntry)
export class JournalResolver {
  private readonly logger = new Logger(JournalResolver.name);

  constructor(
    private readonly repository: JournalRepository,
    private readonly storage: FileStorageService,
    private readonly imageUrls: ImageUrl,
  ) {}

  @Query(() => [JournalEntry])
  @UseGuards(AuthGuard)
  journalEntries(
    @CurrentUser() user: User,
    @Args('plantId', { type: () => ID }, ParseUUIDPipe) plantId: string,
  ): Promise<JournalEntry[]> {
    return this.repository.entriesFor(user.id, plantId);
  }

  @Mutation(() => JournalEntry)
  @UseGuards(AuthGuard)
  addJournalEntry(
    @CurrentUser() user: User,
    @Args('input') input: AddJournalEntryInput,
  ): Promise<JournalEntry> {
    return this.repository.add(user.id, input);
  }

  @Mutation(() => Boolean)
  @UseGuards(AuthGuard)
  async deleteJournalEntry(
    @CurrentUser() user: User,
    @Args('id', { type: () => ID }, ParseUUIDPipe) id: string,
  ): Promise<boolean> {
    const deleted = await this.repository.remove(user.id, id);
    if (deleted === undefined) {
      return false;
    }
    if (
      deleted.imageKey !== null &&
      !(await this.repository.isKeyReferenced(deleted.imageKey))
    ) {
      await this.removePhoto(deleted.imageKey);
    }
    return true;
  }

  @ResolveField(() => String, { nullable: true })
  imageUrl(
    @Parent() entry: JournalEntry,
    @Context() context: { req: FastifyRequest },
  ): string | null {
    return this.imageUrls.for(entry.imageKey, context.req);
  }

  // The entry is already gone: a storage hiccup leaves an orphan file to sweep,
  // it must not turn a done deletion into an error the user would retry in vain.
  private async removePhoto(key: string): Promise<void> {
    try {
      await this.storage.remove(key);
    } catch (error) {
      this.logger.error(`Journal photo ${key} not removed: ${String(error)}`);
    }
  }
}
