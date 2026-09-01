import { Module } from '@nestjs/common';
import { ProfilesService } from './profiles.service';
import { ProfilesController } from './profiles.controller';
import { DatabaseModule } from '../database/database.module';
import { BlocksModule } from '../blocks/blocks.module';
import { EntitlementsModule } from '../entitlements/entitlements.module';
import { EducationsModule } from '../educations/educations.module';
import { CareersModule } from '../careers/careers.module';

@Module({
  imports: [DatabaseModule, BlocksModule, EntitlementsModule, EducationsModule, CareersModule],
  controllers: [ProfilesController],
  providers: [ProfilesService],
  exports: [ProfilesService],
})
export class ProfilesModule {}
