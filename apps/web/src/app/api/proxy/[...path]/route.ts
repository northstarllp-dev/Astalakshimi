import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { cookies } from 'next/headers';
import { getApiBaseUrl } from '@/lib/api-config';

async function handleProxy(request: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
  const resolvedParams = await params;
  const path = resolvedParams.path.join('/');
  const searchParams = request.nextUrl.searchParams.toString();
  const queryString = searchParams ? `?${searchParams}` : '';
  const url = `${getApiBaseUrl()}/${path}${queryString}`;

  const cookieStore = await cookies();
  const token = cookieStore.get('astalakshimi.auth_token')?.value;

  const headers = new Headers(request.headers);
  for (const name of [
    'host',
    'cookie',
    'connection',
    'keep-alive',
    'transfer-encoding',
    'te',
    'trailer',
    'upgrade',
    'expect',
    'proxy-connection',
    'proxy-authenticate',
    'proxy-authorization',
  ]) {
    headers.delete(name);
  }
  
  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  const options: RequestInit = {
    method: request.method,
    headers,
    redirect: 'manual',
  };

  if (request.method !== 'GET' && request.method !== 'HEAD') {
    const contentType = request.headers.get('content-type') || '';
    if (contentType.includes('multipart/form-data')) {
      options.body = await request.arrayBuffer();
    } else {
      const bodyText = await request.text();
      if (bodyText) {
        options.body = bodyText;
      }
    }
  }

  try {
    let res = await fetch(url, options);
    
    if (res.status === 401) {
      const refreshToken = cookieStore.get('astalakshimi.refresh_token')?.value;
      
      if (refreshToken) {
        const refreshRes = await fetch(`${getApiBaseUrl()}/auth/refresh`, {
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
            sameSite: 'lax',
            path: '/',
            maxAge: 30 * 24 * 60 * 60,
          });

          if (newRefreshToken) {
            finalResponse.cookies.set({
              name: 'astalakshimi.refresh_token',
              value: newRefreshToken,
              httpOnly: true,
              secure: process.env.NODE_ENV === 'production',
              sameSite: 'lax',
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
    const causeCode = error?.cause?.code || error?.code;
    const apiUnavailable =
      causeCode === 'ECONNREFUSED' ||
      causeCode === 'ECONNRESET' ||
      error?.message?.includes('fetch failed');

    console.error('Proxy error fetching', url, ':', error);

    return NextResponse.json(
      {
        message: apiUnavailable
          ? 'API server is not running. Start it with `pnpm dev` and wait for "Nest application successfully started".'
          : 'Proxy error',
        error: error.message,
        cause: error.cause,
      },
      { status: 502 },
    );
  }
}

export const GET = handleProxy;
export const POST = handleProxy;
export const PUT = handleProxy;
export const PATCH = handleProxy;
export const DELETE = handleProxy;
