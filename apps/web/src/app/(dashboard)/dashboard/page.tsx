"use client"

import { RequireFullPortal } from "@/components/layout/require-full-portal"
import { canInteract, getOnboardingState } from "@/lib/portal-access"
import { Button } from "@/components/ui/button"
import { MatchListCard } from "@/components/dashboard/match-list-card"
import { MatchSnapFeed, MatchSnapSlide } from "@/components/dashboard/match-snap-feed"
import * as React from "react"
import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
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
  useTopMatchesPaginatedQuery,
  useActivitySummaryQuery,
  queryKeys,
} from "@/hooks/queries"
import { discoverQuickSchema } from "@/lib/validation"
import { apiClient } from "@/lib/api-client"
import { VERIFICATION_SLA_HOURS, INCOME_BANDS, DIETS, STARS } from "@/lib/profile-store"
import {
  BROWSE_TABS,
  DEFAULT_DISCOVER,
  DEFAULT_AGE_MIN,
  DEFAULT_AGE_MAX,
  EMPTY_ADVANCED,
  DISCOVER_VIEWS,
  DEFAULT_VIEW,
  parseDiscoverView,
  toSearchApiParams,
  type AdvancedFilters,
  type DiscoverQuery,
  type DiscoverView,
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
  Search,
  SlidersHorizontal,
  Sparkles,
  X,
} from "lucide-react"
import { CityAutocomplete } from "@/components/profile/city-autocomplete"
import { SearchableSelect } from "@/components/profile/searchable-select"
import { getCommunities } from "@/lib/community-data"

const HEIGHT_BANDS = ["Up to 5'4\"", "5'5\" – 5'8\"", "5'9\" & above"]
const EDUCATION_GROUPS = ["B.Tech", "B.E", "MBA", "M.Sc", "Ph.D", "M.Phil", "Post Doctorate", "Others"]
const MATCHES_PAGE_SIZE = 10

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
      {/* useSearchParams() requires a Suspense boundary when prerendering. */}
      <React.Suspense fallback={null}>
        <DiscoverPage />
      </React.Suspense>
    </RequireFullPortal>
  )
}

/** Horizontal sub-tab toggle at the top of Discover (matches vs. search/filter). */
function DiscoverViewTabs({
  view,
  onChange,
}: {
  view: DiscoverView
  onChange: (view: DiscoverView) => void
}) {
  return (
    <nav
      role="tablist"
      aria-label="Discover views"
      className="mb-4 flex shrink-0 gap-1 rounded-2xl border border-border bg-card p-1"
    >
      {DISCOVER_VIEWS.map((tab) => {
        const isActive = view === tab.id
        const Icon = tab.id === "matches" ? Sparkles : Search
        return (
          <button
            key={tab.id}
            type="button"
            role="tab"
            id={`discover-tab-${tab.id}`}
            aria-selected={isActive}
            aria-controls={`discover-panel-${tab.id}`}
            onClick={() => onChange(tab.id)}
            className={cn(
              "flex flex-1 items-center justify-center gap-1.5 rounded-xl px-3 py-2 text-sm font-semibold transition",
              isActive
                ? "bg-primary text-primary-foreground shadow-sm"
                : "text-muted-foreground hover:bg-muted/60 hover:text-foreground",
            )}
          >
            <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
            <span className="truncate">{tab.label}</span>
          </button>
        )
      })}
    </nav>
  )
}

function DiscoverPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const view = parseDiscoverView(searchParams.get("view"))

  const { data: profile = null } = useProfileQuery()
  const { data: skipped = [] } = useSkippedQuery()
  const { data: interests } = useInterestsQuery()
  const { data: shortlist = [] } = useShortlistQuery()
  const skipMutation = useSkipMatchMutation()
  const connectMutation = useSendInterestMutation()

  const onboardingState = getOnboardingState(profile)
  const interactionsLocked = !canInteract(profile)
  const firstName = profile?.fullName?.split(" ")[0] || "Member"
  
  const { data: activitySummary } = useActivitySummaryQuery()
  
  const interestCount = interests?.pendingCount ?? 0
  const shortlistCount = shortlist.length
  const viewsCount = activitySummary?.viewers.length ?? 0

  const handleSkip = (id: string) => {
    if (interactionsLocked) return
    skipMutation.mutate(id)
  }
  const handleConnect = (id: string) => {
    if (interactionsLocked) return
    connectMutation.mutate(id)
  }

  const setView = (next: DiscoverView) => {
    router.replace(next === DEFAULT_VIEW ? "/dashboard" : `/dashboard?view=${next}`, { scroll: false })
  }

  return (
    <main className="mx-auto flex h-[calc(100dvh-3.5rem)] max-w-7xl flex-col overflow-hidden px-3 pt-4 sm:px-4 md:h-[calc(100dvh-4rem)] md:pt-8">
      <div className="mb-4 flex shrink-0 flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-xs font-semibold tracking-[0.2em] text-gold uppercase">Search & browse</p>
          <h1 className="mt-0.5 font-serif text-2xl font-bold tracking-tight md:text-3xl">
            Discover
            {interactionsLocked && (
              <span className="ml-3 inline-flex items-center rounded-full bg-amber-100 px-2.5 py-0.5 text-sm font-semibold text-amber-800 align-middle">
                Preview Only
              </span>
            )}
          </h1>
          <p className="mt-1 max-w-xl text-sm text-muted-foreground">
            Namaste, {firstName}. People who match who you are looking for, or browse everyone.
          </p>
        </div>
        <div className="grid grid-cols-3 gap-2 sm:flex">
          {[
            { label: "Interests", value: String(interestCount), href: "/interests" },
            { label: "Shortlisted", value: String(shortlistCount), href: "/interests?tab=shortlisted" },
            { label: "Views", value: String(viewsCount), href: "/notifications" },
          ].map((stat) => (
            <Link
              key={stat.label}
              href={stat.href}
              className="flex-1 rounded-xl border border-border bg-card px-2 py-1.5 text-center transition hover:border-primary/30 sm:min-w-[68px] sm:px-3 sm:py-2"
            >
              <p className="font-serif text-base font-bold leading-none text-primary sm:text-lg">{stat.value}</p>
              <p className="mt-1 text-[10px] font-medium text-muted-foreground">{stat.label}</p>
            </Link>
          ))}
        </div>
      </div>

      <DiscoverViewTabs view={view} onChange={setView} />



      {view === "matches" ? (
        <TopMatchesPanel
          profile={profile}
          interactionsLocked={interactionsLocked}
          skipped={skipped}
          onSkip={handleSkip}
          onConnect={handleConnect}
        />
      ) : (
        <SearchFilterPanel
          interactionsLocked={interactionsLocked}
          skipped={skipped}
          onSkip={handleSkip}
          onConnect={handleConnect}
        />
      )}
    </main>
  )
}

/** For you — profiles that pass age, religion, and marital preferences. */
function TopMatchesPanel({
  profile,
  interactionsLocked,
  skipped,
  onSkip,
  onConnect,
}: {
  profile: any
  interactionsLocked: boolean
  skipped: string[]
  onSkip: (id: string) => void
  onConnect: (id: string) => void
}) {
  const [page, setPage] = React.useState(1)
  const { data, isLoading } = useTopMatchesPaginatedQuery({ page, limit: MATCHES_PAGE_SIZE })

  const matches = (data?.matches || []).filter((match) => !skipped.includes(match.id))
  const totalCount = data?.totalCount || 0
  const totalPages = Math.max(1, Math.ceil(totalCount / MATCHES_PAGE_SIZE))
  const prefsIncomplete =
    !(profile?.prefReligion?.length > 0) ||
    !(profile?.prefMaritalStatuses?.length > 0) ||
    typeof profile?.prefAgeMin !== "number" ||
    typeof profile?.prefAgeMax !== "number"

  return (
    <div
      role="tabpanel"
      id="discover-panel-matches"
      aria-labelledby="discover-tab-matches"
      className="flex min-h-0 flex-1 flex-col"
    >
      <div className="shrink-0">
        <p className="mb-3 text-sm text-muted-foreground">
          {isLoading ? (
            <span>Loading people who fit your preferences…</span>
          ) : (
            <>
              People who fit the age, religion, and marital status you set
              {totalCount > 0 ? (
                <>
                  {" "}
                  · <span className="font-semibold text-primary">{totalCount}</span>
                </>
              ) : null}
            </>
          )}
        </p>
      </div>

      <MatchSnapFeed className="pb-24 md:pb-2">
        {matches.map((match, index) => (
          <MatchSnapSlide key={match.id}>
            <MatchListCard
              match={match}
              featured={index === 0 && page === 1}
              priority={index === 0}
              fillViewport
              className="h-full"
              interactionsLocked={interactionsLocked}
              onSkip={onSkip}
              onConnect={onConnect}
            />
          </MatchSnapSlide>
        ))}
        {!isLoading && totalCount === 0 && (
          <div className="rounded-2xl border border-dashed border-border bg-card px-6 py-16 text-center">
            <Sparkles className="mx-auto h-8 w-8 text-muted-foreground" />
            <p className="mt-3 font-semibold">
              {prefsIncomplete ? "Set who you are looking for" : "No profiles fit those preferences yet"}
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              {prefsIncomplete
                ? "Choose an age range, at least one religion, and at least one marital status."
                : "Widen your partner preferences, or browse the full community."}
            </p>
            <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
              <Link href="/profile/edit#preferences">
                <Button>Edit preferences</Button>
              </Link>
              <Link href="/dashboard?view=search">
                <Button variant="outline">Browse all profiles</Button>
              </Link>
            </div>
          </div>
        )}
      </MatchSnapFeed>

      {totalPages > 1 && (
        <div className="mt-3 hidden shrink-0 items-center justify-center gap-4 pb-4 md:flex">
          <Button variant="outline" disabled={page === 1} onClick={() => setPage((p) => p - 1)}>
            Previous
          </Button>
          <span className="text-sm font-medium text-muted-foreground">
            Page {page} of {totalPages}
          </span>
          <Button variant="outline" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>
            Next
          </Button>
        </div>
      )}
    </div>
  )
}

/** Browse — every eligible profile. Saved partner preferences do not hide anyone. */
function SearchFilterPanel({
  interactionsLocked,
  skipped,
  onSkip,
  onConnect,
}: {
  interactionsLocked: boolean
  skipped: string[]
  onSkip: (id: string) => void
  onConnect: (id: string) => void
}) {
  const queryClient = useQueryClient()
  const { data: paid = false } = usePaidQuery()
  const { data: saved = [] } = useSavedSearchesQuery()
  const saveSearchMutation = useAddSavedSearchMutation()

  const [query, setQuery] = React.useState<DiscoverQuery>(DEFAULT_DISCOVER)
  const [page, setPage] = React.useState(1)
  const [moreOpen, setMoreOpen] = React.useState(false)
  const [filterOpen, setFilterOpen] = React.useState(false)
  const [saveOpen, setSaveOpen] = React.useState(false)
  const [saveLabel, setSaveLabel] = React.useState("")
  const [paywall, setPaywall] = React.useState<string | null>(null)
  const [prefsApplied, setPrefsApplied] = React.useState(false)

  const activeFilterCount = React.useMemo(() => {
    let count = 0
    if (query.city) count++
    if (query.community) count++
    if (query.ageFilterEnabled) count++
    if (query.advanced.heights.length > 0) count++
    if (query.advanced.educations.length > 0) count++
    if (query.advanced.occupations.length > 0) count++
    if (query.advanced.incomes.length > 0) count++
    if (query.advanced.diets.length > 0) count++
    if (query.advanced.smoking.length > 0) count++
    if (query.advanced.drinking.length > 0) count++
    if (query.advanced.manglik.length > 0) count++
    if (query.advanced.stars.length > 0) count++
    if (query.advanced.relocate) count++
    return count
  }, [query])

  const { data: searchResult, isLoading: isSearchLoading } = useSearchQuery(
    toSearchApiParams({ ...query, page, limit: 10 }),
  )
  const visibleMatches = (searchResult?.profiles || []).filter((match: any) => !skipped.includes(match.id))
  const totalCount = searchResult?.totalCount || 0

  const setQuick = (patch: Partial<DiscoverQuery>) => {
    setPrefsApplied(false)
    setQuery((q) => {
      const next = { ...q, ...patch }
      // Touching age values enables the age filter for the API.
      if (patch.ageMin !== undefined || patch.ageMax !== undefined) {
        next.ageFilterEnabled = patch.ageFilterEnabled ?? true
      }
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
    setPrefsApplied(false)
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

  const applyPreferences = async () => {
    // Stored partner prefs → free Discover filters only (age / city / community).
    // Paid advanced filters are never auto-filled from prefs.
    try {
      const prefs = await apiClient.preferences.getMyPreferences()
      const locations = Array.isArray(prefs?.prefLocations) ? prefs.prefLocations : []
      const castes = Array.isArray(prefs?.prefCastes) ? prefs.prefCastes : []
      setQuery((q) => ({
        ...q,
        ageMin: prefs?.prefAgeMin ?? q.ageMin,
        ageMax: prefs?.prefAgeMax ?? q.ageMax,
        ageFilterEnabled: true,
        city: locations[0] ?? q.city,
        community: castes[0] ?? q.community,
        advanced: EMPTY_ADVANCED,
      }))
      setPrefsApplied(true)
    } catch {
      // No prefs saved yet — keep the current query untouched.
      setPrefsApplied(false)
    }
    setPage(1)
  }

  const communityOptions = React.useMemo(() => {
    const list = Array.from(
      new Set(getCommunities().map((c) => c.label))
    ).sort((a, b) => a.localeCompare(b))
    return [
      { value: "", label: "Any community" },
      ...list.map((c) => ({ value: c, label: c })),
    ]
  }, [])
  const occupations = ["Software Engineer", "Doctor", "Engineer - Non IT", "Teacher / Professor", "Business Owner", "Banker / Finance", "Government Service", "Defense", "Lawyer", "Other"]
  const incomes = INCOME_BANDS
  const diets = DIETS
  const stars = STARS

  return (
    <>

      <div className="mb-4 flex shrink-0 flex-wrap items-center justify-between gap-2.5">
        <div className="flex flex-wrap items-center gap-2">
          {/* Small Filters Button */}
          <Button
            type="button"
            variant={activeFilterCount > 0 ? "default" : "outline"}
            onClick={() => setFilterOpen(true)}
            className="h-10 rounded-full px-4 text-sm font-semibold shadow-xs transition"
          >
            <SlidersHorizontal className="mr-2 h-4 w-4" />
            <span>Age & filters</span>
            {activeFilterCount > 0 ? (
              <span className="ml-2 flex h-5 min-w-5 items-center justify-center rounded-full bg-secondary px-1 text-[11px] font-bold text-secondary-foreground">
                {activeFilterCount}
              </span>
            ) : null}
          </Button>

          {/* Quick preferences */}
          <Button
            type="button"
            variant="soft"
            size="sm"
            onClick={applyPreferences}
            className="h-10 rounded-full px-3.5 text-sm"
            title="Apply your saved partner preferences to these filters"
          >
            <Heart className="mr-1.5 h-4 w-4 text-primary" /> {prefsApplied ? "Preferences applied" : "My preferences"}
          </Button>

          {saved.length > 0 && paid && (
            <select
              className="h-10 rounded-full border border-border bg-background px-3 text-xs sm:text-sm"
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
        </div>

        {activeFilterCount > 0 ? (
          <button
            type="button"
            className="text-xs font-semibold text-primary hover:underline"
            onClick={() => setQuery(DEFAULT_DISCOVER)}
          >
            Clear all ({activeFilterCount})
          </button>
        ) : null}
      </div>

      {/* Active filter chips row */}
      {activeFilterCount > 0 ? (
        <div className="-mx-3 mb-3 flex items-center gap-1.5 overflow-x-auto px-3 pb-1 hide-scrollbar sm:mx-0 sm:px-0">
          <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide shrink-0 mr-1">
            Active:
          </span>
          {(query.ageFilterEnabled) && (
            <span className="inline-flex shrink-0 items-center gap-1 rounded-full border border-border bg-card px-2.5 py-1 text-xs font-medium text-foreground">
              {query.ageMin}–{query.ageMax} yrs
              <button
                type="button"
                onClick={() =>
                  setQuery((q) => ({
                    ...q,
                    ageMin: DEFAULT_AGE_MIN,
                    ageMax: DEFAULT_AGE_MAX,
                    ageFilterEnabled: false,
                  }))
                }
                className="text-muted-foreground hover:text-foreground"
                aria-label="Clear age filter"
              >
                <X className="h-3 w-3" />
              </button>
            </span>
          )}
          {query.city && (
            <span className="inline-flex shrink-0 items-center gap-1 rounded-full border border-border bg-card px-2.5 py-1 text-xs font-medium text-foreground">
              {query.city}
              <button
                type="button"
                onClick={() => setQuick({ city: "" })}
                className="text-muted-foreground hover:text-foreground"
                aria-label="Clear city"
              >
                <X className="h-3 w-3" />
              </button>
            </span>
          )}
          {query.community && (
            <span className="inline-flex shrink-0 items-center gap-1 rounded-full border border-border bg-card px-2.5 py-1 text-xs font-medium text-foreground">
              {query.community}
              <button
                type="button"
                onClick={() => setQuick({ community: "" })}
                className="text-muted-foreground hover:text-foreground"
                aria-label="Clear community"
              >
                <X className="h-3 w-3" />
              </button>
            </span>
          )}
          <button
            type="button"
            onClick={() => setFilterOpen(true)}
            className="shrink-0 text-xs font-semibold text-primary hover:underline ml-1"
          >
            Edit
          </button>
        </div>
      ) : null}

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



      <div
        role="tabpanel"
        id="discover-panel-search"
        aria-labelledby="discover-tab-search"
        className="flex min-h-0 flex-1 flex-col"
      >
        <div className="shrink-0">
          <p className="mb-3 text-sm text-muted-foreground">
            {isSearchLoading ? (
              <span>Loading profiles...</span>
            ) : (
              <>
                <span className="font-semibold text-primary">{totalCount}</span> profiles found
              </>
            )}
          </p>
        </div>

        <MatchSnapFeed className="pb-24 md:pb-2">
          {visibleMatches.map((match: any, index: any) => (
            <MatchSnapSlide key={match.id}>
              <MatchListCard
                match={match}
                featured={index === 0 && query.tab === "all"}
                priority={index === 0}
                fillViewport
                className="h-full"
                interactionsLocked={interactionsLocked}
                onSkip={onSkip}
                onConnect={onConnect}
              />
            </MatchSnapSlide>
          ))}
          {visibleMatches.length === 0 && (
            <div className="rounded-2xl border border-dashed border-border bg-card px-6 py-16 text-center">
              <Filter className="mx-auto h-8 w-8 text-muted-foreground" />
              <p className="mt-3 font-semibold">No profiles for this search</p>
              <p className="mt-1 text-sm text-muted-foreground">Widen or reset filters — empty Browse shows every eligible profile.</p>
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
        </MatchSnapFeed>

        {visibleMatches.length > 0 && totalCount > visibleMatches.length && (
          <div className="mt-3 hidden shrink-0 items-center justify-center gap-4 pb-4 md:flex">
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
      </div>

      {/* Full Filters Popup Modal */}
      {filterOpen && (
        <div
          className="fixed inset-0 z-[70] flex items-end sm:items-center justify-center bg-black/60 p-0 sm:p-4 backdrop-blur-xs"
          onClick={() => setFilterOpen(false)}
        >
          <div
            className="relative flex max-h-[92dvh] w-full max-w-lg flex-col overflow-hidden rounded-t-[1.75rem] border border-secondary/30 bg-[#fffbf4] shadow-2xl sm:rounded-3xl"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-border/80 px-5 py-4">
              <div className="flex items-center gap-2">
                <SlidersHorizontal className="h-5 w-5 text-primary" />
                <div>
                  <h2 className="font-serif text-lg font-bold text-foreground">Filters</h2>
                  <p className="text-xs text-muted-foreground">
                    Filter profiles by age, location, and community
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                {activeFilterCount > 0 ? (
                  <button
                    type="button"
                    onClick={() => setQuery(DEFAULT_DISCOVER)}
                    className="text-xs font-semibold text-primary hover:underline"
                  >
                    Reset all
                  </button>
                ) : null}
                <button
                  type="button"
                  onClick={() => setFilterOpen(false)}
                  aria-label="Close"
                  className="flex h-8 w-8 items-center justify-center rounded-full bg-muted text-muted-foreground hover:bg-muted/80 hover:text-foreground transition"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>

            {/* Modal Body: Scrollable */}
            <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-5">
              {/* 1. Age Range */}
              <div>
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
                    Age range
                  </span>
                  <span className="rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-bold text-primary tabular-nums">
                    {query.ageFilterEnabled
                      ? `${query.ageMin} – ${query.ageMax} yrs`
                      : "Any age"}
                  </span>
                </div>
                <div className="mt-2 flex h-12 items-center rounded-xl border border-input bg-card px-4 shadow-xs">
                  <div className="flex w-full items-center gap-3">
                    <span className="text-xs font-medium text-muted-foreground tabular-nums">18</span>
                    <input
                      type="range"
                      min={18}
                      max={50}
                      value={query.ageMin}
                      onChange={(e) => {
                        const ageMin = Math.min(Number(e.target.value), query.ageMax)
                        setQuick({ ageMin })
                      }}
                      className="h-2 w-full cursor-pointer appearance-none rounded-lg bg-muted accent-[#7c1535]"
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
                      className="h-2 w-full cursor-pointer appearance-none rounded-lg bg-muted accent-[#7c1535]"
                      aria-label="Maximum age"
                    />
                    <span className="text-xs font-medium text-muted-foreground tabular-nums">50</span>
                  </div>
                </div>
              </div>

              {/* 2. Location */}
              <div>
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
                    Location
                  </span>
                  {query.city ? (
                    <button
                      type="button"
                      onClick={() => setQuick({ city: "" })}
                      className="text-xs font-semibold text-primary hover:underline"
                    >
                      Clear
                    </button>
                  ) : null}
                </div>
                <div className="relative mt-2">
                  <CityAutocomplete
                    city={query.city}
                    onCityChange={({ city }) => setQuick({ city })}
                    placeholder="Any city"
                    searchPlaceholder="Search city (e.g. Chennai, Bengaluru)…"
                    className="h-12 w-full rounded-xl border border-input bg-card px-4 text-sm"
                  />
                  {query.city ? (
                    <button
                      type="button"
                      onClick={() => setQuick({ city: "" })}
                      className="absolute right-9 top-1/2 -translate-y-1/2 z-10 flex h-5 w-5 items-center justify-center rounded-full bg-muted text-muted-foreground hover:bg-muted/80 hover:text-foreground transition"
                      aria-label="Clear location"
                      title="Clear location"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  ) : null}
                </div>
              </div>

              {/* 3. Community */}
              <div>
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
                    Community
                  </span>
                  {query.community ? (
                    <button
                      type="button"
                      onClick={() => setQuick({ community: "" })}
                      className="text-xs font-semibold text-primary hover:underline"
                    >
                      Clear
                    </button>
                  ) : null}
                </div>
                <div className="relative mt-2">
                  <SearchableSelect
                    value={query.community}
                    onValueChange={(community) => setQuick({ community })}
                    options={communityOptions}
                    placeholder="Any community"
                    searchPlaceholder="Search or type community…"
                    emptyText="No matching community found."
                    allowCustom={true}
                    className="h-12 w-full rounded-xl border border-input bg-card px-4 text-sm"
                  />
                  {query.community ? (
                    <button
                      type="button"
                      onClick={() => setQuick({ community: "" })}
                      className="absolute right-9 top-1/2 -translate-y-1/2 z-10 flex h-5 w-5 items-center justify-center rounded-full bg-muted text-muted-foreground hover:bg-muted/80 hover:text-foreground transition"
                      aria-label="Clear community"
                      title="Clear community"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  ) : null}
                </div>
              </div>

              {/* Advanced options */}
              <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-border/70">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="rounded-full text-xs"
                  onClick={() => requirePaid("Advanced filters", () => {
                    setFilterOpen(false)
                    setMoreOpen(true)
                  })}
                >
                  {paid ? <SlidersHorizontal className="mr-1.5 h-3.5 w-3.5" /> : <Lock className="mr-1.5 h-3.5 w-3.5" />}
                  Advanced filters (Height, Education, etc.)
                </Button>

                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="rounded-full text-xs"
                  onClick={() => requirePaid("Saved searches", () => {
                    setFilterOpen(false)
                    setSaveOpen(true)
                  })}
                >
                  {paid ? <Bookmark className="mr-1.5 h-3.5 w-3.5" /> : <Lock className="mr-1.5 h-3.5 w-3.5" />}
                  Save search
                </Button>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="border-t border-border/80 bg-card p-4 flex items-center justify-between gap-3">
              <Button
                type="button"
                variant="outline"
                onClick={() => setQuery(DEFAULT_DISCOVER)}
                className="rounded-full"
              >
                Reset
              </Button>
              <Button
                type="button"
                onClick={() => setFilterOpen(false)}
                className="flex-1 rounded-full bg-primary text-primary-foreground font-semibold shadow-sm"
              >
                Show {totalCount} Profiles
              </Button>
            </div>
          </div>
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
    </>
  )
}
