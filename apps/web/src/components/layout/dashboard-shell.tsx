"use client"

import * as React from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { Logo } from "@/components/ui/logo"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { MobileBottomNav } from "@/components/layout/mobile-bottom-nav"
import { loadProfile, type SignupData } from "@/lib/profile-store"
import { getUnreadNotificationCount } from "@/lib/user-activity"
import { cn } from "@/lib/utils"
import { Bell, Search } from "lucide-react"

const desktopLinks = [
  { href: "/dashboard", label: "Discover", match: (p: string) => p === "/dashboard" },
  { href: "/interests", label: "Interests", match: (p: string) => p.startsWith("/interests") },
  { href: "/plans", label: "Premium", match: (p: string) => p.startsWith("/plans") || p.startsWith("/checkout") },
  { href: "/profile", label: "Profile", match: (p: string) => p.startsWith("/profile") || p.startsWith("/settings") },
]

export function DashboardShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const [profile, setProfile] = React.useState<SignupData | null>(null)
  const [unread, setUnread] = React.useState(0)

  React.useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setProfile(loadProfile())
    setUnread(getUnreadNotificationCount())
  }, [pathname])

  const firstName = profile?.fullName?.split(" ")[0] || "Member"
  const pending = profile?.verificationStatus === "pending"
  const isMatchProfile = pathname.startsWith("/profiles/")

  return (
    <div
      className={cn(
        "flex min-h-dvh flex-col bg-background",
        isMatchProfile ? "h-dvh overflow-hidden" : "pb-24 md:pb-12"
      )}
    >
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
              href="/dashboard"
              className="tap-target inline-flex items-center justify-center rounded-full border border-border bg-card md:hidden"
              aria-label="Search"
            >
              <Search className="h-4 w-4 text-foreground" />
            </Link>
            <Link
              href="/notifications"
              className="tap-target relative inline-flex items-center justify-center rounded-full border border-border bg-card"
              aria-label={unread > 0 ? `Notifications, ${unread} unread` : "Notifications"}
            >
              <Bell className="h-4 w-4 text-foreground" />
              {unread > 0 && (
                <span className="absolute right-1.5 top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-bold text-primary-foreground">
                  {unread > 9 ? "9+" : unread}
                </span>
              )}
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

      <div className={cn("flex-1", isMatchProfile && "min-h-0 overflow-hidden")}>{children}</div>
      {isMatchProfile ? null : <MobileBottomNav />}
    </div>
  )
}
