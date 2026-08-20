import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ThrottlerGuard } from '@nestjs/throttler';
import { PairingPoll, WorkerPairingRepository } from './repository';

// The worker's side of pairing — unauthenticated by design (a fresh worker has
// no token yet). `start` is rate-limited to stop pairing-spam; `poll` is left
// open because the worker calls it every few seconds and it only ever reveals
// data to whoever already holds the unguessable secret.
@Controller('worker/pair')
export class WorkerPairingController {
  constructor(
    private readonly pairings: WorkerPairingRepository,
    private readonly config: ConfigService,
  ) {}

  @Post('start')
  @UseGuards(ThrottlerGuard)
  async start(
    @Body() body: { label?: string },
  ): Promise<{ code: string; secret: string; expiresAt: string; verifyUrl: string }> {
    const { code, secret, expiresAt } = await this.pairings.start(body.label);
    const front = this.config.getOrThrow<string>('FRONT_URL').replace(/\/$/, '');
    return {
      code,
      secret,
      expiresAt: expiresAt.toISOString(),
      verifyUrl: `${front}/pair?code=${code}`,
    };
  }

  @Post('poll')
  poll(@Body() body: { secret: string }): Promise<PairingPoll> {
    return this.pairings.poll(body.secret);
  }
}
