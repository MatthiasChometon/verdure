import { randomBytes, scrypt, timingSafeEqual } from 'node:crypto';
import { promisify } from 'node:util';
import { Injectable } from '@nestjs/common';

const scryptAsync = promisify(scrypt);
const KEY_LENGTH = 64;
const SALT_LENGTH = 16;

@Injectable()
export class PasswordService {
  async hash(password: string): Promise<string> {
    const salt = randomBytes(SALT_LENGTH).toString('hex');
    const derived = (await scryptAsync(password, salt, KEY_LENGTH)) as Buffer;
    return `${salt}:${derived.toString('hex')}`;
  }

  async verify(password: string, stored: string): Promise<boolean> {
    const [salt, hash] = stored.split(':');
    if (salt === undefined || hash === undefined) {
      return false;
    }
    const derived = (await scryptAsync(password, salt, KEY_LENGTH)) as Buffer;
    const expected = Buffer.from(hash, 'hex');
    return (
      expected.length === derived.length && timingSafeEqual(expected, derived)
    );
  }
}
