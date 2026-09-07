import { Module } from '@nestjs/common';
import { SearchController } from './search.controller';
import { SearchService } from './search.service';
import { DatabaseModule } from '../database/database.module';
import { EntitlementsModule } from '../entitlements/entitlements.module';

@Module({
  imports: [DatabaseModule, EntitlementsModule],
  controllers: [SearchController],
  providers: [SearchService],
})
export class SearchModule {}
