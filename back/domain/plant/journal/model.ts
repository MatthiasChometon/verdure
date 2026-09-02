import { Field, ID, ObjectType } from '@nestjs/graphql';
import { JournalEntryKind } from './enum';

@ObjectType()
export class JournalEntry {
  @Field(() => ID)
  id: string;

  @Field(() => ID)
  plantId: string;

  @Field(() => JournalEntryKind)
  kind: JournalEntryKind;

  @Field(() => String, { nullable: true })
  note: string | null;

  // Carried for the imageUrl resolver, never exposed on its own: the front is
  // given a ready URL, never a raw storage key. Null when no photo was attached.
  imageKey: string | null;

  // ISO 8601 timestamp the entry was created — the timeline orders on it.
  @Field(() => String)
  createdAt: string;
}
