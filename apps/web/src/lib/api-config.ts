const DEFAULT_API_BASE_URL = 'http://127.0.0.1:4000/api';

export function getApiBaseUrl(): string {
  return (
    process.env.API_URL ||
    process.env.NEXT_PUBLIC_API_URL ||
    DEFAULT_API_BASE_URL
  ).replace(/\/$/, '');
}
