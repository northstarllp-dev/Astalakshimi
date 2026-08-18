import { Module } from '@nestjs/common';
import { MediaService } from './media.service';
import { MediaController } from './media.controller';
import { S3Provider } from './providers/s3.provider';

@Module({
  controllers: [MediaController],
  providers: [MediaService, S3Provider],
  exports: [MediaService, S3Provider],
})
export class MediaModule {}
