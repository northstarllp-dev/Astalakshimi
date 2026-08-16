"use client"

import * as React from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { MatchListCard } from "@/components/dashboard/match-list-card"
import { MATCHES, type MatchProfile } from "@/lib/matches"
import { loadProfile, VERIFICATION_SLA_HOURS, type SignupData } from "@/lib/profile-store"
import {
  addSkipped,
  clearSkipped,
  getReceivedInterests,
  loadShortlist,
  loadSkipped,
  sendInterest,
} from "@/lib/user-activity"
import { cn } from "@/lib/utils"
import {
  ChevronDown,
  ChevronUp,
  Clock3,
  Filter,
  Search,
  SlidersHorizontal,
  X,
} from "lucide-react"

// ─────────────────────────────────────────────
// Filter definitions
// ─────────────────────────────────────────────
type AgeRange = "20-25" | "26-30" | "31-35" | "36-40" | "40+"
type MatchQuality = "All matches" | "Newly joined" | "Near you" | "Premium" | "With horoscope"

interface ActiveFilters {
  matchQuality: MatchQuality
  ageRanges: AgeRange[]
  communities: string[]
  motherTongues: string[]
  educations: string[]
  cities: string[]
  incomes: string[]
  maritalStatuses: string[]
}

const DEFAULT_FILTERS: ActiveFilters = {
  matchQuality: "All matches",
  ageRanges: [],
  communities: [],
  motherTongues: [],
  educations: [],
  cities: [],
  incomes: [],
  maritalStatuses: [],
}

const AGE_RANGES: AgeRange[] = ["20-25", "26-30", "31-35", "36-40", "40+"]
const MATCH_QUALITY_OPTIONS: MatchQuality[] = [
  "All matches",
  "Newly joined",
  "Near you",
  "Premium",
  "With horoscope",
]

function getUniqueValues<K extends keyof MatchProfile>(
  matches: MatchProfile[],
  key: K,
  limit = 8
): string[] {
  const vals = Array.from(new Set(matches.map((m) => String(m[key])))).filter(Boolean)
  return vals.slice(0, limit)
}

function applyFilters(matches: MatchProfile[], f: ActiveFilters, city?: string): MatchProfile[] {
  let result = matches

  // Match quality
  if (f.matchQuality === "Newly joined")
    result = result.filter((m) =>
      ["Online now", "Today", "2 hours ago"].includes(m.lastActive)
    )
  else if (f.matchQuality === "Near you")
    result = city ? result.filter((m) => m.city.toLowerCase() === city.toLowerCase()) : result
  else if (f.matchQuality === "Premium") result = result.filter((m) => m.photoVerified)
  else if (f.matchQuality === "With horoscope") result = result.filter((m) => m.hasHoroscope)

  // Age ranges
  if (f.ageRanges.length > 0) {
    result = result.filter((m) =>
      f.ageRanges.some((r) => {
        const [lo, hi] = r === "40+" ? [40, 99] : r.split("-").map(Number)
        return m.age >= lo && m.age <= (hi ?? 99)
      })
    )
  }
  if (f.communities.length > 0)
    result = result.filter((m) => f.communities.includes(m.community))
  if (f.motherTongues.length > 0)
    result = result.filter((m) => f.motherTongues.includes(m.motherTongue))
  if (f.educations.length > 0)
    result = result.filter((m) =>
      f.educations.some((e) => m.education.toLowerCase().includes(e.toLowerCase()))
    )
  if (f.cities.length > 0) result = result.filter((m) => f.cities.includes(m.city))
  if (f.incomes.length > 0) result = result.filter((m) => f.incomes.includes(m.income))
  if (f.maritalStatuses.length > 0)
    result = result.filter((m) => f.maritalStatuses.includes(m.maritalStatus))

  return result
}

// ─────────────────────────────────────────────
// Collapsible filter section
// ─────────────────────────────────────────────
function FilterSection({
  title,
  children,
  defaultOpen = true,
}: {
  title: string
  children: React.ReactNode
  defaultOpen?: boolean
}) {
  const [open, setOpen] = React.useState(defaultOpen)
  return (
    <div className="border-b border-border py-3">
      <button
        type="button"
        className="flex w-full items-center justify-between text-sm font-semibold text-foreground"
        onClick={() => setOpen((v) => !v)}
      >
        {title}
        {open ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
      </button>
      {open && <div className="mt-2.5 space-y-1.5">{children}</div>}
    </div>
  )
}

function CheckItem({
  label,
  checked,
  onChange,
}: {
  label: string
  checked: boolean
  onChange: (v: boolean) => void
}) {
  return (
    <label className="flex cursor-pointer items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="h-4 w-4 rounded border-border accent-primary"
      />
      {label}
    </label>
  )
}

// ─────────────────────────────────────────────
// Left filter sidebar
// ─────────────────────────────────────────────
function FilterSidebar({
  filters,
  onChange,
  onReset,
  resultCount,
}: {
  filters: ActiveFilters
  onChange: (f: ActiveFilters) => void
  onReset: () => void
  resultCount: number
}) {
  const toggle = <T extends string>(arr: T[], val: T): T[] =>
    arr.includes(val) ? arr.filter((v) => v !== val) : [...arr, val]

  const communities = getUniqueValues(MATCHES, "community")
  const motherTongues = getUniqueValues(MATCHES, "motherTongue")
  const cities = getUniqueValues(MATCHES, "city")
  const incomes = getUniqueValues(MATCHES, "income")
  const maritalStatuses = getUniqueValues(MATCHES, "maritalStatus")
  const educationGroups = ["B.Tech", "MBA", "MBBS", "M.Sc", "B.Com", "CA", "B.Sc", "M.Tech"]

  return (
    <aside className="w-full shrink-0 rounded-2xl border border-border bg-card p-4 md:w-64 md:sticky md:top-[5.5rem] md:max-h-[calc(100vh-6rem)] md:overflow-y-auto md:hide-scrollbar">
      {/* Header */}
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <SlidersHorizontal className="h-4 w-4 text-primary" />
          <span className="font-semibold text-foreground">Filters</span>
        </div>
        <button
          type="button"
          onClick={onReset}
          className="text-xs font-semibold text-primary hover:underline"
        >
          Clear all
        </button>
      </div>
      <p className="mb-3 text-xs text-muted-foreground">
        <span className="font-semibold text-primary">{resultCount}</span> profiles found
      </p>

      {/* Match quality */}
      <FilterSection title="Show me">
        {MATCH_QUALITY_OPTIONS.map((q) => (
          <CheckItem
            key={q}
            label={q}
            checked={filters.matchQuality === q}
            onChange={() => onChange({ ...filters, matchQuality: q })}
          />
        ))}
      </FilterSection>

      {/* Age */}
      <FilterSection title="Age">
        {AGE_RANGES.map((r) => (
          <CheckItem
            key={r}
            label={r === "40+" ? "40 & above" : `${r} years`}
            checked={filters.ageRanges.includes(r)}
            onChange={() => onChange({ ...filters, ageRanges: toggle(filters.ageRanges, r) })}
          />
        ))}
      </FilterSection>

      {/* Community */}
      <FilterSection title="Community">
        {communities.map((c) => (
          <CheckItem
            key={c}
            label={c}
            checked={filters.communities.includes(c)}
            onChange={() => onChange({ ...filters, communities: toggle(filters.communities, c) })}
          />
        ))}
      </FilterSection>

      {/* Mother tongue */}
      <FilterSection title="Mother Tongue" defaultOpen={false}>
        {motherTongues.map((t) => (
          <CheckItem
            key={t}
            label={t}
            checked={filters.motherTongues.includes(t)}
            onChange={() =>
              onChange({ ...filters, motherTongues: toggle(filters.motherTongues, t) })
            }
          />
        ))}
      </FilterSection>

      {/* Education */}
      <FilterSection title="Education" defaultOpen={false}>
        {educationGroups.map((e) => (
          <CheckItem
            key={e}
            label={e}
            checked={filters.educations.includes(e)}
            onChange={() =>
              onChange({ ...filters, educations: toggle(filters.educations, e) })
            }
          />
        ))}
      </FilterSection>

      {/* City */}
      <FilterSection title="City" defaultOpen={false}>
        {cities.map((c) => (
          <CheckItem
            key={c}
            label={c}
            checked={filters.cities.includes(c)}
            onChange={() => onChange({ ...filters, cities: toggle(filters.cities, c) })}
          />
        ))}
      </FilterSection>

      {/* Income */}
      <FilterSection title="Annual Income" defaultOpen={false}>
        {incomes.map((i) => (
          <CheckItem
            key={i}
            label={i}
            checked={filters.incomes.includes(i)}
            onChange={() => onChange({ ...filters, incomes: toggle(filters.incomes, i) })}
          />
        ))}
      </FilterSection>

      {/* Marital status */}
      <FilterSection title="Marital Status" defaultOpen={false}>
        {maritalStatuses.map((s) => (
          <CheckItem
            key={s}
            label={s}
            checked={filters.maritalStatuses.includes(s)}
            onChange={() =>
              onChange({ ...filters, maritalStatuses: toggle(filters.maritalStatuses, s) })
            }
          />
        ))}
      </FilterSection>
    </aside>
  )
}

// ─────────────────────────────────────────────
// Active filter chips
// ─────────────────────────────────────────────
function ActiveFilterChips({
  filters,
  onChange,
}: {
  filters: ActiveFilters
  onChange: (f: ActiveFilters) => void
}) {
  const chips: { label: string; onRemove: () => void }[] = []

  if (filters.matchQuality !== "All matches")
    chips.push({
      label: filters.matchQuality,
      onRemove: () => onChange({ ...filters, matchQuality: "All matches" }),
    })
  filters.ageRanges.forEach((r) =>
    chips.push({ label: r, onRemove: () => onChange({ ...filters, ageRanges: filters.ageRanges.filter((v) => v !== r) }) })
  )
  filters.communities.forEach((c) =>
    chips.push({ label: c, onRemove: () => onChange({ ...filters, communities: filters.communities.filter((v) => v !== c) }) })
  )
  filters.motherTongues.forEach((t) =>
    chips.push({ label: t, onRemove: () => onChange({ ...filters, motherTongues: filters.motherTongues.filter((v) => v !== t) }) })
  )
  filters.educations.forEach((e) =>
    chips.push({ label: e, onRemove: () => onChange({ ...filters, educations: filters.educations.filter((v) => v !== e) }) })
  )
  filters.cities.forEach((c) =>
    chips.push({ label: c, onRemove: () => onChange({ ...filters, cities: filters.cities.filter((v) => v !== c) }) })
  )
  filters.incomes.forEach((i) =>
    chips.push({ label: i, onRemove: () => onChange({ ...filters, incomes: filters.incomes.filter((v) => v !== i) }) })
  )
  filters.maritalStatuses.forEach((s) =>
    chips.push({ label: s, onRemove: () => onChange({ ...filters, maritalStatuses: filters.maritalStatuses.filter((v) => v !== s) }) })
  )

  if (chips.length === 0) return null

  return (
    <div className="flex flex-wrap gap-2">
      {chips.map((chip) => (
        <span
          key={chip.label}
          className="inline-flex items-center gap-1.5 rounded-full border border-primary/30 bg-primary/5 px-2.5 py-1 text-xs font-semibold text-primary"
        >
          {chip.label}
          <button type="button" onClick={chip.onRemove} aria-label={`Remove ${chip.label} filter`}>
            <X className="h-3 w-3" />
          </button>
        </span>
      ))}
    </div>
  )
}

// ─────────────────────────────────────────────
// Main dashboard page
// ─────────────────────────────────────────────
export default function DashboardPage() {
  const [profile, setProfile] = React.useState<SignupData | null>(null)
  const [filters, setFilters] = React.useState<ActiveFilters>(DEFAULT_FILTERS)
  const [skipped, setSkipped] = React.useState<string[]>([])
  const [query, setQuery] = React.useState("")
  const [interestCount, setInterestCount] = React.useState(0)
  const [shortlistCount, setShortlistCount] = React.useState(0)
  const [mobileFilterOpen, setMobileFilterOpen] = React.useState(false)

  React.useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setProfile(loadProfile())
    setSkipped(loadSkipped())
    setInterestCount(getReceivedInterests().filter((i) => i.status === "pending").length)
    setShortlistCount(loadShortlist().length)
  }, [])

  const firstName = profile?.fullName?.split(" ")[0] || "Member"
  const pending = profile?.verificationStatus === "pending"
  const photoCount = profile?.photos.length ?? 0
  const hasHoroscope = Boolean(profile?.horoscopeName)

  const visibleMatches = React.useMemo(() => {
    const q = query.trim().toLowerCase()
    const remaining = MATCHES.filter((m) => !skipped.includes(m.id))
    const filtered = applyFilters(remaining, filters, profile?.city)
    if (!q) return filtered
    return filtered.filter((m) =>
      [m.fullName, m.city, m.community, m.occupation, m.education, m.motherTongue]
        .join(" ")
        .toLowerCase()
        .includes(q)
    )
  }, [skipped, filters, profile?.city, query])

  return (
    <main className="mx-auto max-w-7xl px-3 py-4 sm:px-4 md:py-8">
      {/* ── Header row ── */}
      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-xs font-semibold tracking-[0.2em] text-gold uppercase">Namaste</p>
          <h1 className="mt-0.5 font-serif text-2xl font-bold tracking-tight md:text-3xl">
            Namaste, {firstName}
          </h1>
          <p className="mt-0.5 text-sm text-muted-foreground">
            <span className="font-semibold text-primary">{visibleMatches.length}</span> profiles match today
          </p>
        </div>
        <div className="flex items-center gap-2">
          {/* Search bar */}
          <label className="flex flex-1 items-center gap-2 rounded-full border border-border bg-card px-4 py-2.5 text-sm shadow-sm sm:w-64 sm:flex-none">
            <Search className="h-4 w-4 shrink-0 text-muted-foreground" />
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="City, community, profession…"
              className="w-full bg-transparent outline-none placeholder:text-muted-foreground"
            />
          </label>
          {/* Mobile filter toggle */}
          <button
            type="button"
            className="md:hidden tap-target inline-flex items-center justify-center rounded-full border border-border bg-card shadow-sm"
            onClick={() => setMobileFilterOpen((v) => !v)}
            aria-label="Open filters"
          >
            <SlidersHorizontal className="h-4 w-4" />
          </button>
          {/* Stat pills */}
          <div className="hidden gap-2 sm:flex">
            {[
              { label: "Interests", value: String(interestCount), href: "/inbox" },
              { label: "Shortlisted", value: String(shortlistCount), href: "/shortlist" },
              { label: "Views", value: "21", href: "/notifications" },
            ].map((stat) => (
              <Link
                key={stat.label}
                href={stat.href}
                className="min-w-[64px] rounded-xl border border-border bg-card px-3 py-2 text-center transition-colors hover:border-primary/30"
              >
                <p className="font-serif text-lg font-bold leading-none text-primary">{stat.value}</p>
                <p className="mt-1 text-[10px] font-medium text-muted-foreground">{stat.label}</p>
              </Link>
            ))}
          </div>
        </div>
      </div>

      {/* Pending review banner */}
      {pending && (
        <div className="mb-5 overflow-hidden rounded-2xl border border-amber-200/80 bg-gradient-to-r from-amber-50 to-[#fff8ef] shadow-sm">
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
                <div className="mt-2 flex flex-wrap gap-1.5">
                  <Badge variant="outline" className="border-transparent bg-white/80 text-[11px] text-amber-900">
                    {photoCount} photo{photoCount === 1 ? "" : "s"}
                  </Badge>
                  <Badge variant="outline" className="border-transparent bg-white/80 text-[11px] text-amber-900">
                    {profile?.verificationMethod === "govt_id" ? "ID uploaded" : "Selfie done"}
                  </Badge>
                  {hasHoroscope && (
                    <Badge variant="outline" className="border-transparent bg-white/80 text-[11px] text-amber-900">
                      Horoscope PDF
                    </Badge>
                  )}
                </div>
              </div>
            </div>
            <Link
              href="/profile"
              className="shrink-0 rounded-xl bg-white/70 px-3 py-2 text-center text-xs font-semibold text-amber-900"
            >
              ETA &lt; {VERIFICATION_SLA_HOURS} hrs
            </Link>
          </div>
        </div>
      )}

      {/* ── Two-column layout ── */}
      <div className="flex gap-5">
        {/* Left: Filter sidebar — hidden on mobile (shown in drawer) */}
        <div className={cn("hidden md:block", mobileFilterOpen && "!block fixed inset-0 z-50 overflow-auto bg-background p-4 md:relative md:inset-auto md:z-auto md:overflow-visible md:p-0")}>
          {mobileFilterOpen && (
            <div className="mb-3 flex items-center justify-between md:hidden">
              <span className="font-semibold">Filters</span>
              <button type="button" onClick={() => setMobileFilterOpen(false)}>
                <X className="h-5 w-5" />
              </button>
            </div>
          )}
          <FilterSidebar
            filters={filters}
            onChange={setFilters}
            onReset={() => { setFilters(DEFAULT_FILTERS); setMobileFilterOpen(false) }}
            resultCount={visibleMatches.length}
          />
        </div>

        {/* Right: Match list with auto-scroll */}
        <div className="min-w-0 flex-1">
          {/* Active filter chips */}
          <ActiveFilterChips filters={filters} onChange={setFilters} />

          {/* Match list */}
          <div className="mt-3 space-y-3">
            {visibleMatches.map((match, index) => (
              <MatchListCard
                key={match.id}
                match={match}
                featured={index === 0 && filters.matchQuality === "All matches" && !query}
                priority={index === 0}
                onSkip={(id) => setSkipped(addSkipped(id))}
                onConnect={(id) => sendInterest(id)}
              />
            ))}

            {visibleMatches.length === 0 && (
              <div className="rounded-2xl border border-dashed border-border bg-card px-6 py-16 text-center">
                <Filter className="mx-auto h-8 w-8 text-muted-foreground" />
                <p className="mt-3 font-semibold">No matches with these filters</p>
                <Button
                  className="mt-4"
                  onClick={() => {
                    clearSkipped()
                    setSkipped([])
                    setQuery("")
                    setFilters(DEFAULT_FILTERS)
                  }}
                >
                  Reset all filters
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>
    </main>
  )
}
