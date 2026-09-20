import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getApiBaseUrl } from '@/lib/api-config';

const cookieBase = {
  httpOnly: true as const,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax' as const,
  path: '/',
  maxAge: 7 * 24 * 60 * 60,
};

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const res = await fetch(`${getApiBaseUrl()}/auth/verify-otp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    const data = await res.json();

    if (!res.ok || !data.accessToken) {
      return NextResponse.json(data, { status: res.status });
    }

    const response = NextResponse.json({
      ...data,
      accessToken: undefined,
      refreshToken: undefined,
    });

    response.cookies.set({
      name: 'astalakshimi.auth_token',
      value: data.accessToken,
      ...cookieBase,
    });

    if (data.refreshToken) {
      response.cookies.set({
        name: 'astalakshimi.refresh_token',
        value: data.refreshToken,
        ...cookieBase,
      });
    }

    // Gates middleware: incomplete users are forced to /register until profile exists.
    response.cookies.set({
      name: 'astalakshimi.has_profile',
      value: data.hasProfile ? '1' : '0',
      ...cookieBase,
    });

    return response;
  } catch (error) {
    return NextResponse.json(
      { message: error instanceof Error ? error.message : 'Login failed' },
      { status: 500 },
    );
  }
}
