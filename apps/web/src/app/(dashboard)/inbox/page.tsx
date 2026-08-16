"use client"

import * as React from "react"
import Image from "next/image"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { getMatchById } from "@/lib/matches"
import {
  acceptInterest,
  getMessageThreads,
  getReceivedInterests,
  getSentInterests,
  type InboxTab,
} from "@/lib/user-activity"
import { cn } from "@/lib/utils"
import { ChevronRight, Heart, MessageCircle } from "lucide-react"

const tabs: { id: InboxTab; label: string }[] = [
  { id: "interests", label: "Interests" },
  { id: "accepted", label: "Accepted" },
  { id: "messages", label: "Messages" },
]

export default function InboxPage() {
  const [tab, setTab] = React.useState<InboxTab>("interests")
  const [, setTick] = React.useState(0)

  const received = getReceivedInterests()
  const sent = getSentInterests()
  const threads = getMessageThreads()
  const accepted = received.filter((i) => i.status === "accepted")

  return (
    <main className="mx-auto max-w-3xl space-y-4 px-3 py-5 sm:px-4 md:py-8">
      <div>
        <h1 className="font-serif text-3xl font-bold">Inbox</h1>
        <p className="mt-1 text-sm text-muted-foreground">Interests, accepts, and family conversations</p>
      </div>

      <div className="flex gap-2 overflow-x-auto hide-scrollbar">
        {tabs.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={cn(
              "h-9 shrink-0 rounded-full px-4 text-sm font-semibold transition-colors",
              tab === t.id
                ? "bg-primary text-primary-foreground"
                : "border border-border bg-card text-muted-foreground"
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === "interests" && (
        <div className="space-y-3">
          <p className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">Received</p>
          {received
            .filter((i) => i.status === "pending")
            .map((item) => (
              <InterestRow
                key={item.id}
                profileId={item.profileId}
                time={item.time}
                direction="received"
                onAccept={() => {
                  acceptInterest(item.profileId)
                  setTick((n) => n + 1)
                }}
              />
            ))}
          <p className="pt-2 text-xs font-semibold tracking-wide text-muted-foreground uppercase">Sent</p>
          {sent.length === 0 && (
            <p className="rounded-2xl border border-dashed border-border bg-card px-4 py-8 text-center text-sm text-muted-foreground">
              No interests sent yet. Tap Connect on a match.
            </p>
          )}
          {sent.map((item) => (
            <InterestRow key={item.id} profileId={item.profileId} time={item.time} direction="sent" />
          ))}
        </div>
      )}

      {tab === "accepted" && (
        <div className="space-y-3">
          {accepted.length === 0 && (
            <p className="rounded-2xl border border-dashed border-border bg-card px-4 py-8 text-center text-sm text-muted-foreground">
              Accepted interests will appear here.
            </p>
          )}
          {accepted.map((item) => (
            <InterestRow key={item.id} profileId={item.profileId} time={item.time} direction="received" accepted />
          ))}
        </div>
      )}

      {tab === "messages" && (
        <div className="space-y-3">
          {threads.map((thread) => {
            const match = getMatchById(thread.profileId)
            if (!match) return null
            return (
              <Link
                key={thread.id}
                href={`/inbox/${thread.id}`}
                className="flex items-center gap-3 rounded-2xl border border-border bg-card p-3 shadow-sm transition-colors hover:border-primary/30"
              >
                <div className="relative h-12 w-12 overflow-hidden rounded-full bg-muted">
                  <Image src={match.photos[0]} alt="" fill className="object-cover" sizes="48px" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <p className="truncate font-semibold">{match.fullName}</p>
                    <span className="shrink-0 text-[11px] text-muted-foreground">{thread.time}</span>
                  </div>
                  <p className={cn("truncate text-sm", thread.unread ? "font-medium text-foreground" : "text-muted-foreground")}>
                    {thread.preview}
                  </p>
                </div>
                {thread.unread && <span className="h-2.5 w-2.5 shrink-0 rounded-full bg-primary" />}
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
              </Link>
            )
          })}
        </div>
      )}
    </main>
  )
}

function InterestRow({
  profileId,
  time,
  direction,
  accepted,
  onAccept,
}: {
  profileId: string
  time: string
  direction: "received" | "sent"
  accepted?: boolean
  onAccept?: () => void
}) {
  const match = getMatchById(profileId)
  if (!match) return null

  return (
    <div className="flex items-center gap-3 rounded-2xl border border-border bg-card p-3 shadow-sm">
      <Link href={`/profiles/${match.id}`} className="relative h-12 w-12 shrink-0 overflow-hidden rounded-full bg-muted">
        <Image src={match.photos[0]} alt="" fill className="object-cover" sizes="48px" />
      </Link>
      <div className="min-w-0 flex-1">
        <Link href={`/profiles/${match.id}`} className="truncate font-semibold hover:text-primary">
          {match.fullName}
        </Link>
        <p className="truncate text-xs text-muted-foreground">
          {match.city} · {time} · {direction === "sent" ? "Sent" : accepted ? "Accepted" : "New interest"}
        </p>
      </div>
      {direction === "received" && !accepted && onAccept && (
        <Button size="sm" onClick={onAccept}>
          <Heart className="mr-1 h-3.5 w-3.5 fill-current" /> Accept
        </Button>
      )}
      {accepted && (
        <Link href={`/inbox/thread-${match.id}`}>
          <Button size="sm" variant="outline">
            <MessageCircle className="mr-1 h-3.5 w-3.5" /> Chat
          </Button>
        </Link>
      )}
    </div>
  )
}
