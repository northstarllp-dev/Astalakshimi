import { Injectable, NotFoundException, BadRequestException, Inject } from '@nestjs/common';
import { DB_CLIENT } from '../database/database.constants';
import type { Database } from '@astalakshimi/database';
import { profiles, profilePhotos, verifications, horoscopes } from '@astalakshimi/database';
import { eq, and } from 'drizzle-orm';
import { S3Provider } from './providers/s3.provider';
import type {
  PresignedUploadInput,
  ConfirmPhotoInput,
  ConfirmVerificationInput,
  ConfirmHoroscopeInput,
} from '@astalakshimi/validation';

@Injectable()
export class MediaService {
  constructor(
    @Inject(DB_CLIENT) private readonly db: Database,
    private readonly s3Provider: S3Provider,
  ) {}

  async getUploadUrl(userId: string, input: PresignedUploadInput) {
    return this.s3Provider.generateUploadUrl(
      userId,
      input.purpose,
      input.contentType,
      input.fileSize,
    );
  }

  async uploadFileBuffer(
    userId: string,
    buffer: Buffer,
    input: PresignedUploadInput,
  ) {
    const { s3Key, bucket } = await this.s3Provider.generateUploadUrl(
      userId,
      input.purpose,
      input.contentType,
      input.fileSize,
    );

    await this.s3Provider.putObject(s3Key, buffer, input.contentType, bucket);

    return {
      s3Key,
      bucket,
      uploadUrl: '',
      expiresInSeconds: 0,
    };
  }

  async getSignedMediaUrl(s3Key: string): Promise<string> {
    return this.s3Provider.getSignedMediaUrl(s3Key);
  }

  getDemoMedia(s3Key: string) {
    return this.s3Provider.getDemoObject(s3Key);
  }

  async confirmPhoto(userId: string, input: ConfirmPhotoInput) {
    const [profile] = await this.db
      .select({ id: profiles.id })
      .from(profiles)
      .where(eq(profiles.userId, userId))
      .limit(1);

    if (!profile) {
      throw new NotFoundException('Profile not found. Please create your profile first.');
    }

    if (input.isPrimary) {
      // Clear existing primary flag
      await this.db
        .update(profilePhotos)
        .set({ isPrimary: false })
        .where(eq(profilePhotos.profileId, profile.id));
    }

    const [photo] = await this.db
      .insert(profilePhotos)
      .values({
        profileId: profile.id,
        s3Key: input.s3Key,
        isPrimary: input.isPrimary ?? false,
        displayOrder: input.displayOrder ?? 0,
        status: 'pending',
      })
      .returning();

    return {
      success: true,
      photo,
    };
  }

  async confirmVerification(userId: string, input: ConfirmVerificationInput) {
    const [profile] = await this.db
      .select({ id: profiles.id })
      .from(profiles)
      .where(eq(profiles.userId, userId))
      .limit(1);

    if (!profile) {
      throw new NotFoundException('Profile not found');
    }

    const [verification] = await this.db
      .insert(verifications)
      .values({
        profileId: profile.id,
        method: input.method,
        selfieS3Key: input.selfieS3Key || null,
        govtIdType: input.govtIdType || null,
        govtIdS3Key: input.govtIdS3Key || null,
        status: 'pending',
      })
      .onConflictDoUpdate({
        target: verifications.profileId,
        set: {
          method: input.method,
          selfieS3Key: input.selfieS3Key || null,
          govtIdType: input.govtIdType || null,
          govtIdS3Key: input.govtIdS3Key || null,
          status: 'pending',
          rejectionReason: null,
          updatedAt: new Date(),
        },
      })
      .returning();

    return {
      success: true,
      message: 'Verification document submitted for review (12-hour SLA)',
      verification,
    };
  }

  async confirmHoroscope(userId: string, input: ConfirmHoroscopeInput) {
    const [profile] = await this.db
      .select({ id: profiles.id })
      .from(profiles)
      .where(eq(profiles.userId, userId))
      .limit(1);

    if (!profile) {
      throw new NotFoundException('Profile not found');
    }

    const [horoscope] = await this.db
      .insert(horoscopes)
      .values({
        profileId: profile.id,
        horoscopeS3Key: input.horoscopeS3Key,
        horoscopeFileName: input.fileName,
        horoscopeFileSizeBytes: input.fileSizeBytes,
      })
      .onConflictDoUpdate({
        target: horoscopes.profileId,
        set: {
          horoscopeS3Key: input.horoscopeS3Key,
          horoscopeFileName: input.fileName,
          horoscopeFileSizeBytes: input.fileSizeBytes,
          updatedAt: new Date(),
        },
      })
      .returning();

    return {
      success: true,
      horoscope,
    };
  }

  async deletePhoto(userId: string, photoId: string) {
    const [profile] = await this.db
      .select({ id: profiles.id })
      .from(profiles)
      .where(eq(profiles.userId, userId))
      .limit(1);

    if (!profile) {
      throw new NotFoundException('Profile not found');
    }

    const [photo] = await this.db
      .select()
      .from(profilePhotos)
      .where(and(eq(profilePhotos.id, photoId), eq(profilePhotos.profileId, profile.id)))
      .limit(1);

    if (!photo) {
      throw new NotFoundException('Photo not found');
    }

    await this.db.delete(profilePhotos).where(eq(profilePhotos.id, photoId));
    await this.s3Provider.deleteObject(photo.s3Key, false);

    return {
      success: true,
      message: 'Photo removed successfully',
    };
  }
}
