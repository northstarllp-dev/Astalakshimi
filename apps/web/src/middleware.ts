import { NextResponse, type NextRequest } from "next/server"

const AUTH_COOKIE = "astalakshimi.auth_token"
const HAS_PROFILE_COOKIE = "astalakshimi.has_profile"

/** Routes allowed while authenticated but before a profile exists. */
const ONBOARDING_ALLOWLIST = new Set(["/register"])

export default async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl
  const isAdminRoute = pathname === "/admin" || pathname.startsWith("/admin/")

  if (isAdminRoute) {
    return NextResponse.next()
  }

  const token = req.cookies.get(AUTH_COOKIE)?.value
  const isLoggedIn = Boolean(token)
  const hasProfile = req.cookies.get(HAS_PROFILE_COOKIE)?.value === "1"

  const isApiAuthRoute = pathname.startsWith("/api/auth")
  if (isApiAuthRoute) {
    return NextResponse.next()
  }

  // Mid-onboarding: OTP done, profile not created yet — stay on /register only.
  if (isLoggedIn && !hasProfile) {
    if (ONBOARDING_ALLOWLIST.has(pathname)) {
      return NextResponse.next()
    }
    return NextResponse.redirect(new URL("/register", req.nextUrl))
  }

  // Fully enrolled users: keep them out of auth marketing entry points,
  // then allow the rest of the app (must return — do not fall into the logged-out branch).
  if (isLoggedIn && hasProfile) {
    if (pathname === "/login" || pathname === "/" || pathname === "/register") {
      return NextResponse.redirect(new URL("/home", req.nextUrl))
    }
    return NextResponse.next()
  }

  // Logged out — public entry points only; everything else → login.
  if (pathname === "/login" || pathname === "/" || pathname === "/register") {
    return NextResponse.next()
  }

  let callbackUrl = pathname
  if (req.nextUrl.search) {
    callbackUrl += req.nextUrl.search
  }
  const encodedCallbackUrl = encodeURIComponent(callbackUrl)
  return NextResponse.redirect(new URL(`/login?callbackUrl=${encodedCallbackUrl}`, req.nextUrl))
}

export const config = {
  matcher: [
    "/((?!api|_next/static|_next/image|favicon.ico|icon.png|manifest.webmanifest|images/|.*\\.(?:png|jpg|jpeg|gif|webp|svg|ico|woff2?)$).*)",
  ],
}
