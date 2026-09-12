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
  if (/^(https?:|data:|\/)/.test(path)) return path;
  
  const encoded = path.split("/").map(encodeURIComponent).join("/");

  if (process.env.NODE_ENV !== "production" && process.env.NEXT_PUBLIC_MOCK_S3_UPLOADS !== "false") {
    return `/api/proxy/media/demo-upload/${encoded}`;
  }
  
  if (CLOUDFRONT_BASE) {
    return `${CLOUDFRONT_BASE.replace(/\/$/, "")}/${encoded}`;
  }
  return `${S3_PUBLIC_BASE}/${encoded}`;
}

export function getMediaUrl(path: string | undefined | null): string {
  return buildMediaUrl(path ?? "");
}

export function calculateProfileCompleteness(profile: any): number {
  return getProfileCompleteness(profile ?? null)
}
