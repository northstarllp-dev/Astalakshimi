import NextAuth from "next-auth"
import { authConfig } from "./auth.config"
import { NextResponse } from "next/server"

const { auth } = NextAuth(authConfig)

export default auth((req) => {
  const isLoggedIn = !!req.auth
  const { pathname } = req.nextUrl

  // List of public routes that don't require authentication
  const publicRoutes = ["/login", "/register", "/"]
  const isPublicRoute = publicRoutes.includes(pathname)

  // API auth routes must always be accessible
  const isApiAuthRoute = pathname.startsWith("/api/auth")

  // Staff console has its own session (not member NextAuth)
  const isAdminRoute = pathname === "/admin" || pathname.startsWith("/admin/")

  if (isApiAuthRoute || isAdminRoute) {
    return NextResponse.next()
  }

  if (isPublicRoute) {
    if (isLoggedIn) {
      return NextResponse.redirect(new URL("/dashboard", req.nextUrl))
    }
    return NextResponse.next()
  }

  if (!isLoggedIn) {
    let callbackUrl = pathname
    if (req.nextUrl.search) {
      callbackUrl += req.nextUrl.search
    }
    const encodedCallbackUrl = encodeURIComponent(callbackUrl)
    return NextResponse.redirect(new URL(`/login?callbackUrl=${encodedCallbackUrl}`, req.nextUrl))
  }

  return NextResponse.next()
})

// Skip auth for Next internals, API, and static public assets (images, icons, manifest)
export const config = {
  matcher: [
    "/((?!api|_next/static|_next/image|favicon.ico|icon.png|manifest.webmanifest|images/|.*\\.(?:png|jpg|jpeg|gif|webp|svg|ico|woff2?)$).*)",
  ],
}
