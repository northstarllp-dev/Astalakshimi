"use client"

import * as React from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { Logo } from "@/components/ui/logo"
import { Button } from "@/components/ui/button"
import { Menu, X, ChevronDown } from "lucide-react"
import { cn } from "@/lib/utils"

const browseLinks = [
  { href: "/signup", label: "By Community" },
  { href: "/signup", label: "By City" },
  { href: "/signup", label: "By Profession" },
]

export function SiteHeader({ variant = "marketing" }: { variant?: "marketing" | "auth" }) {
  const pathname = usePathname()
  const [open, setOpen] = React.useState(false)
  const [browseOpen, setBrowseOpen] = React.useState(false)

  React.useEffect(() => {
    setOpen(false)
  }, [pathname])

  React.useEffect(() => {
    document.body.style.overflow = open ? "hidden" : ""
    return () => {
      document.body.style.overflow = ""
    }
  }, [open])

  return (
    <header className="sticky top-0 z-50 bg-[#fffdf8]/95 backdrop-blur-xl safe-top">
      {/* Royal gold top rule */}
      <div className="gold-rule" />

      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4">
        <Logo />

        {variant === "marketing" && (
          <nav className="hidden items-center gap-7 text-sm font-medium text-foreground/80 md:flex">
            <div className="relative">
              <button
                type="button"
                className="inline-flex items-center gap-1 hover:text-primary transition-colors"
                onClick={() => setBrowseOpen((v) => !v)}
                aria-expanded={browseOpen}
              >
                Browse profiles <ChevronDown className={cn("h-4 w-4 transition-transform", browseOpen && "rotate-180")} />
              </button>
              {browseOpen && (
                <div className="absolute left-0 top-full mt-2 w-48 rounded-2xl border border-secondary/20 bg-card p-2 shadow-xl shadow-foreground/8">
                  {browseLinks.map((link) => (
                    <Link
                      key={link.label}
                      href={link.href}
                      className="block rounded-xl px-4 py-2.5 text-sm hover:bg-muted hover:text-primary transition-colors"
                      onClick={() => setBrowseOpen(false)}
                    >
                      {link.label}
                    </Link>
                  ))}
                </div>
              )}
            </div>
            <Link href="#success" className="hover:text-primary transition-colors">
              Success stories
            </Link>
            <Link href="#how" className="hover:text-primary transition-colors">
              How it works
            </Link>
          </nav>
        )}

        <div className="hidden items-center gap-2 md:flex">
          <Link href="/login">
            <Button variant="ghost" className="text-foreground/70 hover:text-primary">
              Login
            </Button>
          </Link>
          <Link href="/signup">
            <Button className="shadow-sm">Register free</Button>
          </Link>
        </div>

        <button
          type="button"
          className="tap-target inline-flex items-center justify-center rounded-full border border-secondary/25 bg-card md:hidden"
          onClick={() => setOpen((v) => !v)}
          aria-label={open ? "Close menu" : "Open menu"}
        >
          {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>

      {/* Gold bottom rule */}
      <div className="h-px bg-gradient-to-r from-transparent via-secondary/25 to-transparent" />

      {/* Mobile drawer */}
      <div
        className={cn(
          "fixed inset-x-0 top-[calc(4rem+2px)] z-40 bg-background/98 backdrop-blur-xl px-4 py-5 shadow-xl border-b border-secondary/15 md:hidden",
          open ? "block" : "hidden"
        )}
      >
        <nav className="flex flex-col gap-1 text-base font-medium">
          <Link href="/signup" className="rounded-xl px-4 py-3 hover:bg-muted hover:text-primary transition-colors">
            Browse by community
          </Link>
          <Link href="#success" className="rounded-xl px-4 py-3 hover:bg-muted hover:text-primary transition-colors">
            Success stories
          </Link>
          <Link href="#how" className="rounded-xl px-4 py-3 hover:bg-muted hover:text-primary transition-colors">
            How it works
          </Link>
          <Link href="/login" className="rounded-xl px-4 py-3 hover:bg-muted hover:text-primary transition-colors">
            Login
          </Link>
          <Link href="/signup" className="mt-2">
            <Button className="w-full" size="lg">
              Register free →
            </Button>
          </Link>
        </nav>
      </div>
    </header>
  )
}
