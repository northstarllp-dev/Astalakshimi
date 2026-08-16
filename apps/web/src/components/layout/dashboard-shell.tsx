"use client"

import * as React from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { Logo } from "@/components/ui/logo"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { MobileBottomNav } from "@/components/layout/mobile-bottom-nav"
import { loadProfile, type SignupData } from "@/lib/profile-store"
import { cn } from "@/lib/utils"
import { Bell, Search } from "lucide-react"

const desktopLinks = [
  { href: "/dashboard", label: "Home", match: (p: string) => p === "/dashboard" },
  { href: "/search", label: "Matches", match: (p: string) => p.startsWith("/search") },
  { href: "/inbox", label: "Inbox", match: (p: string) => p.startsWith("/inbox") },
  { href: "/plans", label: "Premium", match: (p: string) => p.startsWith("/plans") || p.startsWith("/checkout") },
  { href: "/profile", label: "Profile", match: (p: string) => p.startsWith("/profile") || p.startsWith("/settings") },
]

export function DashboardShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const [profile, setProfile] = React.useState<SignupData | null>(null)

  React.useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setProfile(loadProfile())
  }, [])

  const firstName = profile?.fullName?.split(" ")[0] || "Member"
  const pending = profile?.verificationStatus === "pending"

  return (
    <div className="flex min-h-dvh flex-col bg-background pb-24 md:pb-12">
      <header className="sticky top-0 z-50 border-b border-secondary/30 bg-[#fffbf4]/92 backdrop-blur-xl safe-top">
        <div className="gold-rule" />
        <div className="mx-auto flex h-14 max-w-5xl items-center justify-between gap-3 px-4 md:h-16">
          <Logo href="/dashboard" />
          <nav className="hidden items-center gap-1 md:flex">
            {desktopLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={cn(
                  "rounded-full px-3.5 py-2 text-sm font-semibold transition-colors",
                  link.match(pathname)
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                {link.label}
              </Link>
            ))}
          </nav>
          <div className="flex items-center gap-2">
            <Link
              href="/search"
              className="tap-target inline-flex items-center justify-center rounded-full border border-border bg-card md:hidden"
              aria-label="Search"
            >
              <Search className="h-4 w-4 text-foreground" />
            </Link>
            <Link
              href="/notifications"
              className="tap-target relative inline-flex items-center justify-center rounded-full border border-border bg-card"
              aria-label="Notifications"
            >
              <Bell className="h-4 w-4 text-foreground" />
              <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-primary" />
            </Link>
            {pending && (
              <Badge
                variant="secondary"
                className="hidden bg-amber-100 text-[11px] font-semibold text-amber-800 sm:inline-flex"
              >
                Under review
              </Badge>
            )}
            <Link href="/profile" aria-label="My profile">
              <Avatar className="size-9 border-2 border-primary/20">
                {profile?.photos[0] ? (
                  <AvatarImage
                    src={profile.photos[0]}
                    alt={firstName}
                    className={cn("object-cover", pending && "blur-[2px]")}
                  />
                ) : null}
                <AvatarFallback className="bg-primary/10 text-sm font-bold text-primary">
                  {firstName[0]}
                </AvatarFallback>
              </Avatar>
            </Link>
          </div>
        </div>
      </header>

      <div className="flex-1">{children}</div>
      <MobileBottomNav />
    </div>
  )
}
