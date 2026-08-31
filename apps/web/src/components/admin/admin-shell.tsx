"use client"

import * as React from "react"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { Logo } from "@/components/ui/logo"
import { Button } from "@/components/ui/button"
import { InstallAppButton } from "@/components/admin/install-app-button"
import { useAdminLogoutMutation, useAdminSessionQuery } from "@/hooks/admin-queries"
import { cn } from "@/lib/utils"
import {
  FileWarning,
  History,
  LayoutDashboard,
  LogOut,
  Users,
} from "lucide-react"

const navItems = [
  { href: "/admin", label: "Home", icon: LayoutDashboard, match: (p: string) => p === "/admin" },
  {
    href: "/admin/profiles",
    label: "Profiles",
    icon: Users,
    match: (p: string) => p.startsWith("/admin/profiles"),
  },
  {
    href: "/admin/reports",
    label: "Reports",
    icon: FileWarning,
    match: (p: string) => p.startsWith("/admin/reports"),
  },
  {
    href: "/admin/audit",
    label: "Audit",
    icon: History,
    match: (p: string) => p.startsWith("/admin/audit"),
  },
]

export function AdminShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const router = useRouter()
  const { data: session } = useAdminSessionQuery()
  const logout = useAdminLogoutMutation()

  const handleLogout = async () => {
    await logout.mutateAsync()
    router.replace("/admin/login")
  }

  return (
    <div className="flex min-h-dvh flex-col bg-background">
      <header className="sticky top-0 z-40 border-b border-border bg-[#fffbf4]/95 backdrop-blur-md safe-top">
        <div className="mx-auto flex h-14 max-w-5xl items-center justify-between gap-3 px-3 py-2.5 sm:px-4">
          <div className="flex min-w-0 items-center gap-2.5">
            <Logo href="/admin" size={32} withText={false} />
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold leading-tight text-foreground">Admin</p>
              <p className="truncate text-[11px] text-muted-foreground">
                {session?.name ?? "Staff"}
              </p>
            </div>
          </div>

          <nav className="hidden items-center gap-0.5 md:flex">
            {navItems.map((item) => {
              const active = item.match(pathname)
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                    active
                      ? "bg-primary/10 text-primary"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground"
                  )}
                >
                  {item.label}
                </Link>
              )
            })}
          </nav>

          <div className="flex items-center gap-1.5">
            <InstallAppButton compact className="md:hidden" />
            <InstallAppButton className="hidden md:block" />
            <Button
              variant="ghost"
              size="icon"
              className="tap-target"
              onClick={() => void handleLogout()}
              disabled={logout.isPending}
              aria-label="Sign out"
            >
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-5xl flex-1 overflow-x-hidden px-3 py-4 pb-24 sm:px-4 sm:py-6 md:pb-8">
        {children}
      </main>

      <nav
        className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-[#fffbf4]/95 backdrop-blur-md md:hidden safe-bottom"
        aria-label="Admin sections"
      >
        <div className="mx-auto grid max-w-lg grid-cols-4 px-1 pt-1">
          {navItems.map((item) => {
            const active = item.match(pathname)
            const Icon = item.icon
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "tap-target flex flex-col items-center justify-center gap-0.5 rounded-lg py-2 text-[10px] font-semibold transition-colors",
                  active ? "text-primary" : "text-muted-foreground"
                )}
              >
                <Icon className={cn("h-5 w-5", active && "stroke-[2.25]")} />
                {item.label}
              </Link>
            )
          })}
        </div>
      </nav>
    </div>
  )
}
