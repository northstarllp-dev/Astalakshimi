import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { cookies } from 'next/headers';

const NEXT_PUBLIC_API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api';

async function handleProxy(request: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
  const resolvedParams = await params;
  const path = resolvedParams.path.join('/');
  const searchParams = request.nextUrl.searchParams.toString();
  const queryString = searchParams ? `?${searchParams}` : '';
  const url = `${NEXT_PUBLIC_API_URL}/${path}${queryString}`;

  const cookieStore = await cookies();
  const token = cookieStore.get('astalakshimi.auth_token')?.value;

  const headers = new Headers(request.headers);
  headers.delete('host');
  headers.delete('cookie');
  
  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  const options: RequestInit = {
    method: request.method,
    headers,
    redirect: 'manual',
  };

  if (request.method !== 'GET' && request.method !== 'HEAD') {
    const bodyText = await request.text();
    if (bodyText) {
      options.body = bodyText;
    }
  }

  try {
    let res = await fetch(url, options);
    
    if (res.status === 401) {
      const refreshToken = cookieStore.get('astalakshimi.refresh_token')?.value;
      
      if (refreshToken) {
        const refreshRes = await fetch(`${NEXT_PUBLIC_API_URL}/auth/refresh`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ refreshToken }),
        });

        if (refreshRes.ok) {
          const refreshData = await refreshRes.json();
          const newAccessToken = refreshData.accessToken;
          const newRefreshToken = refreshData.refreshToken;

          // Update headers and retry request
          headers.set('Authorization', `Bearer ${newAccessToken}`);
          options.headers = headers;
          res = await fetch(url, options);

          const responseHeaders = new Headers(res.headers);
          responseHeaders.delete('content-encoding');
          
          const finalResponse = new NextResponse(res.body, {
            status: res.status,
            statusText: res.statusText,
            headers: responseHeaders,
          });

          finalResponse.cookies.set({
            name: 'astalakshimi.auth_token',
            value: newAccessToken,
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'strict',
            path: '/',
            maxAge: 30 * 24 * 60 * 60,
          });

          if (newRefreshToken) {
            finalResponse.cookies.set({
              name: 'astalakshimi.refresh_token',
              value: newRefreshToken,
              httpOnly: true,
              secure: process.env.NODE_ENV === 'production',
              sameSite: 'strict',
              path: '/',
              maxAge: 7 * 24 * 60 * 60,
            });
          }

          return finalResponse;
        } else {
          // If refresh token fails, clear cookies and return 401
          const finalResponse = new NextResponse(res.body, {
            status: 401,
            statusText: 'Unauthorized',
          });
          finalResponse.cookies.delete('astalakshimi.auth_token');
          finalResponse.cookies.delete('astalakshimi.refresh_token');
          return finalResponse;
        }
      }
    }

    // Pass back response from NestJS
    const responseHeaders = new Headers(res.headers);
    responseHeaders.delete('content-encoding'); // Let Next.js handle encoding
    
    return new NextResponse(res.body, {
      status: res.status,
      statusText: res.statusText,
      headers: responseHeaders,
    });
  } catch (error: any) {
    console.error('Proxy error fetching', url, ':', error);
    return NextResponse.json({ message: 'Proxy error', error: error.message, cause: error.cause }, { status: 502 });
  }
}

export const GET = handleProxy;
export const POST = handleProxy;
export const PUT = handleProxy;
export const PATCH = handleProxy;
export const DELETE = handleProxy;
