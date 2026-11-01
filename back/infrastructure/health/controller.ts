import { Controller, Get, Inject } from '@nestjs/common';
import { sql } from 'drizzle-orm';
import { DATABASE, type Database } from '../database/token';
import type { HealthStatus } from './type';

// Probed by the container healthcheck: up means the process answers and the
// database is reachable, so a broken pool marks the container unhealthy.
@Controller('health')
export class HealthController {
  constructor(@Inject(DATABASE) private readonly database: Database) {}

  @Get()
  async check(): Promise<HealthStatus> {
    await this.database.execute(sql`select 1`);
    return { status: 'ok' };
  }
}
