import { Controller, Get, Inject } from '@nestjs/common';
import { DB_CLIENT } from '../database/database.constants';
import type { Database } from '@astalakshimi/database';

@Controller('health')
export class HealthController {
  constructor(@Inject(DB_CLIENT) private readonly db: Database) {}

  @Get()
  async check() {
    let dbStatus = 'healthy';
    try {
      // Execute a lightweight query to verify DB connection
      await this.db.execute('SELECT 1');
    } catch {
      dbStatus = 'disconnected';
    }

    return {
      status: 'ok',
      database: dbStatus,
      uptime: process.uptime(),
      timestamp: new Date().toISOString(),
    };
  }
}
