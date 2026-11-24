import {
  Controller,
  Get,
  Inject,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';
import { sql } from 'drizzle-orm';
import { DATABASE, type Database } from '../database/token';
import type { HealthStatus } from './type';

@Controller('health')
export class HealthController {
  private readonly logger = new Logger(HealthController.name);

  constructor(@Inject(DATABASE) private readonly database: Database) {}

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
