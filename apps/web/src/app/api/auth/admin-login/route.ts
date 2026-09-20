import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getApiBaseUrl } from '@/lib/api-config';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const res = await fetch(`${getApiBaseUrl()}/auth/admin-login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    const data = await res.json();

    if (!res.ok) {
      return NextResponse.json(data, { status: res.status });
    }

    const accessToken = data.accessToken as string | undefined;
    const refreshToken = data.refreshToken as string | undefined;
    // Never leak tokens or password hashes to the browser JS — cookies only.
    delete data.accessToken;
    delete data.refreshToken;
    if (data.user && typeof data.user === 'object') {
      delete data.user.passwordHash;
      delete data.user.refreshTokenHash;
    }

    const response = NextResponse.json(data, { status: res.status });

    if (accessToken) {
      response.cookies.set({
        name: 'astalakshimi.auth_token',
        value: accessToken,
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        path: '/',
        maxAge: 7 * 24 * 60 * 60,
      });
    }

    if (refreshToken) {
      response.cookies.set({
        name: 'astalakshimi.refresh_token',
        value: refreshToken,
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        path: '/',
        maxAge: 7 * 24 * 60 * 60,
      });
    }

    return response;
  } catch (error) {
    return NextResponse.json(
      { message: error instanceof Error ? error.message : 'Login failed' },
      { status: 500 },
    );
  }
}
