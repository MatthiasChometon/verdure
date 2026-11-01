import { IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';

// A hostname is at most 253 characters; the worker sends its own as the label.
const LABEL_MAX_LENGTH = 255;

export class StartPairingInput {
  @IsOptional()
  @IsString()
  @MaxLength(LABEL_MAX_LENGTH)
  label?: string;
}

export class PollPairingInput {
  @IsString()
  @IsNotEmpty()
  secret: string;
}
