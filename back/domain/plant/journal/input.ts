import { Field, ID, InputType } from '@nestjs/graphql';
import {
  IsEnum,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
} from 'class-validator';
import { JournalEntryKind } from './enum';
import { JournalConstraints } from './journal-constraints';

@InputType()
export class AddJournalEntryInput {
  @Field(() => ID)
  @IsUUID()
  plantId: string;

  @Field(() => JournalEntryKind)
  @IsEnum(JournalEntryKind)
  kind: JournalEntryKind;

  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(JournalConstraints.noteMaxLength)
  note?: string | null;

  // An already-uploaded photo, as the opaque storage key it came back as (the
  // journal reuses the plant-image upload endpoint). Null for a text-only entry.
  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsString()
  imageKey?: string | null;
}
