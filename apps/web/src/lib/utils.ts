import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function getMediaUrl(path: string | undefined | null): string {
  if (!path) return "/images/logo-lakshmi.png";
  if (path.startsWith("http://") || path.startsWith("https://") || path.startsWith("data:")) return path;
  if (path.startsWith("/")) return path;
  
  const cloudfront = process.env.NEXT_PUBLIC_CLOUDFRONT_URL;
  if (cloudfront) {
    const base = cloudfront.endsWith("/") ? cloudfront : `${cloudfront}/`;
    return `${base}${path}`;
  }

  // Direct S3 bucket URL fallback
  return `https://astalakshimi-media-dev.s3.ap-south-1.amazonaws.com/${path}`;
}
