const path = require('path');
const dotenv = require('dotenv');

// Root .env holds the creds; apps/api/.env can override them for this workspace.
// Loaded in this order so the more specific file wins.
dotenv.config({ path: path.resolve(__dirname, '../../../.env') });
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const {
  S3Client,
  ListObjectsV2Command,
  CopyObjectCommand,
  HeadObjectCommand,
} = require('@aws-sdk/client-s3');

const REGION = process.env.AWS_REGION || 'ap-south-1';
const MEDIA_BUCKET = process.env.AWS_S3_MEDIA_BUCKET || 'ashtalakshmi-media';
const TARGET_CACHE_CONTROL = 'public, max-age=31536000, immutable';

// Only touch the prefixes the public-read policy exposes. Never touch the vault
// bucket -- those objects are private and signed at read time.
const PUBLIC_PREFIXES = ['profiles/', 'horoscopes/'];

const DRY_RUN = process.argv.includes('--dry-run');

async function main() {
  const accessKeyId = process.env.AWS_ACCESS_KEY_ID;
  const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY;

  if (!accessKeyId || !secretAccessKey) {
    console.error('Missing AWS_ACCESS_KEY_ID / AWS_SECRET_ACCESS_KEY. Load .env first.');
    process.exit(1);
  }

  const client = new S3Client({ region: REGION, credentials: { accessKeyId, secretAccessKey } });

  let continuationToken;
  let scanned = 0;
  let updated = 0;
  let skipped = 0;
  let failed = 0;

  console.log(`Scanning s3://${MEDIA_BUCKET} (${REGION}) for missing Cache-Control headers`);
  if (DRY_RUN) console.log('-- DRY RUN: no writes will be performed --');

  do {
    const listed = await client.send(
      new ListObjectsV2Command({ Bucket: MEDIA_BUCKET, ContinuationToken: continuationToken }),
    );

    for (const object of listed.Contents || []) {
      const key = object.Key;
      if (!PUBLIC_PREFIXES.some((prefix) => key.startsWith(prefix))) continue;

      scanned += 1;

      const head = await client.send(new HeadObjectCommand({ Bucket: MEDIA_BUCKET, Key: key }));
      if (head.CacheControl === TARGET_CACHE_CONTROL) {
        skipped += 1;
        continue;
      }

      if (DRY_RUN) {
        console.log(`  would update  ${key}  (was: ${head.CacheControl || 'none'})`);
        updated += 1;
        continue;
      }

      try {
        await client.send(
          new CopyObjectCommand({
            Bucket: MEDIA_BUCKET,
            Key: key,
            CopySource: `${MEDIA_BUCKET}/${key}`,
            ContentType: head.ContentType,
            CacheControl: TARGET_CACHE_CONTROL,
            ContentDisposition: 'inline',
            MetadataDirective: 'REPLACE',
          }),
        );
        updated += 1;
        if (updated % 25 === 0) console.log(`  ${updated} updated...`);
      } catch (error) {
        failed += 1;
        console.error(`  FAILED ${key}: ${error.message}`);
      }
    }

    continuationToken = listed.IsTruncated ? listed.NextContinuationToken : undefined;
  } while (continuationToken);

  console.log('\nDone.');
  console.log(`  scanned:         ${scanned}`);
  console.log(`  updated:         ${updated}`);
  console.log(`  already correct: ${skipped}`);
  console.log(`  failed:          ${failed}`);

  process.exit(failed > 0 ? 1 : 0);
}

main().catch((error) => {
  console.error('Backfill failed:', error);
  process.exit(1);
});
