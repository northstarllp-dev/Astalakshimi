import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getApiBaseUrl } from '@/lib/api-config';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // Call NestJS verify-otp
    const res = await fetch(`${getApiBaseUrl()}/auth/verify-otp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    
    const data = await res.json();
    const response = NextResponse.json(data, { status: res.status });
    
    if (res.ok && data.accessToken) {
      // Set HTTP-only cookies
      response.cookies.set({
        name: 'astalakshimi.auth_token',
        value: data.accessToken,
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        path: '/',
        maxAge: 30 * 24 * 60 * 60, // 30 days
      });
      
      if (data.refreshToken) {
        response.cookies.set({
          name: 'astalakshimi.refresh_token',
          value: data.refreshToken,
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'strict',
          path: '/',
          maxAge: 7 * 24 * 60 * 60, // 7 days
        });
      }
      
      delete data.accessToken;
      delete data.refreshToken;
    }
    
    return NextResponse.json(data, { status: res.status, headers: response.headers });
  } catch (error: any) {
    return NextResponse.json({ message: error.message }, { status: 500 });
  }
}
