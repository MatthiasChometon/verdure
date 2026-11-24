import {
  Controller,
  Get,
  Inject,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';
import { sql, type SQL } from 'drizzle-orm';
import { DATABASE } from '../database/token';
import type { HealthStatus } from './type';

// All this controller asks of the database: one query, so a test can hand it a
// one-method stub instead of a whole drizzle client.
export type DatabaseProbe = { execute: (query: SQL) => PromiseLike<unknown> };

@Controller('health')
export class HealthController {
  private readonly logger = new Logger(HealthController.name);

  constructor(@Inject(DATABASE) private readonly database: DatabaseProbe) {}

  // Liveness: the process is up and serving, and the database is not asked. A
  // failed liveness check restarts the service, so tying it to the database
  // would turn a passing connection blip into a restart loop. This is also what
  // a deploy polls after a restart.
  @Get()
  checkLiveness(): HealthStatus {
    return { status: 'ok' };
  }

  // Readiness: the service can do its work, which needs the database. Probed by
  // the container healthcheck, so compose starts the front once the API is ready.
  @Get('ready')
  async checkReadiness(): Promise<HealthStatus> {
    try {
      await this.database.execute(sql`select 1`);
    } catch (error) {
      this.logger.warn(
        `Database unreachable: ${error instanceof Error ? error.message : String(error)}`,
      );
      throw new ServiceUnavailableException();
    }

    return { status: 'ok' };
  }
}
