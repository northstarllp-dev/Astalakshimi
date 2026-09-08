import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import * as crypto from 'crypto';
import { getApiBaseUrl } from '@/lib/api-config';

const isDevMock =
  process.env.BFF_DEV_OTP === 'true' &&
  (process.env.NODE_ENV !== 'production' || process.env.BFF_DEV_OTP_FORCE === 'true');

/**
 * Dev-only OTP mock for the BFF. Lets the Vercel preview demo work without the
 * EC2 NestJS API being reachable. Refuses to run in production unless
 * BFF_DEV_OTP_FORCE=true is set, and is fully gated behind BFF_DEV_OTP=true.
 *
 * Reaches through to the real API when reachable; otherwise proxies locally.
 */
export async function POST(request: NextRequest) {
  if (!isDevMock) {
    // Forward to the real BFF login route (which hits EC2).
    const body = await request.json();
    const res = await fetch(`${getApiBaseUrl()}/auth/verify-otp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    const data = await res.json();
    const response = NextResponse.json(data, { status: res.status });
    if (res.ok && data.accessToken) {
      response.cookies.set({
        name: 'astalakshimi.auth_token',
        value: data.accessToken,
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        path: '/',
        maxAge: 7 * 24 * 60 * 60,
      });
      if (data.refreshToken) {
        response.cookies.set({
          name: 'astalakshimi.refresh_token',
          value: data.refreshToken,
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'lax',
          path: '/',
          maxAge: 7 * 24 * 60 * 60,
        });
      }
      delete data.accessToken;
      delete data.refreshToken;
    }
    return NextResponse.json(data, { status: res.status, headers: response.headers });
  }

  const body = (await request.json()) as { phone?: string; otp?: string };
  if (!body.phone || !body.otp) {
    return NextResponse.json({ message: 'phone and otp are required' }, { status: 400 });
  }
  // Mock mode: any 6-digit number is accepted; response shape matches the API.
  const userId = crypto.randomUUID();
  const accessToken = `dev.${userId}`;
  const refreshToken = `dev-refresh.${userId}`;
  const response = NextResponse.json(
    {
      accessToken,
      refreshToken,
      user: {
        id: userId,
        phone: body.phone,
        role: 'member',
        status: 'active',
        isPhoneVerified: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      isNewUser: true,
      hasProfile: false,
    },
    { status: 201 },
  );
  response.cookies.set({
    name: 'astalakshimi.auth_token',
    value: accessToken,
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 7 * 24 * 60 * 60,
  });
  response.cookies.set({
    name: 'astalakshimi.refresh_token',
    value: refreshToken,
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 7 * 24 * 60 * 60,
  });
  return response;
}
