import { Injectable, BadRequestException, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { v4 as uuidv4 } from 'uuid';
import type { UploadPurpose, PresignedUploadResponse } from '@astalakshimi/types';

@Injectable()
export class S3Provider {
  private readonly logger = new Logger(S3Provider.name);
  private s3Client: S3Client;
  private mediaBucket: string;
  private vaultBucket: string;
  private isConfigured: boolean;

  constructor(private readonly configService: ConfigService) {
    const region = this.configService.get<string>('storage.region') || 'ap-south-1';
    const accessKeyId = this.configService.get<string>('storage.accessKeyId') || '';
    const secretAccessKey = this.configService.get<string>('storage.secretAccessKey') || '';

    this.mediaBucket = this.configService.get<string>('storage.mediaBucket') || 'astalakshimi-media-dev';
    this.vaultBucket = this.configService.get<string>('storage.vaultBucket') || 'astalakshimi-vault-dev';
    this.isConfigured = Boolean(accessKeyId && secretAccessKey);

    if (this.isConfigured) {
      this.s3Client = new S3Client({
        region,
        credentials: { accessKeyId, secretAccessKey },
      });
    } else {
      this.logger.warn('[S3Provider] AWS credentials not configured. Running in mock presigned URL mode for local dev.');
      this.s3Client = new S3Client({ region });
    }
  }

  async generateUploadUrl(
    userId: string,
    purpose: UploadPurpose,
    contentType: string,
    fileSize: number,
  ): Promise<PresignedUploadResponse> {
    const allowedImages = ['image/jpeg', 'image/png', 'image/webp'];
    const isPdf = contentType === 'application/pdf';

    // Validate Purpose vs File Type
    if (purpose === 'horoscope') {
      if (!isPdf || fileSize > 10 * 1024 * 1024) {
        throw new BadRequestException('Horoscope must be a PDF file under 10 MB.');
      }
    } else {
      if (!allowedImages.includes(contentType) || fileSize > 5 * 1024 * 1024) {
        throw new BadRequestException('Photos must be JPG, PNG, or WEBP under 5 MB.');
      }
    }

    // Determine target bucket & structured S3 key
    let bucket = this.mediaBucket;
    let s3Key = '';
    const ext = isPdf ? 'pdf' : contentType.split('/')[1] || 'jpg';
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

    const expiresInSeconds = 600; // 10 minutes

    if (!this.isConfigured) {
      // Mock Presigned URL for local development without active AWS account
      return {
        uploadUrl: `https://${bucket}.s3.amazonaws.com/${s3Key}?mock-signature=${uniqueId}`,
        s3Key,
        bucket,
        expiresInSeconds,
      };
    }

    try {
      const command = new PutObjectCommand({
        Bucket: bucket,
        Key: s3Key,
        ContentType: contentType,
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

  async getAdminSignedViewUrl(s3Key: string): Promise<string> {
    if (!this.isConfigured) {
      return `https://${this.vaultBucket}.s3.amazonaws.com/${s3Key}?mock-view-token=valid`;
    }

    const command = new GetObjectCommand({
      Bucket: this.vaultBucket,
      Key: s3Key,
    });

    return getSignedUrl(this.s3Client, command, { expiresIn: 900 }); // 15 minutes
  }

  async getSignedMediaUrl(s3Key: string): Promise<string> {
    if (!this.isConfigured) {
      return `https://${this.mediaBucket}.s3.amazonaws.com/${s3Key}?mock-view-token=valid`;
    }

    const command = new GetObjectCommand({
      Bucket: this.mediaBucket,
      Key: s3Key,
    });

    return getSignedUrl(this.s3Client, command, { expiresIn: 3600 }); // 1 hour for standard media
  }

  async deleteObject(s3Key: string, isVault = false): Promise<void> {
    if (!this.isConfigured) return;

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
