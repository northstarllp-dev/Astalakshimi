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

  // Fallback to secure API proxy for on-the-fly presigned URL generation
  return `/api/proxy/media/image?key=${encodeURIComponent(path)}`;
}
