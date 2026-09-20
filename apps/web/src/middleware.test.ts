import { describe, it, expect, vi, beforeEach } from "vitest"

// Mock next/server before importing middleware
const nextMock = vi.fn()
const redirectMock = vi.fn()
vi.mock("next/server", () => ({
  NextResponse: {
    next: () => ({ type: "next" }),
    redirect: (url: URL) => ({ type: "redirect", url: url.toString() }),
  },
}))

import middleware from "./middleware"

function makeReq(pathname: string, cookies: Record<string, string> = {}, search = "") {
  const nextUrl = new URL(`http://localhost${pathname}${search}`)
  return {
    nextUrl,
    cookies: {
      get: (name: string) => (cookies[name] ? { value: cookies[name] } : undefined),
    },
  } as any
}

describe("middleware", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("allows admin routes through", async () => {
    const res = await middleware(makeReq("/admin"))
    expect(res).toEqual({ type: "next" })
    const res2 = await middleware(makeReq("/admin/profiles"))
    expect(res2).toEqual({ type: "next" })
  })

  it("allows api auth routes through", async () => {
    const res = await middleware(makeReq("/api/auth/login"))
    expect(res).toEqual({ type: "next" })
  })

  it("redirects logged-out users to /login for protected routes", async () => {
    const res: any = await middleware(makeReq("/home"))
    expect(res.type).toBe("redirect")
    expect(res.url).toContain("/login")
  })

  it("allows logged-out users on /login, /, /register", async () => {
    for (const p of ["/login", "/", "/register"]) {
      const res = await middleware(makeReq(p))
      expect(res).toEqual({ type: "next" })
    }
  })

  it("preserves callbackUrl on redirect", async () => {
    const res: any = await middleware(makeReq("/search", {}, "?q=test"))
    expect(res.url).toContain("callbackUrl=")
    expect(res.url).toContain(encodeURIComponent("/search?q=test"))
  })

  it("redirects logged-in-but-no-profile to /register", async () => {
    const res: any = await middleware(makeReq("/home", { "astalakshimi.auth_token": "tok" }))
    expect(res.type).toBe("redirect")
    expect(res.url).toContain("/register")
  })

  it("allows logged-in-no-profile on /register (allowlist)", async () => {
    const res = await middleware(makeReq("/register", { "astalakshimi.auth_token": "tok" }))
    expect(res).toEqual({ type: "next" })
  })

  it("redirects fully-enrolled users away from /login, /, /register to /home", async () => {
    const cookies = { "astalakshimi.auth_token": "tok", "astalakshimi.has_profile": "1" }
    for (const p of ["/login", "/", "/register"]) {
      const res: any = await middleware(makeReq(p, cookies))
      expect(res.type).toBe("redirect")
      expect(res.url).toContain("/home")
    }
  })

  it("allows fully-enrolled users on app routes", async () => {
    const cookies = { "astalakshimi.auth_token": "tok", "astalakshimi.has_profile": "1" }
    const res = await middleware(makeReq("/home", cookies))
    expect(res).toEqual({ type: "next" })
  })
})
