import { Module, Global } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createDbClient } from '@astalakshimi/database';
import { DB_CLIENT } from './database.constants';

@Global()
@Module({
  providers: [
    {
      provide: DB_CLIENT,
      useFactory: (configService: ConfigService) => {
        const url = configService.get<string>('database.url');
        return createDbClient(url);
      },
      inject: [ConfigService],
    },
  ],
  exports: [DB_CLIENT],
})
export class DatabaseModule {}
