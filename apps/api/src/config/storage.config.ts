import { registerAs } from '@nestjs/config';

function requireEnv(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new Error(
      `Refusing to start: ${name} is required. Set it in the repo-root .env (real S3 / RDS / SMS — no mock fallbacks).`,
    );
  }
  return value;
}

export default registerAs('storage', () => {
  const accessKeyId = requireEnv('AWS_ACCESS_KEY_ID');
  const secretAccessKey = requireEnv('AWS_SECRET_ACCESS_KEY');
  const mediaBucket = requireEnv('AWS_S3_MEDIA_BUCKET');
  const vaultBucket = requireEnv('AWS_S3_VAULT_BUCKET');

  return {
    region: process.env.AWS_REGION?.trim() || 'ap-south-1',
    accessKeyId,
    secretAccessKey,
    mediaBucket,
    vaultBucket,
    cdnUrl: process.env.CLOUDFRONT_URL?.trim() || '',
  };
});
