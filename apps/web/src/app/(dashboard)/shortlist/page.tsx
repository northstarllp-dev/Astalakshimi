"use client"

import * as React from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { MatchListCard } from "@/components/dashboard/match-list-card"
import { getMatchById } from "@/lib/matches"
import { loadShortlist, sendInterest, toggleShortlist } from "@/lib/user-activity"
import { Bookmark } from "lucide-react"

export default function ShortlistPage() {
  const [ids, setIds] = React.useState<string[]>([])

  React.useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setIds(loadShortlist())
  }, [])

  const matches = ids.map((id) => getMatchById(id)).filter(Boolean)

  return (
    <main className="mx-auto max-w-5xl space-y-4 px-3 py-5 sm:px-4 md:py-8">
      <div>
        <h1 className="font-serif text-3xl font-bold">Shortlist</h1>
        <p className="mt-1 text-sm text-muted-foreground">{matches.length} saved profiles</p>
      </div>

      {matches.length === 0 && (
        <div className="rounded-2xl border border-dashed border-border bg-card px-6 py-16 text-center">
          <Bookmark className="mx-auto h-8 w-8 text-muted-foreground" />
          <p className="mt-3 font-semibold">No shortlisted profiles yet</p>
          <Link href="/search">
            <Button className="mt-4">Browse matches</Button>
          </Link>
        </div>
      )}

      <div className="space-y-3">
        {matches.map((match) =>
          match ? (
            <MatchListCard
              key={match.id}
              match={match}
              onSkip={(id) => setIds(toggleShortlist(id))}
              onConnect={(id) => sendInterest(id)}
            />
          ) : null
        )}
      </div>
    </main>
  )
}
