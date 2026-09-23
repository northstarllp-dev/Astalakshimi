import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import { getProfileCompleteness } from "@/lib/profile-completeness"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

const S3_PUBLIC_BASE =
  process.env.NEXT_PUBLIC_S3_MEDIA_BASE_URL ||
  `https://${process.env.NEXT_PUBLIC_S3_MEDIA_BUCKET || "ashtalakshmi-media"}.s3.${process.env.NEXT_PUBLIC_AWS_REGION || "ap-south-1"}.amazonaws.com`;

const CLOUDFRONT_BASE = process.env.NEXT_PUBLIC_CLOUDFRONT_URL || "";

export function buildMediaUrl(path: string): string {
  if (!path) return "/images/logo-lakshmi.png";
  // Pass through absolute / relative / in-memory preview URLs. Blob URLs must
  // never be treated as S3 keys (that produces a broken CDN URL after login).
  if (/^(https?:|data:|blob:|\/)/.test(path)) return path;
  
  const encoded = path.split("/").map(encodeURIComponent).join("/");

  // Explicit local mock only — real uploads (registration/edit) live in S3.
  // CDN/CloudFront will plug in via NEXT_PUBLIC_CLOUDFRONT_URL when added.
  if (process.env.NEXT_PUBLIC_MOCK_S3_UPLOADS === "true") {
    return `/api/proxy/media/demo-upload/${encoded}`;
  }
  
  if (CLOUDFRONT_BASE) {
    return `${CLOUDFRONT_BASE.replace(/\/$/, "")}/${encoded}`;
  }
  return `${S3_PUBLIC_BASE}/${encoded}`;
}

/** Normalize API photo fields that may be a key string or `{ s3Key | url }` object. */
export function resolveMediaPath(
  path: string | { s3Key?: string; url?: string } | null | undefined,
): string {
  if (!path) return ""
  if (typeof path === "string") return path
  if (typeof path === "object") {
    const key = path.s3Key || path.url
    return typeof key === "string" ? key : ""
  }
  return ""
}

export function getMediaUrl(
  path: string | { s3Key?: string; url?: string } | null | undefined,
): string {
  return buildMediaUrl(resolveMediaPath(path));
}

export function calculateProfileCompleteness(profile: any): number {
  return getProfileCompleteness(profile ?? null)
}
