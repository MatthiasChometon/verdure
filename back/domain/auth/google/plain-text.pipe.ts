import {
  BadRequestException,
  Injectable,
  type PipeTransform,
} from '@nestjs/common';

// A query parameter given twice (`?state=a&state=b`) reaches a handler as an
// array: refused here, so the handler only ever sees text or nothing.
@Injectable()
export class PlainTextPipe implements PipeTransform<
  unknown,
  string | undefined
> {
  transform(value: unknown): string | undefined {
    if (value === undefined || typeof value === 'string') {
      return value;
    }
    throw new BadRequestException('The parameter must be given once, as text.');
  }
}
