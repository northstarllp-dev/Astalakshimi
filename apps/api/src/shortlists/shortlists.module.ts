import { Module } from '@nestjs/common';
import { ShortlistsController, ShortlistController } from './shortlists.controller';
import { ShortlistsService } from './shortlists.service';
import { DatabaseModule } from '../database/database.module';

@Module({
  imports: [DatabaseModule],
  controllers: [ShortlistsController, ShortlistController],
  providers: [ShortlistsService],
})
export class ShortlistsModule {}

