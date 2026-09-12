import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getApiBaseUrl } from '@/lib/api-config';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // Call NestJS admin-login
    const res = await fetch(`${getApiBaseUrl()}/auth/admin-login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    
    const data = await res.json();
    const response = NextResponse.json(data, { status: res.status });
    
    if (res.ok && data.accessToken) {
      // Set HTTP-only cookies. The access token itself is short-lived; the BFF
      // auto-refreshes via /api/proxy on 401 and re-sets these cookies.
      response.cookies.set({
        name: 'astalakshimi.auth_token',
        value: data.accessToken,
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        path: '/',
        maxAge: 7 * 24 * 60 * 60, // 7 days (matches refresh cookie; API enforces token expiry)
      });
      
      if (data.refreshToken) {
        response.cookies.set({
          name: 'astalakshimi.refresh_token',
          value: data.refreshToken,
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'lax',
          path: '/',
          maxAge: 7 * 24 * 60 * 60, // 7 days
        });
      }
      
      delete data.accessToken;
      delete data.refreshToken;
    }
    
    return NextResponse.json(data, { status: res.status, headers: response.headers });
  } catch (error) {
    return NextResponse.json({ message: error instanceof Error ? error.message : 'Login failed' }, { status: 500 });
  }
}
