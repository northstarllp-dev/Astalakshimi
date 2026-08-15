"use client"

import * as React from "react"
import { Logo } from "@/components/ui/logo"
import { Button } from "@/components/ui/button"
import { MobileBottomNav } from "@/components/layout/mobile-bottom-nav"
import { MatchListCard } from "@/components/dashboard/match-list-card"
import { MATCHES, type MatchProfile } from "@/lib/matches"
import { loadProfile, VERIFICATION_SLA_HOURS, type SignupData } from "@/lib/profile-store"
import { cn } from "@/lib/utils"
import {
  Bell,
  CheckCircle2,
  ChevronRight,
  Clock3,
  Filter,
  Heart,
  Search,
  ShieldCheck,
  SlidersHorizontal,
} from "lucide-react"

const filters = ["All matches", "Newly joined", "Near you", "Premium", "With horoscope"] as const
type FilterId = (typeof filters)[number]

function applyFilter(matches: MatchProfile[], filter: FilterId, city?: string) {
  switch (filter) {
    case "Newly joined":
      return matches.filter((m) => m.lastActive === "Online now" || m.lastActive === "Today" || m.lastActive === "2 hours ago")
    case "Near you":
      return city ? matches.filter((m) => m.city.toLowerCase() === city.toLowerCase()) : matches
    case "Premium":
      return matches.filter((m) => m.photoVerified)
    case "With horoscope":
      return matches.filter((m) => m.hasHoroscope)
    default:
      return matches
  }
}

export default function DashboardPage() {
  const [profile, setProfile] = React.useState<SignupData | null>(null)
  const [activeFilter, setActiveFilter] = React.useState<FilterId>("All matches")
  const [skipped, setSkipped] = React.useState<string[]>([])
  const [query, setQuery] = React.useState("")

  React.useEffect(() => {
    setProfile(loadProfile())
  }, [])

  const firstName = profile?.fullName?.split(" ")[0] || "Member"
  const pending = profile?.verificationStatus === "pending"
  const photoCount = profile?.photos.length ?? 0
  const hasHoroscope = Boolean(profile?.horoscopeName)

  const visibleMatches = React.useMemo(() => {
    const q = query.trim().toLowerCase()
    const remaining = MATCHES.filter((m) => !skipped.includes(m.id))
    const filtered = applyFilter(remaining, activeFilter, profile?.city)
    if (!q) return filtered
    return filtered.filter((m) =>
      [m.fullName, m.city, m.community, m.occupation, m.education, m.motherTongue]
        .join(" ")
        .toLowerCase()
        .includes(q)
    )
  }, [skipped, activeFilter, profile?.city, query])

  return (
    <div className="min-h-dvh bg-background pb-24 md:pb-12">
      <header className="sticky top-0 z-50 border-b border-secondary/30 bg-[#fffbf4]/92 backdrop-blur-xl safe-top">
        <div className="gold-rule" />
        <div className="mx-auto flex h-14 max-w-5xl items-center justify-between gap-3 px-4 md:h-16">
          <Logo />
          <label className="hidden min-w-0 flex-1 items-center gap-2 rounded-full border border-border bg-card px-4 py-2.5 text-sm shadow-sm md:flex">
            <Search className="h-4 w-4 shrink-0 text-muted-foreground" />
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search by city, community, profession…"
              className="w-full bg-transparent outline-none placeholder:text-muted-foreground"
            />
          </label>
          <div className="flex items-center gap-2">
            <button
              type="button"
              className="tap-target relative inline-flex items-center justify-center rounded-full border border-border bg-card"
              aria-label="Notifications"
            >
              <Bell className="h-4 w-4 text-foreground" />
              <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-primary" />
            </button>
            {pending && (
              <span className="hidden rounded-full bg-amber-100 px-2.5 py-1 text-[11px] font-semibold text-amber-800 sm:inline">
                Under review
              </span>
            )}
            <div className="relative h-9 w-9 overflow-hidden rounded-full border-2 border-primary/20 bg-primary/10 text-sm font-bold text-primary">
              {profile?.photos[0] ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={profile.photos[0]}
                  alt=""
                  className={cn("h-full w-full object-cover", pending && "blur-[2px]")}
                />
              ) : (
                <span className="flex h-full w-full items-center justify-center">{firstName[0]}</span>
              )}
            </div>
          </div>
        </div>
        <div className="border-t border-border/70 px-4 py-2 md:hidden">
          <label className="flex items-center gap-2 rounded-full border border-border bg-card px-3 py-2 text-sm">
            <Search className="h-4 w-4 shrink-0 text-muted-foreground" />
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="City, community, profession"
              className="w-full bg-transparent outline-none placeholder:text-muted-foreground"
            />
          </label>
        </div>
      </header>

      <main className="mx-auto max-w-5xl space-y-4 px-3 py-4 sm:px-4 md:space-y-6 md:py-8">
        {pending && (
          <section className="overflow-hidden rounded-2xl border border-amber-200/80 bg-gradient-to-r from-amber-50 to-[#fff8ef] shadow-sm">
            <div className="flex flex-col gap-3 p-3.5 sm:flex-row sm:items-center sm:justify-between sm:p-4">
              <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-amber-100 text-amber-800">
                  <Clock3 className="h-5 w-5" />
                </div>
                <div>
                  <p className="font-semibold text-amber-950">Your profile is under review</p>
                  <p className="mt-0.5 text-sm text-amber-900/75">
                    Photos stay private until approval — usually within {VERIFICATION_SLA_HOURS} hours.
                  </p>
                  <div className="mt-2 flex flex-wrap gap-1.5 text-[11px] font-medium text-amber-900">
                    <span className="rounded-full bg-white/80 px-2 py-0.5">
                      {photoCount} photo{photoCount === 1 ? "" : "s"}
                    </span>
                    <span className="rounded-full bg-white/80 px-2 py-0.5">
                      {profile?.verificationMethod === "govt_id" ? "ID uploaded" : "Selfie done"}
                    </span>
                    {hasHoroscope && <span className="rounded-full bg-white/80 px-2 py-0.5">Horoscope PDF</span>}
                  </div>
                </div>
              </div>
              <div className="shrink-0 rounded-xl bg-white/70 px-3 py-2 text-center text-xs font-semibold text-amber-900">
                ETA &lt; {VERIFICATION_SLA_HOURS} hrs
              </div>
            </div>
          </section>
        )}

        <section className="flex items-end justify-between gap-3">
          <div className="min-w-0">
            <p className="font-tamil text-xs tracking-[0.2em] text-gold sm:text-sm">வணக்கம்</p>
            <h1 className="mt-0.5 truncate font-serif text-2xl font-bold tracking-tight md:text-3xl">
              Vanakkam, {firstName}
            </h1>
            <p className="mt-0.5 text-sm text-muted-foreground">
              <span className="font-semibold text-primary">{visibleMatches.length}</span> profiles match today
            </p>
          </div>
          <div className="hidden gap-2 sm:flex">
            {[
              { label: "Interests", value: "3" },
              { label: "Shortlisted", value: "8" },
              { label: "Views", value: "21" },
            ].map((stat) => (
              <div key={stat.label} className="min-w-[72px] rounded-xl border border-border bg-card px-3 py-2 text-center">
                <p className="font-serif text-lg font-bold leading-none text-primary">{stat.value}</p>
                <p className="mt-1 text-[10px] font-medium text-muted-foreground">{stat.label}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="sticky top-[6.5rem] z-30 -mx-3 bg-background/90 px-3 py-2 backdrop-blur-md sm:-mx-4 sm:px-4 md:static md:top-auto md:bg-transparent md:px-0 md:py-0 md:backdrop-blur-none">
          <div className="flex items-center gap-2">
            <button
              type="button"
              className="tap-target inline-flex shrink-0 items-center justify-center rounded-full border border-border bg-card shadow-sm"
              aria-label="Filters"
            >
              <SlidersHorizontal className="h-4 w-4" />
            </button>
            <div className="flex gap-2 overflow-x-auto pb-0.5 hide-scrollbar">
              {filters.map((f) => (
                <button
                  key={f}
                  type="button"
                  onClick={() => setActiveFilter(f)}
                  className={cn(
                    "h-9 shrink-0 rounded-full px-3.5 text-sm font-semibold transition-colors",
                    activeFilter === f
                      ? "bg-primary text-primary-foreground shadow-sm"
                      : "border border-border bg-card text-muted-foreground hover:border-primary/40"
                  )}
                >
                  {f}
                </button>
              ))}
            </div>
          </div>
        </section>

        <section id="matches" className="space-y-3">
          {visibleMatches.map((match, index) => (
            <MatchListCard
              key={match.id}
              match={match}
              featured={index === 0 && activeFilter === "All matches" && !query}
              priority={index === 0}
              onSkip={(id) => setSkipped((s) => [...s, id])}
            />
          ))}

          {visibleMatches.length === 0 && (
            <div className="rounded-2xl border border-dashed border-border bg-card px-6 py-16 text-center">
              <Filter className="mx-auto h-8 w-8 text-muted-foreground" />
              <p className="mt-3 font-semibold">No matches in this list</p>
              <Button
                className="mt-4"
                onClick={() => {
                  setSkipped([])
                  setQuery("")
                  setActiveFilter("All matches")
                }}
              >
                Reset filters
              </Button>
            </div>
          )}
        </section>

        <section className="grid gap-4 md:grid-cols-2" id="inbox">
          <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <h2 className="font-serif text-xl font-bold">Recent activity</h2>
              <span className="text-xs font-semibold text-primary">Inbox</span>
            </div>
            <ul className="mt-4 space-y-3">
              {[
                { title: "Ananya viewed your profile", time: "2h ago", icon: Search },
                { title: "New interest from Bengaluru", time: "Yesterday", icon: Heart },
                {
                  title: pending ? "Verification in progress" : "Profile screening complete",
                  time: "Today",
                  icon: ShieldCheck,
                },
              ].map((item) => (
                <li key={item.title} className="flex items-center gap-3 rounded-2xl bg-muted/60 px-3 py-3">
                  <span className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 text-primary">
                    <item.icon className="h-4 w-4" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{item.title}</p>
                    <p className="text-xs text-muted-foreground">{item.time}</p>
                  </div>
                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                </li>
              ))}
            </ul>
          </div>

          <div
            id="premium"
            className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#3d120c] via-[#6b1024] to-primary p-6 text-white shadow-md"
          >
            <div className="absolute -right-8 -top-8 h-32 w-32 rounded-full bg-white/10" />
            <p className="text-xs font-semibold tracking-[0.2em] uppercase text-white/60">Premium</p>
            <h2 className="mt-2 font-serif text-2xl font-bold md:text-3xl">Unlock full photo albums & contact views</h2>
            <ul className="mt-4 space-y-2 text-sm text-white/80">
              <li className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-secondary" /> Unlimited interests
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-secondary" /> Horoscope matching
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-secondary" /> Priority verification support
              </li>
            </ul>
            <Button variant="secondary" className="mt-6">
              View plans
            </Button>
          </div>
        </section>
      </main>

      <MobileBottomNav />
    </div>
  )
}
