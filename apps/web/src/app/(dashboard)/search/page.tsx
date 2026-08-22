"use client"

import { RequireFullPortal } from "@/components/layout/require-full-portal"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { MatchListCard } from "@/components/dashboard/match-list-card"
import * as React from "react"
import Link from "next/link"
import { useMatchesQuery, useSkipMatchMutation, useSkippedQuery, useSendInterestMutation } from "@/hooks/queries"
import { searchFiltersSchema, type SearchFiltersValues } from "@/lib/validation"
import { Filter, SlidersHorizontal, X } from "lucide-react"
import { cn } from "@/lib/utils"

type Filters = SearchFiltersValues

const emptyFilters = (): Filters => ({
  q: "",
  city: "",
  community: "",
  motherTongue: "",
  education: "",
  income: "",
  ageMin: 21,
  ageMax: 40,
  photoVerified: false,
  hasHoroscope: false,
})

function applyFilters(matches: any[], f: Filters, skipped: string[]) {
  return matches.filter((m: any) => {
    if (skipped.includes(m.id)) return false
    if (m.age < f.ageMin || m.age > f.ageMax) return false
    if (f.photoVerified && !m.photoVerified) return false
    if (f.hasHoroscope && !m.hasHoroscope) return false
    const hay = [m.fullName, m.city, m.community, m.occupation, m.education, m.motherTongue, m.income]
      .join(" ")
      .toLowerCase()
    if (f.q && !hay.includes(f.q.toLowerCase())) return false
    if (f.city && !m.city.toLowerCase().includes(f.city.toLowerCase())) return false
    if (f.community && !m.community.toLowerCase().includes(f.community.toLowerCase())) return false
    if (f.motherTongue && !m.motherTongue.toLowerCase().includes(f.motherTongue.toLowerCase())) return false
    if (f.education && !m.education.toLowerCase().includes(f.education.toLowerCase())) return false
    if (f.income && !m.income.toLowerCase().includes(f.income.toLowerCase())) return false
    return true
  })
}

export default function SearchPage() {
  return (
    <RequireFullPortal>
      <SearchPageInner />
    </RequireFullPortal>
  )
}

function SearchPageInner() {
  const { data: matches = ([] as any[]) } = useMatchesQuery()
  const { data: skipped = [] } = useSkippedQuery()
  const skipMutation = useSkipMatchMutation()
  const connectMutation = useSendInterestMutation()
  const [filters, setFilters] = React.useState<Filters>(emptyFilters)
  const [draft, setDraft] = React.useState<Filters>(emptyFilters)
  const [open, setOpen] = React.useState(false)
  const [filterError, setFilterError] = React.useState("")

  const results = React.useMemo(() => applyFilters(matches, filters, skipped), [matches, filters, skipped])

  const applyDraft = () => {
    const parsed = searchFiltersSchema.safeParse(draft)
    if (!parsed.success) {
      setFilterError(parsed.error.issues[0]?.message ?? "Check the filters.")
      return
    }
    setFilterError("")
    setFilters(parsed.data)
    setOpen(false)
  }

  const reset = () => {
    const next = emptyFilters()
    setDraft(next)
    setFilters(next)
  }

  return (
    <main className="mx-auto max-w-5xl space-y-4 px-3 py-5 sm:px-4 md:py-8">
      <div className="flex items-end justify-between gap-3">
        <div>
          <h1 className="font-serif text-3xl font-bold">Search matches</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            <span className="font-semibold text-primary">{results.length}</span> profiles
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={() => { setDraft(filters); setOpen(true) }}>
          <SlidersHorizontal className="mr-1.5 h-4 w-4" /> Filters
        </Button>
      </div>

      <label className="flex items-center gap-2 rounded-full border border-border bg-card px-4 py-2.5 text-sm shadow-sm">
        <Filter className="h-4 w-4 shrink-0 text-muted-foreground" />
        <input
          type="search"
          value={filters.q}
          onChange={(e: any) => setFilters((f) => ({ ...f, q: e.target.value }))}
          placeholder="City, community, profession…"
          className="w-full bg-transparent outline-none placeholder:text-muted-foreground"
        />
      </label>

      <div className="space-y-3">
        {results.map((match: any, index: any) => (
          <MatchListCard
            key={match.id}
            match={match}
            priority={index === 0}
            onSkip={(id: any) => skipMutation.mutate(id)}
            onConnect={(id: any) => connectMutation.mutate(id)}
          />
        ))}
        {results.length === 0 && (
          <div className="rounded-2xl border border-dashed border-border bg-card px-6 py-16 text-center">
            <Filter className="mx-auto h-8 w-8 text-muted-foreground" />
            <p className="mt-3 font-semibold">No matches for these filters</p>
            <Button className="mt-4" onClick={reset}>
              Reset filters
            </Button>
          </div>
        )}
      </div>

      {open && (
        <div className="fixed inset-0 z-[60] flex items-end justify-center bg-black/40 p-0 sm:items-center sm:p-4">
          <button type="button" className="absolute inset-0" aria-label="Close filters" onClick={() => setOpen(false)} />
          <div className="relative z-10 max-h-[85dvh] w-full max-w-lg overflow-y-auto rounded-t-3xl border border-border bg-background p-5 shadow-xl sm:rounded-3xl">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="font-serif text-xl font-bold">Filters</h2>
              <button type="button" className="tap-target rounded-full border border-border" onClick={() => setOpen(false)}>
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-4">
              <Field label="City">
                <Input value={draft.city} onChange={(e: any) => setDraft((d) => ({ ...d, city: e.target.value }))} />
              </Field>
              <Field label="Community">
                <Input value={draft.community} onChange={(e: any) => setDraft((d) => ({ ...d, community: e.target.value }))} />
              </Field>
              <Field label="Mother tongue">
                <Input
                  value={draft.motherTongue}
                  onChange={(e: any) => setDraft((d) => ({ ...d, motherTongue: e.target.value }))}
                />
              </Field>
              <Field label="Education">
                <Input value={draft.education} onChange={(e: any) => setDraft((d) => ({ ...d, education: e.target.value }))} />
              </Field>
              <Field label="Income contains">
                <Input value={draft.income} onChange={(e: any) => setDraft((d) => ({ ...d, income: e.target.value }))} />
              </Field>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Min age">
                  <Input
                    type="number"
                    value={draft.ageMin}
                    onChange={(e: any) => setDraft((d) => ({ ...d, ageMin: Number(e.target.value) || 18 }))}
                  />
                </Field>
                <Field label="Max age">
                  <Input
                    type="number"
                    value={draft.ageMax}
                    onChange={(e: any) => setDraft((d) => ({ ...d, ageMax: Number(e.target.value) || 50 }))}
                  />
                </Field>
              </div>
              <div className="flex flex-wrap gap-2">
                <Chip
                  active={draft.photoVerified}
                  onClick={() => setDraft((d) => ({ ...d, photoVerified: !d.photoVerified }))}
                  label="Photo verified"
                />
                <Chip
                  active={draft.hasHoroscope}
                  onClick={() => setDraft((d) => ({ ...d, hasHoroscope: !d.hasHoroscope }))}
                  label="With horoscope"
                />
              </div>
            </div>

            <div className="mt-6 flex gap-2">
              <Button variant="outline" className="flex-1" onClick={reset}>
                Reset
              </Button>
              <Button className="flex-[1.4]" onClick={applyDraft}>
                Show results
              </Button>
            </div>
            {filterError && <p className="mt-2 text-xs text-destructive">{filterError}</p>}
            <p className="mt-3 text-center text-xs text-muted-foreground">
              Prefer quick browse?{" "}
              <Link href="/dashboard" className="font-semibold text-primary">
                Discover
              </Link>
            </p>
          </div>
        </div>
      )}
    </main>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">{label}</Label>
      {children}
    </div>
  )
}

function Chip({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "h-9 rounded-full px-3.5 text-sm font-semibold",
        active ? "bg-primary text-primary-foreground" : "border border-border bg-card text-muted-foreground"
      )}
    >
      {label}
    </button>
  )
}
