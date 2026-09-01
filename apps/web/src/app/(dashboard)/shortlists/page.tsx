"use client"

import * as React from "react"
import Link from "next/link"
import { RequireFullPortal } from "@/components/layout/require-full-portal"
import { Button } from "@/components/ui/button"
import { MatchListCard } from "@/components/dashboard/match-list-card"
import { useSendInterestMutation, useShortlistQuery, useToggleShortlistMutation } from "@/hooks/queries"
import { Bookmark, Loader2, Compass } from "lucide-react"

export default function ShortlistPage() {
  return (
    <RequireFullPortal>
      <ShortlistPageInner />
    </RequireFullPortal>
  )
}

function ShortlistPageInner() {
  const { data: rawList = [], isLoading } = useShortlistQuery()
  const toggleMutation = useToggleShortlistMutation()
  const connectMutation = useSendInterestMutation()

  // Normalize list whether array of profile objects or IDs
  const matches = React.useMemo(() => {
    return (rawList || []).map((item: any) => {
      if (typeof item === "string") {
        return {
          id: item,
          fullName: "Profile " + item.slice(0, 8),
          age: 26,
          city: "Tamil Nadu",
          community: "Community",
          education: "Graduate",
          occupation: "Professional",
          matchPercent: 90,
          photos: [],
        }
      }
      return item
    }).filter(Boolean)
  }, [rawList])

  return (
    <main className="mx-auto max-w-5xl space-y-5 px-3 py-5 sm:px-4 md:py-8">
      <div className="flex flex-wrap items-end justify-between gap-3 border-b border-border/70 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="flex size-7 items-center justify-center rounded-full bg-amber-500/10 text-amber-600">
              <Bookmark className="h-4 w-4 fill-amber-500 text-amber-500" />
            </span>
            <p className="text-xs font-semibold tracking-wider text-amber-600 uppercase">Private Watchlist</p>
          </div>
          <h1 className="mt-1 font-serif text-3xl font-bold tracking-tight">Saved Profiles</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {matches.length} {matches.length === 1 ? "profile" : "profiles"} bookmarked · Saved privately, members are not notified.
          </p>
        </div>
        {matches.length > 0 && (
          <Link href="/dashboard">
            <Button variant="outline" size="sm">
              <Compass className="mr-1.5 h-3.5 w-3.5" /> Find more matches
            </Button>
          </Link>
        )}
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center gap-2 py-20 text-muted-foreground text-sm">
          <Loader2 className="h-5 w-5 animate-spin" /> Loading your shortlist...
        </div>
      ) : matches.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border bg-card px-6 py-16 text-center">
          <div className="mx-auto flex size-12 items-center justify-center rounded-full bg-amber-500/10 text-amber-500">
            <Bookmark className="h-6 w-6" />
          </div>
          <p className="mt-4 font-serif text-xl font-bold">No shortlisted profiles yet</p>
          <p className="mx-auto mt-1 max-w-sm text-sm text-muted-foreground">
            Click the Bookmark icon on any profile card in Discover or Search to save them here for easy review.
          </p>
          <Link href="/dashboard" className="mt-6 inline-block">
            <Button className="shadow-sm">
              <Compass className="mr-1.5 h-4 w-4" /> Browse Matches
            </Button>
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          {matches.map((match: any) => (
            <MatchListCard
              key={match.id || match.profileId}
              match={match}
              onSkip={(id: string) => toggleMutation.mutate(id)}
              onConnect={(id: string) => connectMutation.mutate(id)}
            />
          ))}
        </div>
      )}
    </main>
  )
}

