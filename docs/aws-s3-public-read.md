# Making `ashtalakshmi-media` publicly readable

Profile photos and horoscope PDFs are served **directly from S3** to the browser
(no API hop, no CloudFront yet). That requires the `ashtalakshmi-media` bucket to
allow public `GET` on two prefixes only.

The verification bucket (`ashtalakshmi-verification` — selfies, government IDs)
stays **fully private** and continues to use short-lived signed URLs.

## Scope

| Bucket | Prefix | Access |
| --- | --- | --- |
| `ashtalakshmi-media` | `profiles/*` | public read |
| `ashtalakshmi-media` | `horoscopes/*` | public read (reserved — nothing written here yet) |
| `ashtalakshmi-media` | anything else | private |
| `ashtalakshmi-verification` | all | private (signed URLs only) |

All user media lives under `profiles/`, including horoscope PDFs, which are
written to `profiles/{userId}/horoscopes/{uuid}.pdf`. The top-level
`horoscopes/*` prefix is in the policy for safety but is currently unused.

Because the policy is scoped by prefix, a future upload that uses a new key
prefix is private by default. That is intentional — public access must be opted
into explicitly.

## 1. Unblock public bucket policies

AWS rejects a public bucket policy outright if "Block all public access" is fully
enabled, even when the policy itself is valid.

1. S3 → **Buckets** → `ashtalakshmi-media` → **Permissions**
2. Under **Block public access (bucket settings)** → **Edit**
3. Uncheck **Block public access to buckets and objects granted through new public bucket policies**
   and **Block public and cross-account access to buckets and objects through any public bucket policies**
4. **Leave both ACL-related checkboxes enabled** — we use policies, not ACLs
5. Save

Values after this step: `BlockPublicAcls=true, IgnorePublicAcls=true,
BlockPublicPolicy=false, RestrictPublicBuckets=false`.

## 2. Apply the bucket policy

**Permissions** → **Bucket policy** → **Edit**, then paste:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "PublicReadForMediaPrefixes",
      "Effect": "Allow",
      "Principal": "*",
      "Action": "s3:GetObject",
      "Resource": [
        "arn:aws:s3:::ashtalakshmi-media/profiles/*",
        "arn:aws:s3:::ashtalakshmi-media/horoscopes/*"
      ]
    }
  ]
}
```

Same thing via CLI (useful later in CI):

```bash
aws s3api put-bucket-policy \
  --bucket ashtalakshmi-media \
  --policy file://infrastructure/s3-media-public-read-policy.json
```

The policy JSON is checked in at `infrastructure/s3-media-public-read-policy.json`.

## 3. Configure CORS

Already done on this bucket — CORS is configured with `GET`, `PUT`, `POST`,
`HEAD` allowed for `http://localhost:3000`, `https://astalakshmi-web.vercel.app`,
and `https://astalakshmi-web-northstar-stayflo.vercel.app`.

If you deploy a new web origin, add it to `AllowedOrigins`:

```json
[
  {
    "AllowedHeaders": ["*"],
    "AllowedMethods": ["GET", "PUT", "POST", "HEAD"],
    "AllowedOrigins": [
      "http://localhost:3000",
      "https://astalakshmi-web.vercel.app",
      "https://astalakshmi-web-northstar-stayflo.vercel.app"
    ],
    "ExposeHeaders": ["ETag"],
    "MaxAgeSeconds": 3000
  }
]
```

`PUT` is present because uploads go directly from the browser to S3 via
presigned URLs.

## 4. Verify

Public object (expect `200`):

```bash
curl -I "https://ashtalakshmi-media.s3.ap-south-1.amazonaws.com/profiles/<userId>/photos/<key>.jpg"
```

Confirm the response carries:

```
HTTP/1.1 200 OK
Content-Type: image/jpeg
Cache-Control: public, max-age=31536000, immutable
```

Private object (expect `403`):

```bash
curl -I "https://ashtalakshmi-verification.s3.ap-south-1.amazonaws.com/verifications/<userId>/selfie-<key>.jpg"
```

If the public object still returns `403`, re-check step 1 — a fully-enabled
Block Public Access silently overrides a correct policy.

## Cache headers

New uploads set `Cache-Control: public, max-age=31536000, immutable` and
`Content-Disposition: inline` at upload time (see `S3Provider.generateUploadUrl`).
This is safe because every object key contains a UUID and never changes — a
re-upload produces a new key rather than overwriting.

Objects uploaded *before* that change need a backfill:

The script lives in `apps/api/scripts/` because `dotenv` and
`@aws-sdk/client-s3` are only resolvable from that workspace — run it from there:

```bash
cd apps/api
node scripts/backfill-s3-cache-headers.cjs --dry-run   # preview
node scripts/backfill-s3-cache-headers.cjs             # apply
```

It is idempotent: objects that already have the right `Cache-Control` are
skipped, so it is safe to re-run. It only walks the `profiles/` and
`horoscopes/` prefixes and never touches the verification bucket.

Each object is rewritten with `CopyObject` + `MetadataDirective: REPLACE`,
copying the object onto itself. The original `ContentType` is read first and
passed through, so JPEGs stay `image/jpeg` and PDFs stay `application/pdf`.

## Tradeoff: public URLs and photo privacy

Photos are reachable at a predictable URL. This is deliberate — a matrimonial
profile photo is inherently semi-public, and it is what makes the images
cacheable at the CDN edge later.

What is still protected:

- The API only returns photo keys for profiles a viewer is permitted to see.
- Profiles that are under review or not connected render with a CSS blur, so the
  photo is not legible even if the URL is opened directly.
- **KYC documents (selfie, government ID) live in a separate private bucket and
  are never public.** They continue to use 15-minute signed URLs.

If a stricter model is ever required, the options are (a) signed S3 URLs, or
(b) CloudFront with signed cookies — see the plan's "Future work" section.

## Moving to CloudFront later

The frontend reads `NEXT_PUBLIC_CLOUDFRONT_URL`. Setting it switches every image
to the CDN with no code change:

```
NEXT_PUBLIC_CLOUDFRONT_URL=https://d111111abcdef8.cloudfront.net
```

`getMediaUrl()` prefers it over the S3 hostname, and `**.cloudfront.net` is
already in `remotePatterns` in `apps/web/next.config.ts`.

When that distribution is created, use **Origin Access Control** (not the
deprecated Origin Access Identity) and add the CloudFront service principal to
this bucket policy — the two statements coexist.
