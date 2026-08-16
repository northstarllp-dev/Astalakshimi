"use client"

import * as React from "react"
import Image from "next/image"
import Link from "next/link"
import { useParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { getMatchById } from "@/lib/matches"
import { getThreadMessages } from "@/lib/user-activity"
import { ArrowLeft, Send } from "lucide-react"
import { cn } from "@/lib/utils"

export default function ThreadPage() {
  const params = useParams<{ threadId: string }>()
  const threadId = params.threadId
  const profileId = threadId.replace("thread-", "")
  const match = getMatchById(profileId)
  const [messages, setMessages] = React.useState(() => getThreadMessages(threadId))
  const [draft, setDraft] = React.useState("")

  if (!match) {
    return (
      <main className="mx-auto max-w-lg px-4 py-10 text-center">
        <p className="font-semibold">Conversation not found</p>
        <Link href="/inbox">
          <Button className="mt-4">Back to inbox</Button>
        </Link>
      </main>
    )
  }

  const send = () => {
    const text = draft.trim()
    if (!text) return
    setMessages((prev) => [...prev, { id: String(Date.now()), from: "me", text, time: "Just now" }])
    setDraft("")
  }

  return (
    <main className="mx-auto flex max-w-lg flex-col px-3 py-4 sm:px-4" style={{ minHeight: "calc(100dvh - 8rem)" }}>
      <div className="mb-4 flex items-center gap-3">
        <Link
          href="/inbox"
          className="tap-target inline-flex items-center justify-center rounded-full border border-border bg-card"
          aria-label="Back"
        >
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <Link href={`/profiles/${match.id}`} className="flex min-w-0 items-center gap-3">
          <div className="relative h-10 w-10 overflow-hidden rounded-full bg-muted">
            <Image src={match.photos[0]} alt="" fill className="object-cover" sizes="40px" />
          </div>
          <div className="min-w-0">
            <p className="truncate font-semibold">{match.fullName}</p>
            <p className="truncate text-xs text-muted-foreground">{match.city}</p>
          </div>
        </Link>
      </div>

      <div className="flex-1 space-y-3 overflow-y-auto rounded-2xl border border-border bg-card p-4">
        {messages.map((m) => (
          <div
            key={m.id}
            className={cn("flex", m.from === "me" ? "justify-end" : "justify-start")}
          >
            <div
              className={cn(
                "max-w-[80%] rounded-2xl px-3.5 py-2 text-sm",
                m.from === "me" ? "bg-primary text-primary-foreground" : "bg-muted text-foreground"
              )}
            >
              <p>{m.text}</p>
              <p className={cn("mt-1 text-[10px]", m.from === "me" ? "text-white/70" : "text-muted-foreground")}>
                {m.time}
              </p>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-3 flex gap-2">
        <Input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="Write a message…"
          onKeyDown={(e) => {
            if (e.key === "Enter") send()
          }}
        />
        <Button size="icon" onClick={send} aria-label="Send">
          <Send className="h-4 w-4" />
        </Button>
      </div>
    </main>
  )
}
