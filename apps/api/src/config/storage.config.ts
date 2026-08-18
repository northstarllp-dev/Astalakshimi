import { registerAs } from '@nestjs/config';

export default registerAs('storage', () => ({
  region: process.env.AWS_REGION || 'ap-south-1',
  accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || '',
  mediaBucket: process.env.AWS_S3_MEDIA_BUCKET || 'astalakshimi-media-dev',
  vaultBucket: process.env.AWS_S3_VAULT_BUCKET || 'astalakshimi-vault-dev',
  cdnUrl: process.env.CLOUDFRONT_URL || '',
}));
