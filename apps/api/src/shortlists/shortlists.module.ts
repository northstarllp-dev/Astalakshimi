import { Module } from '@nestjs/common';
import { ShortlistsController } from './shortlists.controller';
import { ShortlistsService } from './shortlists.service';
import { DatabaseModule } from '../database/database.module';

@Module({
  imports: [DatabaseModule],
  controllers: [ShortlistsController],
  providers: [ShortlistsService],
})
export class ShortlistsModule {}

