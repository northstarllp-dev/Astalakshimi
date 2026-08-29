"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { Compass, Heart, Home, Sparkles, HeartHandshake } from "lucide-react"
import { cn } from "@/lib/utils"

const items = [
  { href: "/home", label: "Home", icon: Home, match: (p: string) => p === "/home" },
  { href: "/dashboard", label: "Discover", icon: Compass, match: (p: string) => p === "/dashboard" || p.startsWith("/search") },
  { href: "/matches", label: "Matches", icon: HeartHandshake, match: (p: string) => p.startsWith("/matches") },
  { href: "/interests", label: "Interests", icon: Heart, match: (p: string) => p.startsWith("/interests") || p.startsWith("/inbox") },

  { href: "/plans", label: "Premium", icon: Sparkles, match: (p: string) => p.startsWith("/plans") || p.startsWith("/checkout") },
]

export function MobileBottomNav() {
  const pathname = usePathname()

  return (
    <nav className="fixed inset-x-0 bottom-0 z-50 border-t border-border bg-background/95 backdrop-blur-xl md:hidden safe-bottom">
      <ul className="mx-auto grid max-w-lg grid-cols-5 px-0.5 pt-1">
        {items.map((item: any) => {
          const active = item.match(pathname)
          const Icon = item.icon
          return (
            <li key={item.label}>
              <Link
                href={item.href}
                className={cn(
                  "flex flex-col items-center gap-0.5 py-2 text-[10px] font-medium sm:text-[11px]",
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
