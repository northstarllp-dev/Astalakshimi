import Link from "next/link"
import { Logo } from "@/components/ui/logo"
import { TempleDivider } from "@/components/ui/temple-ornament"

const columns = [
  {
    title: "Browse",
    links: [
      { href: "/signup", label: "By religion" },
      { href: "/signup", label: "By mother tongue" },
      { href: "/signup", label: "By city" },
      { href: "/signup", label: "By profession" },
    ],
  },
  {
    title: "Need help?",
    links: [
      { href: "#help", label: "Member support" },
      { href: "/login", label: "Login help" },
      { href: "/signup", label: "Create profile" },
    ],
  },
  {
    title: "Company",
    links: [
      { href: "#how", label: "How it works" },
      { href: "#success", label: "Success stories" },
      { href: "#trust", label: "Safety & privacy" },
    ],
  },
]

export function SiteFooter() {
  return (
    <footer id="help" className="border-t border-secondary/25 bg-temple text-white">
      <div className="gold-rule opacity-70" />
      <div className="mx-auto grid max-w-6xl gap-10 px-4 py-12 sm:grid-cols-2 lg:grid-cols-4">
        <div className="space-y-4">
          <Logo light />
          <p className="max-w-xs text-sm leading-relaxed text-white/70">
            South Indian matchmaking for families who value community, privacy, and verified profiles — from Chennai to Kochi.
          </p>
        </div>
        {columns.map((col) => (
          <div key={col.title}>
            <h3 className="mb-3 text-sm font-semibold tracking-wide text-secondary">{col.title}</h3>
            <ul className="space-y-2 text-sm text-white/65">
              {col.links.map((link) => (
                <li key={link.label}>
                  <Link href={link.href} className="hover:text-white">
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
      <TempleDivider className="mx-auto max-w-xs opacity-80" />
      <div className="px-4 py-4 text-center text-xs text-white/50">
        © {new Date().getFullYear()} Astalakshimi Matrimony. All rights reserved.
      </div>
    </footer>
  )
}
