"use client"

import { RequireFullPortal } from "@/components/layout/require-full-portal"
import { Button } from "@/components/ui/button"
import { MatchListCard } from "@/components/dashboard/match-list-card"
import * as React from "react"
import Link from "next/link"
import { useQueryClient } from "@tanstack/react-query"
import {
  useAddSavedSearchMutation,
  useInterestsQuery,
  usePaidQuery,
  useProfileQuery,
  useSavedSearchesQuery,
  useSendInterestMutation,
  useShortlistQuery,
  useSkipMatchMutation,
  useSkippedQuery,
  useSearchQuery,
  queryKeys,
} from "@/hooks/queries"
import { discoverQuickSchema } from "@/lib/validation"
import { VERIFICATION_SLA_HOURS, INCOME_BANDS, DIETS, STARS } from "@/lib/profile-store"
import {
  BROWSE_TABS,
  DEFAULT_DISCOVER,
  EMPTY_ADVANCED,
  type AdvancedFilters,
  type BrowseTab,
  type DiscoverQuery,
} from "@/lib/discover"
import { cn } from "@/lib/utils"
import {
  Bookmark,
  ChevronDown,
  Clock3,
  Crown,
  Filter,
  Heart,
  Lock,
  SlidersHorizontal,
  X,
} from "lucide-react"

const HEIGHT_BANDS = ["Up to 5'4\"", "5'5\" – 5'8\"", "5'9\" & above"]
const EDUCATION_GROUPS = ["B.Tech", "B.E", "MBA", "M.Sc", "Ph.D", "M.Phil", "Post Doctorate"]

function FilterSection({
  title,
  children,
  defaultOpen = false,
}: {
  title: string
  children: React.ReactNode
  defaultOpen?: boolean
}) {
  const [open, setOpen] = React.useState(defaultOpen)
  return (
    <div className="border-b border-border py-3 last:border-b-0">
      <button
        type="button"
        className="flex w-full items-center justify-between text-sm font-semibold text-foreground"
        onClick={() => setOpen((v) => !v)}
      >
        {title}
        <ChevronDown className={cn("h-4 w-4 shrink-0 text-muted-foreground transition-transform", open && "rotate-180")} />
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

function toggle(arr: string[], val: string) {
  return arr.includes(val) ? arr.filter((v) => v !== val) : [...arr, val]
}

export default function DashboardPage() {
  return (
    <RequireFullPortal>
      <DiscoverPage />
    </RequireFullPortal>
  )
}

function DiscoverPage() {
  const queryClient = useQueryClient()
  const { data: profile = null } = useProfileQuery()
  const { data: skipped = [] } = useSkippedQuery()
  const { data: paid = false } = usePaidQuery()
  const { data: saved = [] } = useSavedSearchesQuery()
  const { data: interests } = useInterestsQuery()
  const { data: shortlist = [] } = useShortlistQuery()
  const skipMutation = useSkipMatchMutation()
  const connectMutation = useSendInterestMutation()
  const saveSearchMutation = useAddSavedSearchMutation()
  const [query, setQuery] = React.useState<DiscoverQuery>(DEFAULT_DISCOVER)
  const [page, setPage] = React.useState(1)
  const [moreOpen, setMoreOpen] = React.useState(false)
  const [saveOpen, setSaveOpen] = React.useState(false)
  const [saveLabel, setSaveLabel] = React.useState("")
  const [paywall, setPaywall] = React.useState<string | null>(null)
  const interestCount = interests?.pendingCount ?? 0
  const shortlistCount = shortlist.length

  const firstName = profile?.fullName?.split(" ")[0] || "Member"
  const pending = profile?.verificationStatus === "pending"
  const userCity = profile?.city || "Chennai"

  const { data: searchResult, isLoading: isSearchLoading } = useSearchQuery({ ...query, page, limit: 10 })
  const visibleMatches = searchResult?.profiles || []
  const totalCount = searchResult?.totalCount || 0

  const setQuick = (patch: Partial<DiscoverQuery>) => {
    setQuery((q) => {
      const next = { ...q, ...patch }
      const parsed = discoverQuickSchema.safeParse({
        ageMin: next.ageMin,
        ageMax: next.ageMax,
        city: next.city,
        community: next.community,
      })
      if (!parsed.success) return q
      return { ...next, ...parsed.data }
    })
    setPage(1)
  }

  const setAdvanced = (patch: Partial<AdvancedFilters>) => {
    setQuery((q) => ({ ...q, advanced: { ...q.advanced, ...patch } }))
    setPage(1)
  }

  const requirePaid = (feature: string, action: () => void) => {
    if (paid) {
      setPaywall(null)
      action()
      return
    }
    setPaywall(feature)
  }

  const applyPreferences = () => {
    setQuery((q) => ({ ...q, ...{}, advanced: EMPTY_ADVANCED }))
    setPage(1)
  }

  const cities = ["Chennai", "Coimbatore", "Madurai", "Trichy", "Salem", "Tirunelveli", "Bengaluru", "Hyderabad", "Mumbai", "Delhi"]
  const communities = ["Brahmin - Iyer", "Brahmin - Iyengar", "Chettiar", "Gounder", "Vanniyar", "Thevar", "Nadar", "Mudaliar", "Pillai", "Naidu", "Yadav", "Other"]
  const occupations = ["Software Engineer", "Doctor", "Engineer - Non IT", "Teacher / Professor", "Business Owner", "Banker / Finance", "Government Service", "Defense", "Lawyer", "Other"]
  const incomes = INCOME_BANDS
  const diets = DIETS
  const stars = STARS

  return (
    <main className="mx-auto max-w-7xl px-3 py-4 sm:px-4 md:py-8">
      <div className="mb-5 flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-xs font-semibold tracking-[0.2em] text-gold uppercase">Search & browse</p>
          <h1 className="mt-0.5 font-serif text-2xl font-bold tracking-tight md:text-3xl">Discover</h1>
          <p className="mt-1 max-w-xl text-sm text-muted-foreground">
            Namaste, {firstName}. Apply a filter and results update instantly — no search button.
          </p>
        </div>
        <div className="hidden gap-2 sm:flex">
          {[
            { label: "Interests", value: String(interestCount), href: "/interests" },
            { label: "Shortlisted", value: String(shortlistCount), href: "/interests?tab=shortlisted" },
            { label: "Views", value: "21", href: "/notifications" },
          ].map((stat) => (
            <Link
              key={stat.label}
              href={stat.href}
              className="min-w-[64px] rounded-xl border border-border bg-card px-3 py-2 text-center hover:border-primary/30"
            >
              <p className="font-serif text-lg font-bold leading-none text-primary">{stat.value}</p>
              <p className="mt-1 text-[10px] font-medium text-muted-foreground">{stat.label}</p>
            </Link>
          ))}
        </div>
      </div>

      {pending && (
        <div className="mb-5 overflow-hidden rounded-2xl border border-amber-200/80 bg-gradient-to-r from-amber-50 to-[#fff8ef] shadow-sm">
          <div className="flex items-start gap-3 p-3.5 sm:p-4">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-amber-100 text-amber-800">
              <Clock3 className="h-5 w-5" />
            </div>
            <div>
              <p className="font-semibold text-amber-950">Your profile is under review</p>
              <p className="mt-0.5 text-sm text-amber-900/75">
                Photos stay private until approval — usually within {VERIFICATION_SLA_HOURS} hours.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Quick search — 3 fields, live */}
      <section className="mb-4 rounded-2xl border border-border bg-card p-4 shadow-sm">
        <div className="grid gap-4 md:grid-cols-3">
          <label className="block">
            <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Age range</span>
            <div className="mt-2 flex items-center gap-3">
              <input
                type="range"
                min={18}
                max={50}
                value={query.ageMin}
                onChange={(e) => {
                  const ageMin = Math.min(Number(e.target.value), query.ageMax)
                  setQuick({ ageMin })
                }}
                className="w-full accent-primary"
                aria-label="Minimum age"
              />
              <input
                type="range"
                min={18}
                max={50}
                value={query.ageMax}
                onChange={(e) => {
                  const ageMax = Math.max(Number(e.target.value), query.ageMin)
                  setQuick({ ageMax })
                }}
                className="w-full accent-primary"
                aria-label="Maximum age"
              />
            </div>
            <p className="mt-1 text-sm font-semibold text-primary">
              {query.ageMin} – {query.ageMax} yrs
            </p>
          </label>
          <label className="block">
            <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Location</span>
            <select
              value={query.city}
              onChange={(e) => setQuick({ city: e.target.value })}
              className="mt-2 h-11 w-full rounded-xl border border-input bg-background px-3 text-sm"
            >
              <option value="">Any city</option>
              {cities.map((city: any) => (
                <option key={city} value={city}>
                  {city}
                </option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Community</span>
            <select
              value={query.community}
              onChange={(e) => setQuick({ community: e.target.value })}
              className="mt-2 h-11 w-full rounded-xl border border-input bg-background px-3 text-sm"
            >
              <option value="">Any community</option>
              {communities.map((c: any) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </label>
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          <Button type="button" variant="soft" size="sm" onClick={applyPreferences}>
            <Heart className="mr-1.5 h-3.5 w-3.5" /> My preferences
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => requirePaid("Advanced filters", () => setMoreOpen(true))}
          >
            {paid ? <SlidersHorizontal className="mr-1.5 h-3.5 w-3.5" /> : <Lock className="mr-1.5 h-3.5 w-3.5" />}
            More filters
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => requirePaid("Saved searches", () => setSaveOpen(true))}
          >
            {paid ? <Bookmark className="mr-1.5 h-3.5 w-3.5" /> : <Lock className="mr-1.5 h-3.5 w-3.5" />}
            Save search
          </Button>
          {saved.length > 0 && paid && (
            <select
              className="h-9 rounded-full border border-border bg-background px-3 text-sm"
              defaultValue=""
              onChange={(e) => {
                const item = saved.find((s: any) => s.id === e.target.value)
                if (!item) return
                setQuick({ ageMin: item.ageMin, ageMax: item.ageMax, city: item.city, community: item.community, tab: "all" })
              }}
              aria-label="Saved searches"
            >
              <option value="" disabled>
                Saved searches
              </option>
              {saved.map((s: any) => (
                <option key={s.id} value={s.id}>
                  {s.label}
                </option>
              ))}
            </select>
          )}
          <button
            type="button"
            className="ml-auto text-xs font-semibold text-primary hover:underline"
            onClick={() => setQuery(DEFAULT_DISCOVER)}
          >
            Clear all
          </button>
        </div>
      </section>

      {paywall && (
        <div className="mb-4 flex flex-col gap-3 rounded-2xl border border-secondary/40 bg-[#fff8ef] p-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="font-semibold text-foreground">{paywall} is a Premium feature</p>
            <p className="text-sm text-muted-foreground">Upgrade to unlock 20+ filters, saved searches, and high-intent tabs.</p>
          </div>
          <Link href="/plans">
            <Button size="sm">
              <Crown className="mr-1.5 h-3.5 w-3.5" /> See plans
            </Button>
          </Link>
        </div>
      )}

      {/* Browse tabs */}
      <div className="mb-4 flex gap-2 overflow-x-auto hide-scrollbar pb-1">
        {BROWSE_TABS.map((tab) => {
          const locked = Boolean(tab.paid) && !paid
          const active = query.tab === tab.id
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => {
                if (locked) {
                  setPaywall(tab.label)
                  return
                }
                setPaywall(null)
                setQuick({ tab: tab.id })
              }}
              className={cn(
                "inline-flex shrink-0 items-center gap-1.5 rounded-full px-3.5 py-2 text-sm font-semibold",
                active ? "bg-primary text-primary-foreground" : "border border-border bg-card text-muted-foreground hover:text-foreground"
              )}
            >
              {locked && <Lock className="h-3.5 w-3.5" />}
              {tab.label}
            </button>
          )
        })}
      </div>

      <p className="mb-3 text-sm text-muted-foreground">
        {isSearchLoading ? (
          <span>Loading profiles...</span>
        ) : (
          <>
            <span className="font-semibold text-primary">{totalCount}</span> profiles found
          </>
        )}
      </p>

      <div className="space-y-3">
        {visibleMatches.map((match: any, index: any) => (
          <MatchListCard
            key={match.id}
            match={match}
            featured={index === 0 && query.tab === "all"}
            priority={index === 0}
            onSkip={(id: any) => skipMutation.mutate(id)}
            onConnect={(id: any) => connectMutation.mutate(id)}
          />
        ))}
        {visibleMatches.length === 0 && (
          <div className="rounded-2xl border border-dashed border-border bg-card px-6 py-16 text-center">
            <Filter className="mx-auto h-8 w-8 text-muted-foreground" />
            <p className="mt-3 font-semibold">No profiles for this search</p>
            <p className="mt-1 text-sm text-muted-foreground">Widen age, city, or community — results update as you adjust.</p>
            <Button
              className="mt-4"
              onClick={() => {
                queryClient.setQueryData(queryKeys.skipped, [])
                setQuery(DEFAULT_DISCOVER)
                setPage(1)
              }}
            >
              Reset search
            </Button>
          </div>
        )}
      </div>

      {visibleMatches.length > 0 && totalCount > visibleMatches.length && (
        <div className="mt-6 flex items-center justify-center gap-4">
          <Button variant="outline" disabled={page === 1} onClick={() => setPage(p => p - 1)}>
            Previous
          </Button>
          <span className="text-sm font-medium text-muted-foreground">
            Page {page} of {Math.ceil(totalCount / 10)}
          </span>
          <Button variant="outline" disabled={page * 10 >= totalCount} onClick={() => setPage(p => p + 1)}>
            Next
          </Button>
        </div>
      )}

      {moreOpen && paid && (
        <div className="fixed inset-0 z-[60] flex justify-end bg-black/40" onClick={() => setMoreOpen(false)}>
          <aside
            className="h-full w-full max-w-sm overflow-y-auto bg-[#fffbf4] p-5 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <SlidersHorizontal className="h-4 w-4 text-primary" />
                <h2 className="font-semibold">More filters</h2>
              </div>
              <button type="button" onClick={() => setMoreOpen(false)} aria-label="Close">
                <X className="h-5 w-5" />
              </button>
            </div>
            <p className="mb-3 text-xs text-muted-foreground">Results update as you tick a box.</p>
            <FilterSection title="Height">
              {HEIGHT_BANDS.map((h) => (
                <CheckItem
                  key={h}
                  label={h}
                  checked={query.advanced.heights.includes(h)}
                  onChange={() => setAdvanced({ heights: toggle(query.advanced.heights, h) })}
                />
              ))}
            </FilterSection>
            <FilterSection title="Education">
              {EDUCATION_GROUPS.map((e) => (
                <CheckItem
                  key={e}
                  label={e}
                  checked={query.advanced.educations.includes(e)}
                  onChange={() => setAdvanced({ educations: toggle(query.advanced.educations, e) })}
                />
              ))}
            </FilterSection>
            <FilterSection title="Income">
              {incomes.map((i) => (
                <CheckItem
                  key={i}
                  label={i}
                  checked={query.advanced.incomes.includes(i)}
                  onChange={() => setAdvanced({ incomes: toggle(query.advanced.incomes, i) })}
                />
              ))}
            </FilterSection>
            <FilterSection title="Occupation">
              {occupations.map((o: any) => (
                <CheckItem
                  key={o}
                  label={o}
                  checked={query.advanced.occupations.includes(o)}
                  onChange={() => setAdvanced({ occupations: toggle(query.advanced.occupations, o) })}
                />
              ))}
            </FilterSection>
            <FilterSection title="Diet">
              {diets.map((d) => (
                <CheckItem
                  key={d}
                  label={d}
                  checked={query.advanced.diets.includes(d)}
                  onChange={() => setAdvanced({ diets: toggle(query.advanced.diets, d) })}
                />
              ))}
            </FilterSection>
            <FilterSection title="Smoking">
              {["No", "Occasionally", "Yes"].map((s: any) => (
                <CheckItem
                  key={s}
                  label={s}
                  checked={query.advanced.smoking.includes(s)}
                  onChange={() => setAdvanced({ smoking: toggle(query.advanced.smoking, s) })}
                />
              ))}
            </FilterSection>
            <FilterSection title="Drinking">
              {["No", "Occasionally", "Yes"].map((s: any) => (
                <CheckItem
                  key={s}
                  label={s}
                  checked={query.advanced.drinking.includes(s)}
                  onChange={() => setAdvanced({ drinking: toggle(query.advanced.drinking, s) })}
                />
              ))}
            </FilterSection>
            <FilterSection title="Manglik status">
              {["Yes", "No", "Don't know"].map((s: any) => (
                <CheckItem
                  key={s}
                  label={s}
                  checked={query.advanced.manglik.includes(s)}
                  onChange={() => setAdvanced({ manglik: toggle(query.advanced.manglik, s) })}
                />
              ))}
            </FilterSection>
            <FilterSection title="Horoscope star">
              {stars.map((s: any) => (
                <CheckItem
                  key={s}
                  label={s}
                  checked={query.advanced.stars.includes(s)}
                  onChange={() => setAdvanced({ stars: toggle(query.advanced.stars, s) })}
                />
              ))}
            </FilterSection>
            <FilterSection title="Willing to relocate">
              <CheckItem
                label="Yes"
                checked={query.advanced.relocate === "yes"}
                onChange={(v) => setAdvanced({ relocate: v ? "yes" : "" })}
              />
              <CheckItem
                label="No"
                checked={query.advanced.relocate === "no"}
                onChange={(v) => setAdvanced({ relocate: v ? "no" : "" })}
              />
            </FilterSection>
            <Button className="mt-4 w-full" onClick={() => setMoreOpen(false)}>
              Done
            </Button>
          </aside>
        </div>
      )}

      {saveOpen && paid && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 p-4" onClick={() => setSaveOpen(false)}>
          <div className="w-full max-w-sm rounded-2xl border border-border bg-card p-5" onClick={(e) => e.stopPropagation()}>
            <h2 className="font-serif text-xl font-bold">Save this search</h2>
            <p className="mt-1 text-sm text-muted-foreground">We’ll notify you when new profiles match (demo).</p>
            <input
              value={saveLabel}
              onChange={(e) => setSaveLabel(e.target.value)}
              placeholder='e.g. Engineers in Chennai'
              className="mt-4 h-11 w-full rounded-xl border border-input bg-background px-3 text-sm"
            />
            <div className="mt-4 flex gap-2">
              <Button variant="outline" className="flex-1" onClick={() => setSaveOpen(false)}>
                Cancel
              </Button>
              <Button
                className="flex-1"
                disabled={!saveLabel.trim()}
                onClick={() => {
                  saveSearchMutation.mutate({
                    label: saveLabel.trim(),
                    ageMin: query.ageMin,
                    ageMax: query.ageMax,
                    city: query.city,
                    community: query.community,
                  })
                  setSaveLabel("")
                  setSaveOpen(false)
                }}
              >
                Save
              </Button>
            </div>
          </div>
        </div>
      )}
    </main>
  )
}
