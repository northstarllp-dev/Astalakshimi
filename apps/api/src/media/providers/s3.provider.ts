import { Injectable, BadRequestException, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { v4 as uuidv4 } from 'uuid';
import type { UploadPurpose, PresignedUploadResponse } from '@astalakshimi/types';

@Injectable()
export class S3Provider {
  private readonly logger = new Logger(S3Provider.name);
  private readonly s3Client: S3Client;
  private readonly mediaBucket: string;
  private readonly vaultBucket: string;

  constructor(private readonly configService: ConfigService) {
    const region = this.configService.getOrThrow<string>('storage.region');
    const accessKeyId = this.configService.getOrThrow<string>('storage.accessKeyId');
    const secretAccessKey = this.configService.getOrThrow<string>('storage.secretAccessKey');

    this.mediaBucket = this.configService.getOrThrow<string>('storage.mediaBucket');
    this.vaultBucket = this.configService.getOrThrow<string>('storage.vaultBucket');
    this.s3Client = new S3Client({
      region,
      credentials: { accessKeyId, secretAccessKey },
    });
    this.logger.log(
      `[S3Provider] Live AWS S3 ready (media=${this.mediaBucket}, vault=${this.vaultBucket}, region=${region}).`,
    );
  }

  private normalizeImageContentType(contentType: string): string {
    if (!contentType || contentType === 'application/octet-stream') return 'image/jpeg';
    if (contentType === 'image/jpg') return 'image/jpeg';
    return contentType;
  }

  async generateUploadUrl(
    userId: string,
    purpose: UploadPurpose,
    contentType: string,
    fileSize: number,
  ): Promise<PresignedUploadResponse> {
    const allowedImages = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    const normalizedType = purpose === 'horoscope' ? contentType : this.normalizeImageContentType(contentType);
    const isPdf = normalizedType === 'application/pdf';

    if (purpose === 'horoscope') {
      if (!isPdf || fileSize > 10 * 1024 * 1024) {
        throw new BadRequestException('Horoscope must be a PDF file under 10 MB.');
      }
    } else if (!allowedImages.includes(normalizedType) || fileSize > 5 * 1024 * 1024) {
      throw new BadRequestException('Photos must be JPG, PNG, or WEBP under 5 MB.');
    }

    let bucket = this.mediaBucket;
    let s3Key = '';
    const ext = isPdf ? 'pdf' : normalizedType.split('/')[1] === 'jpg' ? 'jpeg' : normalizedType.split('/')[1] || 'jpg';
    const uniqueId = uuidv4();

    switch (purpose) {
      case 'profile_photo':
        bucket = this.mediaBucket;
        s3Key = `profiles/${userId}/photos/${uniqueId}.${ext}`;
        break;
      case 'horoscope':
        bucket = this.mediaBucket;
        s3Key = `profiles/${userId}/horoscopes/${uniqueId}.pdf`;
        break;
      case 'selfie':
        bucket = this.vaultBucket;
        s3Key = `verifications/${userId}/selfie-${uniqueId}.${ext}`;
        break;
      case 'govt_id':
        bucket = this.vaultBucket;
        s3Key = `verifications/${userId}/govt-id-${uniqueId}.${ext}`;
        break;
    }

    const expiresInSeconds = 600;

    try {
      const command = new PutObjectCommand({
        Bucket: bucket,
        Key: s3Key,
        ContentType: contentType,
        CacheControl: 'public, max-age=31536000, immutable',
        ContentDisposition: 'inline',
      });

      const uploadUrl = await getSignedUrl(this.s3Client, command, {
        expiresIn: expiresInSeconds,
      });

      return {
        uploadUrl,
        s3Key,
        bucket,
        expiresInSeconds,
      };
    } catch (error) {
      this.logger.error(`[S3Provider] Failed to generate presigned upload URL: ${(error as Error).message}`);
      throw new BadRequestException('Could not generate secure upload URL. Please try again.');
    }
  }

  async getAdminSignedViewUrl(s3Key: string, isMedia = false): Promise<string> {
    const bucketName = isMedia ? this.mediaBucket : this.vaultBucket;

    const command = new GetObjectCommand({
      Bucket: bucketName,
      Key: s3Key,
    });

    return getSignedUrl(this.s3Client, command, { expiresIn: 900 });
  }

  async putObject(s3Key: string, body: Buffer, contentType: string, bucket?: string): Promise<void> {
    const normalizedType = this.normalizeImageContentType(contentType);

    try {
      await this.s3Client.send(
        new PutObjectCommand({
          Bucket: bucket || this.mediaBucket,
          Key: s3Key,
          Body: body,
          ContentType: normalizedType,
        }),
      );
    } catch (error) {
      this.logger.error(`[S3Provider] S3 putObject failed for ${s3Key}: ${(error as Error).message}`);
      throw new BadRequestException('Failed to upload file to S3. Please try again.');
    }
  }

  async deleteObject(s3Key: string, isVault = false): Promise<void> {
    try {
      await this.s3Client.send(
        new DeleteObjectCommand({
          Bucket: isVault ? this.vaultBucket : this.mediaBucket,
          Key: s3Key,
        }),
      );
    } catch (error) {
      this.logger.warn(`[S3Provider] Failed to delete S3 object ${s3Key}: ${(error as Error).message}`);
    }
  }
}
