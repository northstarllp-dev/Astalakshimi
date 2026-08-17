"use client"

import * as React from "react"
import Image from "next/image"
import Link from "next/link"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { RequireFullPortal } from "@/components/layout/require-full-portal"
import { getMatchById } from "@/lib/matches"
import {
  acceptInterest,
  blockProfile,
  declineInterest,
  deletePrivateNote,
  getRichReceivedInterests,
  getRichSentInterests,
  getMutualMatches,
  ignoreInterest,
  loadBlocked,
  loadPrivateNotes,
  loadShortlist,
  savePrivateNote,
  toggleShortlist,
  unblockProfile,
  unIgnoreInterest,
  withdrawInterest,
  type RichInterestItem,
  type PrivateNotes,
} from "@/lib/user-activity"
import { useInvalidateInterests, useInterestsQuery } from "@/hooks/queries"
import { cn } from "@/lib/utils"
import {
  BadgeCheck,
  Ban,
  BookmarkMinus,
  Check,
  EyeOff,
  Heart,
  HeartHandshake,
  Inbox,
  MessageSquarePlus,
  MapPin,
  MoreHorizontal,
  NotebookPen,
  Phone,
  Send,
  ShieldOff,
  Sparkles,
  Star,
  Trash2,
  Undo2,
  X,
} from "lucide-react"

// ──────────────────────────────────────────────
// Types
// ──────────────────────────────────────────────
type Tab = "received" | "sent" | "mutual" | "shortlisted" | "blocked"

const TABS: { id: Tab; label: string; icon: React.ElementType }[] = [
  { id: "received", label: "Received", icon: Inbox },
  { id: "sent", label: "Sent", icon: Send },
  { id: "mutual", label: "Matches", icon: HeartHandshake },
  { id: "shortlisted", label: "Shortlisted", icon: Star },
  { id: "blocked", label: "Blocked", icon: Ban },
]

// ──────────────────────────────────────────────
// Confetti burst component (purely decorative)
// ──────────────────────────────────────────────
const CONFETTI_COLORS = ["#b8901f", "#e8c84a", "#7c1535", "#0d4f42", "#d4a843", "#067647", "#fff"]

function ConfettiBurst({ active }: { active: boolean }) {
  const pieces = React.useMemo(
    () =>
      Array.from({ length: 22 }, (_, i) => ({
        key: i,
        color: CONFETTI_COLORS[i % CONFETTI_COLORS.length]!,
        left: `${8 + Math.random() * 84}%`,
        top: `${Math.random() * 60}%`,
        delay: `${Math.random() * 0.5}s`,
        size: `${6 + Math.floor(Math.random() * 6)}px`,
      })),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [active]
  )

  if (!active) return null
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden rounded-2xl" aria-hidden>
      {pieces.map((p) => (
        <span
          key={p.key}
          className="confetti-piece"
          style={{
            left: p.left,
            top: p.top,
            backgroundColor: p.color,
            width: p.size,
            height: p.size,
            animationDelay: p.delay,
          }}
        />
      ))}
    </div>
  )
}

// ──────────────────────────────────────────────
// Profile mini-card (shared)
// ──────────────────────────────────────────────
function ProfileAvatar({ profileId, size = 56 }: { profileId: string; size?: number }) {
  const match = getMatchById(profileId)
  const photo = match?.photos[0]
  const initials = match?.fullName?.[0] ?? "?"
  return (
    <div
      className="relative shrink-0 overflow-hidden rounded-full border-2 border-border bg-muted"
      style={{ width: size, height: size }}
    >
      {photo ? (
        <Image src={photo} alt={match?.fullName ?? ""} fill className="object-cover object-[center_10%]" sizes="80px" />
      ) : (
        <span className="flex h-full w-full items-center justify-center font-serif text-lg font-bold text-primary">
          {initials}
        </span>
      )}
    </div>
  )
}

function ProfileMeta({ profileId }: { profileId: string }) {
  const match = getMatchById(profileId)
  if (!match) return null
  return (
    <div className="min-w-0">
      <p className="truncate font-serif text-base font-bold text-foreground">{match.fullName}, {match.age}</p>
      <p className="mt-0.5 flex items-center gap-1 truncate text-xs text-muted-foreground">
        <MapPin className="h-3 w-3 shrink-0" />
        {match.city} · {match.community} · {match.occupation}
      </p>
      {match.photoVerified && (
        <span className="mt-1 inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-700">
          <BadgeCheck className="h-3 w-3" /> Verified
        </span>
      )}
    </div>
  )
}

// ──────────────────────────────────────────────
// Private Note Modal
// ──────────────────────────────────────────────
function PrivateNoteModal({
  profileId,
  initialNote,
  onSave,
  onClose,
}: {
  profileId: string
  initialNote: string
  onSave: (note: string) => void
  onClose: () => void
}) {
  const [text, setText] = React.useState(initialNote)
  const match = getMatchById(profileId)

  return (
    <div className="fixed inset-0 z-[80] flex items-end justify-center bg-black/50 p-0 sm:items-center sm:p-4" role="dialog" aria-modal>
      <button type="button" className="absolute inset-0" onClick={onClose} aria-label="Close" />
      <div className="relative z-10 w-full max-w-md rounded-t-3xl border border-border bg-background p-5 shadow-2xl sm:rounded-3xl">
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <NotebookPen className="h-4 w-4 text-primary" />
            <h2 className="font-serif text-lg font-bold">Private Note</h2>
          </div>
          <button type="button" onClick={onClose} className="tap-target rounded-full border border-border" aria-label="Close">
            <X className="h-4 w-4" />
          </button>
        </div>
        {match && (
          <p className="mb-3 text-sm text-muted-foreground">
            Note for <span className="font-semibold text-foreground">{match.fullName}</span> — only you can see this.
          </p>
        )}
        <textarea
          autoFocus
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="e.g. Met at Pongal event 2025. Families seem compatible."
          className="h-28 w-full resize-none rounded-xl border border-border bg-muted p-3 text-sm outline-none focus:border-primary"
        />
        <div className="mt-3 flex gap-2">
          <Button variant="outline" className="flex-1" onClick={onClose}>Cancel</Button>
          <Button className="flex-[1.4]" onClick={() => { onSave(text); onClose() }}>Save note</Button>
        </div>
      </div>
    </div>
  )
}

// ──────────────────────────────────────────────
// Status badge
// ──────────────────────────────────────────────
function StatusBadge({ status }: { status: RichInterestItem["status"] }) {
  const map: Record<RichInterestItem["status"], { label: string; className: string }> = {
    pending:   { label: "Pending",   className: "bg-amber-100 text-amber-800 border-amber-200" },
    accepted:  { label: "Accepted",  className: "bg-emerald-100 text-emerald-800 border-emerald-200" },
    declined:  { label: "Declined",  className: "bg-red-100 text-red-800 border-red-200" },
    ignored:   { label: "Ignored",   className: "bg-slate-100 text-slate-600 border-slate-200" },
    withdrawn: { label: "Withdrawn", className: "bg-slate-100 text-slate-500 border-slate-200" },
  }
  const cfg = map[status]
  return (
    <Badge variant="outline" className={cn("text-[10px] font-bold", cfg.className)}>
      {cfg.label}
    </Badge>
  )
}

// ──────────────────────────────────────────────
// Received interests tab
// ──────────────────────────────────────────────
function ReceivedTab({
  items,
  notes,
  onAccept,
  onDecline,
  onIgnore,
  onUnIgnore,
  onBlock,
  onNoteOpen,
}: {
  items: RichInterestItem[]
  notes: PrivateNotes
  onAccept: (id: string) => void
  onDecline: (id: string) => void
  onIgnore: (id: string) => void
  onUnIgnore: (id: string) => void
  onBlock: (id: string) => void
  onNoteOpen: (id: string) => void
}) {
  const pending = items.filter((i) => i.status === "pending")
  const actioned = items.filter((i) => i.status !== "pending")

  if (items.length === 0) {
    return <EmptyState icon={Inbox} title="No interests received yet" body="Once someone sends you an interest, it will appear here." />
  }

  return (
    <div className="space-y-6">
      {pending.length > 0 && (
        <section>
          <SectionLabel label={`New · ${pending.length}`} />
          <div className="mt-2 space-y-3">
            {pending.map((item) => (
              <ReceivedCard
                key={item.id}
                item={item}
                note={notes[item.profileId]}
                onAccept={onAccept}
                onDecline={onDecline}
                onIgnore={onIgnore}
                onBlock={onBlock}
                onNoteOpen={onNoteOpen}
              />
            ))}
          </div>
        </section>
      )}
      {actioned.length > 0 && (
        <section>
          <SectionLabel label="Previously actioned" />
          <div className="mt-2 space-y-3">
            {actioned.map((item) => (
              <ReceivedCard
                key={item.id}
                item={item}
                note={notes[item.profileId]}
                onAccept={onAccept}
                onDecline={onDecline}
                onIgnore={onIgnore}
                onUnIgnore={onUnIgnore}
                onBlock={onBlock}
                onNoteOpen={onNoteOpen}
              />
            ))}
          </div>
        </section>
      )}
    </div>
  )
}

function ReceivedCard({
  item,
  note,
  onAccept,
  onDecline,
  onIgnore,
  onUnIgnore,
  onBlock,
  onNoteOpen,
}: {
  item: RichInterestItem
  note?: string
  onAccept: (id: string) => void
  onDecline: (id: string) => void
  onIgnore: (id: string) => void
  onUnIgnore?: (id: string) => void
  onBlock: (id: string) => void
  onNoteOpen: (id: string) => void
}) {
  const [menuOpen, setMenuOpen] = React.useState(false)
  const isPending = item.status === "pending"

  return (
    <article className="royal-card relative overflow-hidden p-3.5 sm:p-4 animate-in">
      <div className="flex gap-3">
        <Link href={`/profiles/${item.profileId}`} className="shrink-0">
          <ProfileAvatar profileId={item.profileId} size={56} />
        </Link>
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <ProfileMeta profileId={item.profileId} />
            <div className="flex shrink-0 items-center gap-1.5">
              <StatusBadge status={item.status} />
              <span className="text-[10px] text-muted-foreground whitespace-nowrap">{item.time}</span>
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setMenuOpen((v) => !v)}
                  className="tap-target flex items-center justify-center rounded-full hover:bg-muted"
                  aria-label="More options"
                >
                  <MoreHorizontal className="h-4 w-4 text-muted-foreground" />
                </button>
                {menuOpen && (
                  <>
                    <button type="button" className="fixed inset-0 z-10" onClick={() => setMenuOpen(false)} aria-label="Close menu" />
                    <div className="absolute right-0 top-full z-20 mt-1 min-w-[160px] rounded-xl border border-border bg-card p-1 shadow-lg">
                      <MenuAction icon={NotebookPen} label={note ? "Edit note" : "Add private note"} onClick={() => { setMenuOpen(false); onNoteOpen(item.profileId) }} />
                      <MenuAction icon={Ban} label="Block profile" onClick={() => { setMenuOpen(false); onBlock(item.profileId) }} destructive />
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>

          {item.message && (
            <p className="mt-1.5 rounded-lg bg-muted/60 px-2.5 py-1.5 text-xs italic text-muted-foreground">
              &ldquo;{item.message}&rdquo;
            </p>
          )}

          {note && (
            <button
              type="button"
              onClick={() => onNoteOpen(item.profileId)}
              className="mt-1.5 flex items-center gap-1 rounded-md bg-secondary/10 px-2 py-1 text-[10px] font-semibold text-secondary hover:bg-secondary/20"
            >
              <NotebookPen className="h-3 w-3" />
              {note.length > 40 ? note.slice(0, 40) + "…" : note}
            </button>
          )}

          {isPending && (
            <div className="mt-3 flex flex-wrap gap-2">
              <Button
                size="sm"
                className="h-8 gap-1 px-3 text-xs"
                onClick={() => onAccept(item.profileId)}
              >
                <Check className="h-3.5 w-3.5" /> Accept
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="h-8 gap-1 px-3 text-xs"
                onClick={() => onDecline(item.profileId)}
              >
                <X className="h-3.5 w-3.5" /> Decline
              </Button>
              <Button
                size="sm"
                variant="ghost"
                className="h-8 gap-1 border border-border px-3 text-xs text-muted-foreground"
                onClick={() => onIgnore(item.profileId)}
              >
                <EyeOff className="h-3.5 w-3.5" /> Ignore
              </Button>
            </div>
          )}
          {item.status === "ignored" && onUnIgnore && (
            <button
              type="button"
              onClick={() => onUnIgnore(item.profileId)}
              className="mt-2 flex items-center gap-1 text-xs font-semibold text-primary hover:underline"
            >
              <Undo2 className="h-3.5 w-3.5" /> Undo ignore
            </button>
          )}
          {item.status === "accepted" && (
            <Link href="/inbox" className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-emerald-700 hover:underline">
              <MessageSquarePlus className="h-3.5 w-3.5" /> Go to chat
            </Link>
          )}
        </div>
      </div>
    </article>
  )
}

// ──────────────────────────────────────────────
// Sent interests tab
// ──────────────────────────────────────────────
function SentTab({
  items,
  notes,
  onWithdraw,
  onNoteOpen,
}: {
  items: RichInterestItem[]
  notes: PrivateNotes
  onWithdraw: (id: string) => void
  onNoteOpen: (id: string) => void
}) {
  if (items.length === 0) {
    return (
      <EmptyState
        icon={Send}
        title="No interests sent yet"
        body="Browse profiles and tap 'Connect' to send an interest."
        cta={{ label: "Discover profiles", href: "/dashboard" }}
      />
    )
  }

  return (
    <div className="space-y-3">
      {items.map((item) => (
        <article key={item.id} className="royal-card relative p-3.5 sm:p-4 animate-in">
          <div className="flex gap-3">
            <Link href={`/profiles/${item.profileId}`} className="shrink-0">
              <ProfileAvatar profileId={item.profileId} size={56} />
            </Link>
            <div className="min-w-0 flex-1">
              <div className="flex items-start justify-between gap-2">
                <ProfileMeta profileId={item.profileId} />
                <div className="flex shrink-0 flex-col items-end gap-1">
                  <StatusBadge status={item.status} />
                  <span className="text-[10px] text-muted-foreground">{item.time}</span>
                </div>
              </div>

              {notes[item.profileId] && (
                <button
                  type="button"
                  onClick={() => onNoteOpen(item.profileId)}
                  className="mt-1.5 flex items-center gap-1 rounded-md bg-secondary/10 px-2 py-1 text-[10px] font-semibold text-secondary hover:bg-secondary/20"
                >
                  <NotebookPen className="h-3 w-3" />
                  {notes[item.profileId]!.length > 40 ? notes[item.profileId]!.slice(0, 40) + "…" : notes[item.profileId]}
                </button>
              )}

              <div className="mt-3 flex flex-wrap gap-2">
                {item.status === "pending" && (
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-8 gap-1 border border-border px-3 text-xs text-muted-foreground hover:text-destructive"
                    onClick={() => onWithdraw(item.profileId)}
                  >
                    <Undo2 className="h-3.5 w-3.5" /> Withdraw
                  </Button>
                )}
                {item.status === "accepted" && (
                  <Link href="/inbox" className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-700 hover:underline">
                    <MessageSquarePlus className="h-3.5 w-3.5" /> Go to chat
                  </Link>
                )}
                <button
                  type="button"
                  onClick={() => onNoteOpen(item.profileId)}
                  className="h-8 rounded-lg px-3 text-xs font-semibold text-muted-foreground hover:bg-muted"
                >
                  <NotebookPen className="mr-1 inline h-3 w-3" />
                  {notes[item.profileId] ? "Edit note" : "Add note"}
                </button>
              </div>
            </div>
          </div>
        </article>
      ))}
    </div>
  )
}

// ──────────────────────────────────────────────
// Mutual matches tab (celebration!)
// ──────────────────────────────────────────────
function MutualTab({
  items,
  notes,
  onNoteOpen,
}: {
  items: RichInterestItem[]
  notes: PrivateNotes
  onNoteOpen: (id: string) => void
}) {
  const [celebrated, setCelebrated] = React.useState(false)

  React.useEffect(() => {
    if (items.length > 0) {
      const timer = setTimeout(() => setCelebrated(true), 100)
      return () => clearTimeout(timer)
    }
  }, [items.length])

  if (items.length === 0) {
    return (
      <EmptyState
        icon={HeartHandshake}
        title="No mutual matches yet"
        body="When both of you accept each other's interest, a mutual match is created and chat is unlocked."
        cta={{ label: "Browse profiles", href: "/dashboard" }}
      />
    )
  }

  return (
    <div className="space-y-4">
      {/* Celebration banner */}
      <div className="relative overflow-hidden rounded-2xl match-banner px-5 py-5 text-center text-white shadow-lg animate-match-pop">
        <ConfettiBurst active={celebrated} />
        <div className="relative z-10">
          <div className="mx-auto mb-2 flex h-14 w-14 items-center justify-center rounded-full bg-white/20 ring-4 ring-white/30">
            <HeartHandshake className="h-7 w-7 text-white" />
          </div>
          <p className="text-xs font-bold uppercase tracking-widest text-white/70">It&apos;s a Match!</p>
          <h2 className="mt-0.5 font-serif text-2xl font-bold">
            {items.length} Mutual Connection{items.length !== 1 ? "s" : ""}
          </h2>
          <p className="mt-1 text-sm text-white/80">Chat is now unlocked. Start the conversation.</p>
        </div>
      </div>

      {/* Match cards */}
      <div className="space-y-3">
        {items.map((item) => {
          const match = getMatchById(item.profileId)
          if (!match) return null
          return (
            <article
              key={item.id}
              className="relative overflow-hidden rounded-2xl border-2 border-emerald-200 bg-card shadow-sm animate-match-pop"
            >
              {/* Green top accent */}
              <div className="h-1 w-full bg-gradient-to-r from-emerald-400 via-emerald-500 to-emerald-400" />
              <div className="p-3.5 sm:p-4">
                <div className="flex gap-3">
                  <Link href={`/profiles/${item.profileId}`} className="shrink-0">
                    <div className="relative">
                      <ProfileAvatar profileId={item.profileId} size={64} />
                      <span className="absolute -bottom-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-emerald-500 ring-2 ring-white">
                        <Heart className="h-2.5 w-2.5 fill-white text-white" />
                      </span>
                    </div>
                  </Link>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="truncate font-serif text-base font-bold">{match.fullName}, {match.age}</p>
                          <Badge className="shrink-0 bg-emerald-500 text-[10px] font-bold text-white border-transparent">
                            <Sparkles className="h-2.5 w-2.5 mr-0.5" /> Match
                          </Badge>
                        </div>
                        <p className="mt-0.5 flex items-center gap-1 truncate text-xs text-muted-foreground">
                          <MapPin className="h-3 w-3 shrink-0" />
                          {match.city} · {match.community}
                        </p>
                      </div>
                      <span className="shrink-0 text-[10px] text-muted-foreground">{item.time}</span>
                    </div>

                    {notes[item.profileId] && (
                      <button
                        type="button"
                        onClick={() => onNoteOpen(item.profileId)}
                        className="mt-1.5 flex items-center gap-1 rounded-md bg-secondary/10 px-2 py-1 text-[10px] font-semibold text-secondary hover:bg-secondary/20"
                      >
                        <NotebookPen className="h-3 w-3" />
                        {notes[item.profileId]!.length > 40 ? notes[item.profileId]!.slice(0, 40) + "…" : notes[item.profileId]}
                      </button>
                    )}

                    <div className="mt-3 flex flex-wrap gap-2">
                      <Link href="/inbox">
                        <Button size="sm" className="h-8 gap-1.5 bg-emerald-600 px-3 text-xs hover:bg-emerald-700">
                          <MessageSquarePlus className="h-3.5 w-3.5" /> Start chat
                        </Button>
                      </Link>
                      <Link href={`/profiles/${item.profileId}`}>
                        <Button size="sm" variant="outline" className="h-8 px-3 text-xs">
                          View profile
                        </Button>
                      </Link>
                      <button
                        type="button"
                        onClick={() => onNoteOpen(item.profileId)}
                        className="h-8 rounded-lg px-3 text-xs font-semibold text-muted-foreground hover:bg-muted"
                      >
                        <NotebookPen className="mr-1 inline h-3 w-3" />
                        {notes[item.profileId] ? "Edit note" : "Add note"}
                      </button>
                      <button
                        type="button"
                        className="h-8 rounded-lg px-3 text-xs font-semibold text-muted-foreground hover:bg-muted"
                        title="Share contact (Premium)"
                      >
                        <Phone className="mr-1 inline h-3 w-3" />
                        <Sparkles className="mr-0.5 inline h-3 w-3 text-secondary" />
                        Share contact
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </article>
          )
        })}
      </div>
    </div>
  )
}

// ──────────────────────────────────────────────
// Shortlisted tab
// ──────────────────────────────────────────────
function ShortlistedTab({
  ids,
  notes,
  onRemove,
  onNoteOpen,
}: {
  ids: string[]
  notes: PrivateNotes
  onRemove: (id: string) => void
  onNoteOpen: (id: string) => void
}) {
  if (ids.length === 0) {
    return (
      <EmptyState
        icon={Star}
        title="Your watchlist is empty"
        body="Bookmark profiles with the ★ icon. They won't be notified — it's your private watchlist."
        cta={{ label: "Browse profiles", href: "/dashboard" }}
      />
    )
  }

  return (
    <div>
      <p className="mb-3 text-xs text-muted-foreground">
        <span className="font-semibold text-foreground">{ids.length}</span> saved profiles · Private — they are not notified
      </p>
      <div className="space-y-3">
        {ids.map((profileId) => {
          const match = getMatchById(profileId)
          if (!match) return null
          return (
            <article key={profileId} className="royal-card p-3.5 sm:p-4 animate-in">
              <div className="flex gap-3">
                <Link href={`/profiles/${profileId}`} className="shrink-0">
                  <ProfileAvatar profileId={profileId} size={56} />
                </Link>
                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-2">
                    <ProfileMeta profileId={profileId} />
                    <button
                      type="button"
                      onClick={() => onRemove(profileId)}
                      className="tap-target flex shrink-0 items-center justify-center rounded-full hover:bg-muted"
                      aria-label="Remove from shortlist"
                    >
                      <BookmarkMinus className="h-4 w-4 text-muted-foreground hover:text-destructive" />
                    </button>
                  </div>

                  {notes[profileId] && (
                    <button
                      type="button"
                      onClick={() => onNoteOpen(profileId)}
                      className="mt-1.5 flex items-center gap-1 rounded-md bg-secondary/10 px-2 py-1 text-[10px] font-semibold text-secondary hover:bg-secondary/20"
                    >
                      <NotebookPen className="h-3 w-3" />
                      {notes[profileId]!.length > 40 ? notes[profileId]!.slice(0, 40) + "…" : notes[profileId]}
                    </button>
                  )}

                  <div className="mt-3 flex flex-wrap gap-2">
                    <Link href={`/profiles/${profileId}`}>
                      <Button size="sm" variant="outline" className="h-8 px-3 text-xs">View profile</Button>
                    </Link>
                    <button
                      type="button"
                      onClick={() => onNoteOpen(profileId)}
                      className="h-8 rounded-lg px-3 text-xs font-semibold text-muted-foreground hover:bg-muted"
                    >
                      <NotebookPen className="mr-1 inline h-3 w-3" />
                      {notes[profileId] ? "Edit note" : "Add note"}
                    </button>
                  </div>
                </div>
              </div>
            </article>
          )
        })}
      </div>
    </div>
  )
}

// ──────────────────────────────────────────────
// Blocked tab
// ──────────────────────────────────────────────
function BlockedTab({
  ids,
  onUnblock,
}: {
  ids: string[]
  onUnblock: (id: string) => void
}) {
  if (ids.length === 0) {
    return (
      <EmptyState
        icon={ShieldOff}
        title="No blocked profiles"
        body="Profiles you block will appear here. Blocked members cannot see your profile."
      />
    )
  }

  return (
    <div>
      <p className="mb-3 rounded-xl bg-muted/60 px-3 py-2 text-xs text-muted-foreground">
        Blocked members cannot see your profile, send interests, or message you.
      </p>
      <div className="space-y-3">
        {ids.map((profileId) => {
          const match = getMatchById(profileId)
          return (
            <article key={profileId} className="royal-card p-3.5 sm:p-4 animate-in opacity-70">
              <div className="flex gap-3">
                <div className="relative shrink-0">
                  <ProfileAvatar profileId={profileId} size={48} />
                  <span className="absolute -bottom-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-destructive ring-2 ring-card">
                    <Ban className="h-2.5 w-2.5 text-white" />
                  </span>
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-semibold text-foreground">
                    {match?.fullName ?? "Unknown profile"}
                    {match && <span className="ml-1 text-muted-foreground font-normal">, {match.age}</span>}
                  </p>
                  {match && (
                    <p className="text-xs text-muted-foreground">{match.city} · {match.community}</p>
                  )}
                  <button
                    type="button"
                    onClick={() => onUnblock(profileId)}
                    className="mt-2 flex items-center gap-1 text-xs font-semibold text-primary hover:underline"
                  >
                    <Trash2 className="h-3.5 w-3.5" /> Unblock
                  </button>
                </div>
              </div>
            </article>
          )
        })}
      </div>
    </div>
  )
}

// ──────────────────────────────────────────────
// Empty state
// ──────────────────────────────────────────────
function EmptyState({
  icon: Icon,
  title,
  body,
  cta,
}: {
  icon: React.ElementType
  title: string
  body: string
  cta?: { label: string; href: string }
}) {
  return (
    <div className="rounded-2xl border border-dashed border-border bg-card px-6 py-16 text-center animate-in">
      <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-muted">
        <Icon className="h-7 w-7 text-muted-foreground" />
      </div>
      <p className="mt-3 font-serif text-lg font-bold text-foreground">{title}</p>
      <p className="mt-1 text-sm text-muted-foreground">{body}</p>
      {cta && (
        <Link href={cta.href}>
          <Button className="mt-5">{cta.label}</Button>
        </Link>
      )}
    </div>
  )
}

// ──────────────────────────────────────────────
// Section label
// ──────────────────────────────────────────────
function SectionLabel({ label }: { label: string }) {
  return (
    <p className="royal-label">{label}</p>
  )
}

// ──────────────────────────────────────────────
// Menu action item
// ──────────────────────────────────────────────
function MenuAction({
  icon: Icon,
  label,
  onClick,
  destructive = false,
}: {
  icon: React.ElementType
  label: string
  onClick: () => void
  destructive?: boolean
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm font-medium hover:bg-muted",
        destructive ? "text-destructive" : "text-foreground"
      )}
    >
      <Icon className="h-3.5 w-3.5 shrink-0" />
      {label}
    </button>
  )
}

// ──────────────────────────────────────────────
// Main page
// ──────────────────────────────────────────────
export default function InterestsPage() {
  return (
    <RequireFullPortal>
      <InterestsPageInner />
    </RequireFullPortal>
  )
}

function InterestsPageInner() {
  const [activeTab, setActiveTab] = React.useState<Tab>("received")
  const { data } = useInterestsQuery()
  const invalidate = useInvalidateInterests()
  const received = data?.received ?? []
  const sent = data?.sent ?? []
  const mutual = data?.mutual ?? []
  const shortlisted = data?.shortlisted ?? []
  const blocked = data?.blocked ?? []
  const notes = data?.notes ?? {}
  const [noteTarget, setNoteTarget] = React.useState<string | null>(null)

  const reload = invalidate

  // Badges
  const pendingReceived = received.filter((i) => i.status === "pending").length
  const mutualCount = mutual.length

  // Actions
  const handleAccept = (profileId: string) => {
    acceptInterest(profileId)
    reload()
  }
  const handleDecline = (profileId: string) => {
    declineInterest(profileId)
    reload()
  }
  const handleIgnore = (profileId: string) => {
    ignoreInterest(profileId)
    reload()
  }
  const handleUnIgnore = (profileId: string) => {
    unIgnoreInterest(profileId)
    reload()
  }
  const handleBlock = (profileId: string) => {
    blockProfile(profileId)
    reload()
  }
  const handleUnblock = (profileId: string) => {
    unblockProfile(profileId)
    reload()
  }
  const handleWithdraw = (profileId: string) => {
    withdrawInterest(profileId)
    reload()
  }
  const handleRemoveShortlist = (profileId: string) => {
    toggleShortlist(profileId)
    reload()
  }
  const handleSaveNote = (note: string) => {
    if (!noteTarget) return
    if (note.trim()) {
      savePrivateNote(noteTarget, note)
    } else {
      deletePrivateNote(noteTarget)
    }
    reload()
  }

  return (
    <main className="mx-auto max-w-2xl px-3 py-5 sm:px-4 md:py-8">
      {/* ── Page header ── */}
      <div className="mb-5">
        <p className="royal-label">Your relationship CRM</p>
        <h1 className="mt-0.5 font-serif text-3xl font-bold tracking-tight">Interests</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Track every connection — received, sent, matched, saved, and more.
        </p>
      </div>

      {/* ── Tab bar ── */}
      <nav
        className="mb-6 flex overflow-x-auto hide-scrollbar rounded-2xl border border-border bg-card p-1 gap-0.5"
        role="tablist"
        aria-label="Interests sections"
      >
        {TABS.map((tab) => {
          const badge =
            tab.id === "received" && pendingReceived > 0
              ? pendingReceived
              : tab.id === "mutual" && mutualCount > 0
                ? mutualCount
                : tab.id === "shortlisted"
                  ? shortlisted.length
                  : tab.id === "blocked"
                    ? blocked.length
                    : 0

          const isActive = activeTab === tab.id
          const Icon = tab.icon

          return (
            <button
              key={tab.id}
              type="button"
              role="tab"
              aria-selected={isActive}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                "relative flex flex-1 flex-col items-center gap-0.5 rounded-xl px-2 py-2 text-[11px] font-semibold transition-all whitespace-nowrap min-w-[60px]",
                isActive
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted/60"
              )}
            >
              <Icon className="h-4 w-4 shrink-0" />
              {tab.label}
              {badge > 0 && (
                <span
                  className={cn(
                    "absolute -right-0.5 -top-0.5 flex h-4 w-4 items-center justify-center rounded-full text-[9px] font-bold",
                    isActive
                      ? "bg-white text-primary"
                      : tab.id === "mutual"
                        ? "bg-emerald-500 text-white"
                        : "bg-primary text-white"
                  )}
                >
                  {badge > 9 ? "9+" : badge}
                </span>
              )}
            </button>
          )
        })}
      </nav>

      {/* ── Tab content ── */}
      <div role="tabpanel" aria-label={activeTab}>
        {activeTab === "received" && (
          <ReceivedTab
            items={received}
            notes={notes}
            onAccept={handleAccept}
            onDecline={handleDecline}
            onIgnore={handleIgnore}
            onUnIgnore={handleUnIgnore}
            onBlock={handleBlock}
            onNoteOpen={setNoteTarget}
          />
        )}
        {activeTab === "sent" && (
          <SentTab
            items={sent}
            notes={notes}
            onWithdraw={handleWithdraw}
            onNoteOpen={setNoteTarget}
          />
        )}
        {activeTab === "mutual" && (
          <MutualTab
            items={mutual}
            notes={notes}
            onNoteOpen={setNoteTarget}
          />
        )}
        {activeTab === "shortlisted" && (
          <ShortlistedTab
            ids={shortlisted}
            notes={notes}
            onRemove={handleRemoveShortlist}
            onNoteOpen={setNoteTarget}
          />
        )}
        {activeTab === "blocked" && (
          <BlockedTab
            ids={blocked}
            onUnblock={handleUnblock}
          />
        )}
      </div>

      {/* ── Private note modal ── */}
      {noteTarget && (
        <PrivateNoteModal
          profileId={noteTarget}
          initialNote={notes[noteTarget] ?? ""}
          onSave={handleSaveNote}
          onClose={() => setNoteTarget(null)}
        />
      )}
    </main>
  )
}
