import { randomBytes, scrypt, timingSafeEqual } from 'node:crypto';
import { promisify } from 'node:util';
import { Injectable, type OnModuleInit } from '@nestjs/common';

const scryptAsync = promisify(scrypt);
const KEY_LENGTH = 64;
const SALT_LENGTH = 16;

@Injectable()
export class PasswordService implements OnModuleInit {
  // Hash of a throwaway password, computed once at boot: what an unknown account
  // is "verified" against so its login costs as much as a real one, the first
  // included.
  private decoy: Promise<string> | undefined;

  onModuleInit(): void {
    this.decoy = this.hash(randomBytes(SALT_LENGTH).toString('hex'));
  }

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

  // Burns one scrypt derivation and always answers false: login calls it for an
  // unknown or password-less account so response time does not reveal which
  // emails are registered.
  async pretendToVerify(password: string): Promise<false> {
    this.decoy ??= this.hash(randomBytes(SALT_LENGTH).toString('hex'));
    await this.verify(password, await this.decoy);
    return false;
  }
}
