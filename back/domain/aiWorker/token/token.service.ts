import { createHash, randomBytes } from 'node:crypto';
import { Injectable } from '@nestjs/common';

// Mints and hashes worker tokens. Only the hash is ever stored; the plaintext
// is shown to the user once to paste into their worker.
@Injectable()
export class WorkerTokenService {
  generate(): { plain: string; hash: string } {
    const plain = `vwk_${randomBytes(32).toString('hex')}`;
    return { plain, hash: this.hash(plain) };
  }

  hash(plain: string): string {
    return createHash('sha256').update(plain).digest('hex');
  }
}
