import { ParseUUIDPipe, UseGuards } from '@nestjs/common';
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
import { FileStorageService } from '../../../infrastructure/file-storage/service';
import { CurrentUser } from '../../auth/currentUser/current-user';
import { AuthGuard } from '../../auth/currentUser/guard';
import { User } from '../../user/model';
import { AddJournalEntryInput } from './input';
import { JournalEntry } from './model';
import { JournalRepository } from './repository';

@Resolver(() => JournalEntry)
export class JournalResolver {
  constructor(
    private readonly repository: JournalRepository,
    private readonly storage: FileStorageService,
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
    if (deleted.imageKey !== null) {
      await this.storage.remove(deleted.imageKey);
    }
    return true;
  }

  // Served by the API on the request's own host (works over localhost/LAN alike); raw key never leaks.
  @ResolveField(() => String, { nullable: true })
  imageUrl(
    @Parent() entry: JournalEntry,
    @Context() context: { req: FastifyRequest },
  ): string | null {
    if (entry.imageKey === null) {
      return null;
    }
    const { req } = context;
    return `${req.protocol}://${req.headers.host}/images/${entry.imageKey}`;
  }
}
