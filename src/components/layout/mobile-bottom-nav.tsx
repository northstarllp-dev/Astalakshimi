"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { Heart, Home, Inbox, Sparkles, UserRound } from "lucide-react"
import { cn } from "@/lib/utils"

const items = [
  { href: "/dashboard", label: "Home", icon: Home },
  { href: "/dashboard#matches", label: "Matches", icon: Heart },
  { href: "/dashboard#inbox", label: "Inbox", icon: Inbox },
  { href: "/dashboard#premium", label: "Premium", icon: Sparkles },
  { href: "/dashboard#profile", label: "Profile", icon: UserRound },
]

export function MobileBottomNav() {
  const pathname = usePathname()

  return (
    <nav className="fixed inset-x-0 bottom-0 z-50 border-t border-border bg-background/95 backdrop-blur-xl md:hidden safe-bottom">
      <ul className="mx-auto grid max-w-lg grid-cols-5 px-1 pt-1">
        {items.map((item) => {
          const active = item.href === "/dashboard" && pathname === "/dashboard" && item.label === "Home"
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
