import { Module, Global, Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { closeDbClients, createDbClient } from '@astalakshimi/database';
import { DB_CLIENT } from './database.constants';
import { resolveDbPoolMax, resolveStatementTimeoutMs } from './pool-config';

@Injectable()
class DatabaseShutdown implements OnModuleDestroy {
  async onModuleDestroy() {
    await closeDbClients();
  }
}

@Global()
@Module({
  providers: [
    {
      provide: DB_CLIENT,
      useFactory: (configService: ConfigService) => {
        const url = configService.get<string>('database.url');
        const max = resolveDbPoolMax();
        const statementTimeoutMs = resolveStatementTimeoutMs();
        new Logger('Database').log(
          `Postgres pool max=${max} statement_timeout=${statementTimeoutMs}ms`,
        );
        return createDbClient(url, { max, statementTimeoutMs });
      },
      inject: [ConfigService],
    },
    DatabaseShutdown,
  ],
  exports: [DB_CLIENT],
})
export class DatabaseModule {}
