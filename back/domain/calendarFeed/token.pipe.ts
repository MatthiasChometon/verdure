import {
  BadRequestException,
  Injectable,
  type PipeTransform,
} from '@nestjs/common';

// The token minted by the repository: 32 random bytes in hex.
const FEED_TOKEN = /^[0-9a-f]{64}$/;

// Refuses a malformed token before any database lookup: it can only be a
// guess or a probe, never a token we handed out.
@Injectable()
export class CalendarFeedTokenPipe implements PipeTransform<unknown, string> {
  transform(value: unknown): string {
    if (typeof value === 'string' && FEED_TOKEN.test(value)) {
      return value;
    }
    throw new BadRequestException('The calendar feed token is malformed.');
  }
}
