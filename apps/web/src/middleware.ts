import NextAuth from "next-auth"
import { authConfig } from "./auth.config"
import { NextResponse, type NextRequest } from "next/server"

const { auth } = NextAuth(authConfig)

export default async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl
  const isAdminRoute = pathname === "/admin" || pathname.startsWith("/admin/")
  
  if (isAdminRoute) {
    // Let NextAuth handle admin routes
    return (auth as any)(req)
  }

  const token = req.cookies.get("astalakshimi.auth_token")?.value
  const isLoggedIn = !!token

  // List of public routes that don't require authentication
  const publicRoutes = ["/login", "/register", "/"]
  const isPublicRoute = publicRoutes.includes(pathname)

  // API auth routes must always be accessible
  const isApiAuthRoute = pathname.startsWith("/api/auth")

  if (isApiAuthRoute) {
    return NextResponse.next()
  }

  if (pathname === "/login" || pathname === "/") {
    if (isLoggedIn) {
      return NextResponse.redirect(new URL("/home", req.nextUrl))
    }
    return NextResponse.next()
  }

  if (pathname === "/register") {
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
}

// Skip auth for Next internals, API, and static public assets (images, icons, manifest)
export const config = {
  matcher: [
    "/((?!api|_next/static|_next/image|favicon.ico|icon.png|manifest.webmanifest|images/|.*\\.(?:png|jpg|jpeg|gif|webp|svg|ico|woff2?)$).*)",
  ],
}
