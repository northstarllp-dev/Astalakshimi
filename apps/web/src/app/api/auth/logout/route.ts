import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api';

export async function POST() {
  // Revoke the refresh token server-side so it cannot be replayed
  const cookieStore = await cookies();
  const accessToken = cookieStore.get('astalakshimi.auth_token')?.value;

  if (accessToken) {
    try {
      await fetch(`${API_URL}/auth/logout`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${accessToken}` },
      });
    } catch {
      // Best-effort revocation - cookies are cleared regardless
    }
  }

  const response = NextResponse.json({ success: true });
  response.cookies.delete('astalakshimi.auth_token');
  response.cookies.delete('astalakshimi.refresh_token');
  return response;
}
