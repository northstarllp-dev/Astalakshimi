import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getApiBaseUrl } from '@/lib/api-config';

const isDevMock =
  process.env.BFF_DEV_OTP === 'true' &&
  (process.env.NODE_ENV !== 'production' || process.env.BFF_DEV_OTP_FORCE === 'true');

export async function POST(request: NextRequest) {
  if (!isDevMock) {
    // Forward to the real API — this is the path Vercel prod / staging should use.
    const body = await request.json();
    try {
      const res = await fetch(`${getApiBaseUrl()}/auth/send-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await res.json().catch(() => ({}));
      return NextResponse.json(data, { status: res.status });
    } catch (error) {
      return NextResponse.json(
        { message: error instanceof Error ? error.message : 'Upstream unreachable' },
        { status: 502 },
      );
    }
  }

  const body = (await request.json()) as { phone?: string; consentAccepted?: boolean };
  if (!body.phone || !body.consentAccepted) {
    return NextResponse.json({ message: 'phone and consentAccepted are required' }, { status: 400 });
  }
  // Dev mode: always return 123456. Front-end auto-fills.
  return NextResponse.json(
    { message: `OTP sent successfully to ${body.phone}`, mockOtp: '123456' },
    { status: 201 },
  );
}
