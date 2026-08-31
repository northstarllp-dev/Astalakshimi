import { registerAs } from '@nestjs/config';

export default registerAs('storage', () => {
  const nodeEnv = process.env.NODE_ENV || 'development';
  const mockUploadsExplicit = process.env.MOCK_S3_UPLOADS;
  const mockUploads =
    mockUploadsExplicit === 'true' ||
    (nodeEnv !== 'production' && mockUploadsExplicit !== 'false');

  return {
    region: process.env.AWS_REGION || 'ap-south-1',
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || '',
    mediaBucket: process.env.AWS_S3_MEDIA_BUCKET || 'astalakshimi-media-dev',
    vaultBucket: process.env.AWS_S3_VAULT_BUCKET || 'astalakshimi-vault-dev',
    cdnUrl: process.env.CLOUDFRONT_URL || '',
    /** When true, uploads are stored in memory instead of S3 (local demo). */
    mockUploads,
  };
});
