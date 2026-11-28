import {
  BadRequestException,
  Injectable,
  type PipeTransform,
} from '@nestjs/common';

const MAX_KEY_LENGTH = 200;
// A key is one token of visible characters: no space, no control character.
const KEY_SHAPE = /^[\x21-\x7e]+$/;

// The Pl@ntNet key argument: nothing or blank clears the key (null), otherwise
// the trimmed key, checked for shape before it is stored.
@Injectable()
export class PlantnetKeyPipe implements PipeTransform<
  string | null | undefined,
  string | null
> {
  transform(value: string | null | undefined): string | null {
    const trimmed = value?.trim();
    if (trimmed === undefined || trimmed === '') {
      return null;
    }
    if (trimmed.length > MAX_KEY_LENGTH || !KEY_SHAPE.test(trimmed)) {
      throw new BadRequestException('The Pl@ntNet key is malformed.');
    }
    return trimmed;
  }
}
