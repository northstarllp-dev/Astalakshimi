import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { getApiBaseUrl } from '@/lib/api-config';

/**
 * Re-reads /auth/me and sets `astalakshimi.has_profile` so middleware can
 * unlock the app after complete-registration (or heal a missing flag).
 */
export async function POST() {
  const cookieStore = await cookies();
  const accessToken = cookieStore.get('astalakshimi.auth_token')?.value;

  if (!accessToken) {
    return NextResponse.json({ message: 'Not authenticated' }, { status: 401 });
  }

  try {
    const res = await fetch(`${getApiBaseUrl()}/auth/me`, {
      headers: { Authorization: `Bearer ${accessToken}` },
      cache: 'no-store',
    });
    const data = await res.json();
    if (!res.ok) {
      return NextResponse.json(data, { status: res.status });
    }

    const hasProfile = Boolean(data.hasProfile);
    const response = NextResponse.json({ hasProfile });
    response.cookies.set({
      name: 'astalakshimi.has_profile',
      value: hasProfile ? '1' : '0',
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 7 * 24 * 60 * 60,
    });
    return response;
  } catch (error) {
    return NextResponse.json(
      { message: error instanceof Error ? error.message : 'Failed to sync enrollment' },
      { status: 500 },
    );
  }
}
