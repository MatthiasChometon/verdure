import { createHash, randomBytes, randomInt } from 'node:crypto';
import { Injectable } from '@nestjs/common';

// Unambiguous alphabet: no 0/O/1/I so the human-typed code is not misread.
const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const CODE_LENGTH = 8;

// The human `code` the user approves, and the long `secret` the worker polls with (only its hash is stored).
@Injectable()
export class WorkerPairingService {
  generateCode(): string {
    let code = '';
    for (let index = 0; index < CODE_LENGTH; index += 1) {
      code += ALPHABET[randomInt(ALPHABET.length)];
    }
    return code;
  }

  generateSecret(): { plain: string; hash: string } {
    const plain = randomBytes(32).toString('hex');
    return { plain, hash: this.hash(plain) };
  }

  hash(plain: string): string {
    return createHash('sha256').update(plain).digest('hex');
  }
}
