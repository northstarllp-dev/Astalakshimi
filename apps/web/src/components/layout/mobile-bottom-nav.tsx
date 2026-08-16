"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { Heart, Home, Inbox, Sparkles, UserRound } from "lucide-react"
import { cn } from "@/lib/utils"

const items = [
  { href: "/dashboard", label: "Home", icon: Home, match: (p: string) => p === "/dashboard" },
  { href: "/search", label: "Matches", icon: Heart, match: (p: string) => p.startsWith("/search") },
  { href: "/inbox", label: "Inbox", icon: Inbox, match: (p: string) => p.startsWith("/inbox") },
  { href: "/plans", label: "Premium", icon: Sparkles, match: (p: string) => p.startsWith("/plans") || p.startsWith("/checkout") },
  { href: "/profile", label: "Profile", icon: UserRound, match: (p: string) => p.startsWith("/profile") || p.startsWith("/settings") || p.startsWith("/shortlist") },
]

export function MobileBottomNav() {
  const pathname = usePathname()

  return (
    <nav className="fixed inset-x-0 bottom-0 z-50 border-t border-border bg-background/95 backdrop-blur-xl md:hidden safe-bottom">
      <ul className="mx-auto grid max-w-lg grid-cols-5 px-1 pt-1">
        {items.map((item) => {
          const active = item.match(pathname)
          const Icon = item.icon
          return (
            <li key={item.label}>
              <Link
                href={item.href}
                className={cn(
                  "flex flex-col items-center gap-0.5 py-2 text-[11px] font-medium",
                  active ? "text-primary" : "text-muted-foreground"
                )}
              >
                <Icon className="h-5 w-5" />
                {item.label}
              </Link>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}
