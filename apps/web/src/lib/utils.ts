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

export function calculateProfileCompleteness(profile: any): number {
  if (!profile) return 0;
  let score = 0;
  if (profile.fullName) score += 10;
  if (profile.dob || (profile.dobYear && profile.dobMonth && profile.dobDay)) score += 10;
  if (profile.religion && profile.caste) score += 10;
  if (profile.city && profile.state) score += 10;
  if (profile.educationLevel || profile.education) score += 10;
  if ((profile.profession || profile.occupation) && profile.annualIncome) score += 10;
  if (profile.aboutMe && profile.aboutMe.length > 5) score += 10;
  if (profile.companyName) score += 10;
  if (profile.photos && profile.photos.length > 0) score += 20;
  return Math.min(score, 100);
}
