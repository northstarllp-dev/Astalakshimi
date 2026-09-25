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

  private extensionFor(contentType: string): string {
    const known: Record<string, string> = {
      'image/jpeg': 'jpg',
      'image/jpg': 'jpg',
      'image/png': 'png',
      'image/webp': 'webp',
      'image/gif': 'gif',
      'image/heic': 'heic',
      'application/pdf': 'pdf',
      'application/msword': 'doc',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'docx',
    };
    if (known[contentType]) return known[contentType];
    const subtype = contentType.split('/')[1]?.split(';')[0]?.replace(/[^a-z0-9]/gi, '') || '';
    if (subtype && subtype.length <= 8) return subtype.toLowerCase();
    return 'bin';
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
    const allowedHoroscope = ['application/pdf', 'image/jpeg', 'image/jpg'];
    const isHoroscope = purpose === 'horoscope';
    const isGovtId = purpose === 'govt_id';

    if (isHoroscope) {
      if (!allowedHoroscope.includes(contentType) || fileSize > 10 * 1024 * 1024) {
        throw new BadRequestException('Horoscope must be a PDF or JPG file under 10 MB.');
      }
    } else if (isGovtId) {
      if (!contentType || fileSize > 15 * 1024 * 1024) {
        throw new BadRequestException('Government ID must be a file under 15 MB.');
      }
    } else if (!allowedImages.includes(contentType) || fileSize > 5 * 1024 * 1024) {
      throw new BadRequestException('Photos must be JPG, PNG, or WEBP under 5 MB.');
    }

    let bucket = this.mediaBucket;
    let s3Key = '';
    const ext = this.extensionFor(contentType);
    const uniqueId = uuidv4();

    switch (purpose) {
      case 'profile_photo':
        bucket = this.mediaBucket;
        s3Key = `profiles/${userId}/photos/${uniqueId}.${ext}`;
        break;
      case 'horoscope':
        bucket = this.mediaBucket;
        s3Key = `profiles/${userId}/horoscopes/${uniqueId}.${ext}`;
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
    const storedType =
      contentType === 'image/jpg' ? 'image/jpeg' : contentType || 'application/octet-stream';

    try {
      await this.s3Client.send(
        new PutObjectCommand({
          Bucket: bucket || this.mediaBucket,
          Key: s3Key,
          Body: body,
          ContentType: storedType,
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
