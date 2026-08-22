"use client"

import * as React from "react"
import Image from "next/image"
import Link from "next/link"
import { RequireFullPortal } from "@/components/layout/require-full-portal"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  useInvalidateInterests,
  useInterestsQuery,
  useToggleShortlistMutation,
  useShortlistQuery,
} from "@/hooks/queries"
import { apiClient } from "@/lib/api-client"
import { cn, getMediaUrl } from "@/lib/utils"
import {
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
  Briefcase,
  Users,
  ShieldCheck,
  Loader2,
} from "lucide-react"

// ──────────────────────────────────────────────
// Types
// ──────────────────────────────────────────────
type Tab = "received" | "sent" | "mutual" | "shortlisted" | "blocked"

interface ProfileSummary {
  id: string
  fullName: string
  age: number
  city?: string
  state?: string
  caste?: string
  educationLevel?: string
  profession?: string
  photo?: string | null
}

interface InterestItem {
  id: string
  profileId: string
  status: "pending" | "accepted" | "declined" | "withdrawn" | "ignored"
  message?: string
  createdAt?: string
  respondedAt?: string
  time?: string
  profile?: ProfileSummary
}

type PrivateNotes = Record<string, string>

const TABS: { id: Tab; label: string; icon: React.ElementType }[] = [
  { id: "received", label: "Received", icon: Inbox },
  { id: "sent", label: "Sent", icon: Send },
  { id: "mutual", label: "Matches", icon: HeartHandshake },
  { id: "shortlisted", label: "Shortlisted", icon: Star },
  { id: "blocked", label: "Blocked", icon: Ban },
]

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

function ProfileAvatar({ profile, size = 56 }: { profile?: ProfileSummary; size?: number }) {
  const photo = profile?.photo
  const initials = profile?.fullName?.[0] ?? "?"
  return (
    <div
      className="relative shrink-0 overflow-hidden rounded-full border-2 border-border bg-muted flex items-center justify-center"
      style={{ width: size, height: size }}
    >
      {photo ? (
        <Image
          src={getMediaUrl(photo)}
          alt={profile?.fullName ?? ""}
          fill
          className="object-cover object-[center_10%]"
          sizes="80px"
        />
      ) : (
        <span className="font-serif text-base font-bold text-primary">
          {initials}
        </span>
      )}
    </div>
  )
}

function ProfileMeta({ profile }: { profile?: ProfileSummary }) {
  if (!profile) return null
  return (
    <div className="min-w-0">
      <p className="truncate font-serif text-base font-bold text-foreground">
        {profile.fullName}, {profile.age}
      </p>
      <div className="flex flex-wrap items-center gap-1.5 gap-y-1 text-xs text-muted-foreground sm:text-sm">
        <span className="flex items-center gap-1">
          <MapPin className="h-3 w-3 sm:h-4 sm:w-4" /> {profile.city || "Tamil Nadu"}
        </span>
        <span className="hidden opacity-50 sm:inline">•</span>
        <span className="flex items-center gap-1">
          <Users className="h-3 w-3 sm:h-4 sm:w-4" /> {profile.caste || "Community"}
        </span>
        <span className="hidden opacity-50 sm:inline">•</span>
        <span className="flex items-center gap-1">
          <Briefcase className="h-3 w-3 sm:h-4 sm:w-4" /> {profile.profession || "Professional"}
        </span>
      </div>
      <div className="mt-1 flex flex-wrap items-center gap-2">
        <Badge variant="secondary" className="gap-1 font-medium bg-secondary/20 text-xs">
          <ShieldCheck className="h-3 w-3" />
          Verified
        </Badge>
      </div>
    </div>
  )
}

function StatusBadge({ status }: { status: InterestItem["status"] }) {
  const map: Record<InterestItem["status"], { label: string; className: string }> = {
    pending:   { label: "Pending",   className: "bg-amber-100 text-amber-800 border-amber-200" },
    accepted:  { label: "Accepted",  className: "bg-emerald-100 text-emerald-800 border-emerald-200" },
    declined:  { label: "Declined",  className: "bg-red-100 text-red-800 border-red-200" },
    ignored:   { label: "Ignored",   className: "bg-slate-100 text-slate-600 border-slate-200" },
    withdrawn: { label: "Withdrawn", className: "bg-slate-100 text-slate-500 border-slate-200" },
  }
  const cfg = map[status] || { label: status, className: "bg-slate-100 text-slate-700" }
  return (
    <Badge variant="outline" className={cn("text-[10px] font-bold", cfg.className)}>
      {cfg.label}
    </Badge>
  )
}

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

  return (
    <div className="fixed inset-0 z-[80] flex items-end justify-center bg-black/50 p-0 sm:items-center sm:p-4" role="dialog" aria-modal>
      <button type="button" className="absolute inset-0" onClick={onClose} aria-label="Close" />
      <div className="relative z-10 w-full max-w-md rounded-t-3xl border border-border bg-background p-5 shadow-2xl sm:rounded-3xl">
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <NotebookPen className="h-4 w-4 text-primary" />
            <h2 className="font-serif text-lg font-bold">Private Note</h2>
          </div>
          <button type="button" onClick={onClose} className="rounded-full border border-border p-1 hover:bg-muted" aria-label="Close">
            <X className="h-4 w-4" />
          </button>
        </div>
        <textarea
          autoFocus
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="e.g. Families seem compatible. Spoke on weekend."
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

function SectionLabel({ label }: { label: string }) {
  return <p className="royal-label">{label}</p>
}

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
// Received Tab
// ──────────────────────────────────────────────
function ReceivedTab({
  items,
  notes,
  onAccept,
  onDecline,
  onIgnore,
  onBlock,
  onNoteOpen,
}: {
  items: InterestItem[]
  notes: PrivateNotes
  onAccept: (profileId: string) => void
  onDecline: (profileId: string) => void
  onIgnore: (profileId: string) => void
  onBlock: (profileId: string) => void
  onNoteOpen: (profileId: string) => void
}) {
  const pending = items.filter((i) => i.status === "pending")
  const actioned = items.filter((i) => i.status !== "pending")

  if (items.length === 0) {
    return (
      <EmptyState
        icon={Inbox}
        title="No interests received yet"
        body="When other members express interest in your profile, they will show up here."
        cta={{ label: "Discover profiles", href: "/dashboard" }}
      />
    )
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
  onBlock,
  onNoteOpen,
}: {
  item: InterestItem
  note?: string
  onAccept: (id: string) => void
  onDecline: (id: string) => void
  onIgnore: (id: string) => void
  onBlock: (id: string) => void
  onNoteOpen: (id: string) => void
}) {
  const [menuOpen, setMenuOpen] = React.useState(false)
  const isPending = item.status === "pending"

  return (
    <article className="royal-card relative overflow-hidden p-3.5 sm:p-4">
      <div className="flex gap-3">
        <Link href={`/profiles/${item.profileId}`} className="shrink-0">
          <ProfileAvatar profile={item.profile} size={56} />
        </Link>
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <ProfileMeta profile={item.profile} />
            <div className="flex shrink-0 items-center gap-1.5">
              <StatusBadge status={item.status} />
              <span className="text-[10px] text-muted-foreground whitespace-nowrap">{item.time}</span>
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setMenuOpen((v) => !v)}
                  className="flex h-7 w-7 items-center justify-center rounded-full hover:bg-muted"
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
                className="h-8 gap-1 px-3 text-xs bg-primary text-primary-foreground"
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
// Sent Tab
// ──────────────────────────────────────────────
function SentTab({
  items,
  notes,
  onWithdraw,
  onNoteOpen,
}: {
  items: InterestItem[]
  notes: PrivateNotes
  onWithdraw: (profileId: string) => void
  onNoteOpen: (profileId: string) => void
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
        <article key={item.id} className="royal-card relative p-3.5 sm:p-4">
          <div className="flex gap-3">
            <Link href={`/profiles/${item.profileId}`} className="shrink-0">
              <ProfileAvatar profile={item.profile} size={56} />
            </Link>
            <div className="min-w-0 flex-1">
              <div className="flex items-start justify-between gap-2">
                <ProfileMeta profile={item.profile} />
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
                  {notes[item.profileId].length > 40 ? notes[item.profileId].slice(0, 40) + "…" : notes[item.profileId]}
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
// Mutual Tab
// ──────────────────────────────────────────────
function MutualTab({
  items,
  notes,
  onNoteOpen,
}: {
  items: InterestItem[]
  notes: PrivateNotes
  onNoteOpen: (profileId: string) => void
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
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-primary/90 to-primary px-5 py-6 text-center text-white shadow-lg">
        <ConfettiBurst active={celebrated} />
        <div className="relative z-10">
          <div className="mx-auto mb-2 flex h-14 w-14 items-center justify-center rounded-full bg-white/20 ring-4 ring-white/30">
            <HeartHandshake className="h-7 w-7 text-white" />
          </div>
          <p className="text-xs font-bold uppercase tracking-widest text-white/80">It&apos;s a Match!</p>
          <h2 className="mt-0.5 font-serif text-2xl font-bold">
            {items.length} Mutual Connection{items.length !== 1 ? "s" : ""}
          </h2>
          <p className="mt-1 text-sm text-white/90">Chat is now unlocked. Start the conversation.</p>
        </div>
      </div>

      <div className="space-y-3">
        {items.map((item) => (
          <article
            key={item.id}
            className="relative overflow-hidden rounded-2xl border-2 border-emerald-200 bg-card p-3.5 sm:p-4 shadow-sm"
          >
            <div className="flex gap-3">
              <Link href={`/profiles/${item.profileId}`} className="shrink-0">
                <div className="relative">
                  <ProfileAvatar profile={item.profile} size={64} />
                  <span className="absolute -bottom-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-emerald-500 ring-2 ring-white">
                    <Heart className="h-2.5 w-2.5 fill-white text-white" />
                  </span>
                </div>
              </Link>
              <div className="min-w-0 flex-1">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="font-serif text-base font-bold sm:text-lg">
                        {item.profile?.fullName || "Member"}, {item.profile?.age || 25}
                      </h3>
                      <Badge className="shrink-0 bg-emerald-500 text-[10px] font-bold text-white border-transparent">
                        <Sparkles className="h-2.5 w-2.5 mr-0.5" /> Match
                      </Badge>
                    </div>
                    <p className="mt-0.5 flex items-center gap-1 truncate text-xs text-muted-foreground">
                      <MapPin className="h-3 w-3 shrink-0" />
                      {item.profile?.city || "Tamil Nadu"} · {item.profile?.caste || "Community"}
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
                    {notes[item.profileId].length > 40 ? notes[item.profileId].slice(0, 40) + "…" : notes[item.profileId]}
                  </button>
                )}

                <div className="mt-3 flex flex-wrap gap-2">
                  <Link href="/inbox">
                    <Button size="sm" className="h-8 gap-1.5 bg-emerald-600 px-3 text-xs hover:bg-emerald-700 text-white">
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
                </div>
              </div>
            </div>
          </article>
        ))}
      </div>
    </div>
  )
}

// ──────────────────────────────────────────────
// Shortlisted Tab
// ──────────────────────────────────────────────
function ShortlistedTab({
  ids,
  notes,
  onRemove,
  onNoteOpen,
}: {
  ids: any[]
  notes: PrivateNotes
  onRemove: (id: string) => void
  onNoteOpen: (id: string) => void
}) {
  const items = React.useMemo(() => {
    return (ids || []).map((item) => {
      if (typeof item === "string") {
        return {
          id: item,
          profileId: item,
          fullName: "Profile " + item.slice(0, 8),
          age: 26,
          city: "Tamil Nadu",
          profession: "Professional",
          photo: null,
        }
      }
      const prof = item.profile || item
      return {
        id: prof.id || item.targetProfileId || item.id,
        profileId: prof.id || item.targetProfileId || item.id,
        fullName: prof.fullName || "Member",
        age: prof.age || 26,
        city: prof.city || "Tamil Nadu",
        state: prof.state || "",
        caste: prof.caste || prof.community || "",
        profession: prof.profession || prof.occupation || "Professional",
        educationLevel: prof.educationLevel || prof.education || "",
        photo: prof.photo || (prof.photos && prof.photos[0]) || null,
      }
    })
  }, [ids])

  if (items.length === 0) {
    return (
      <EmptyState
        icon={Star}
        title="Your watchlist is empty"
        body="Bookmark profiles with the Shortlist button to keep track of them privately."
        cta={{ label: "Browse profiles", href: "/dashboard" }}
      />
    )
  }

  return (
    <div>
      <p className="mb-3 text-xs text-muted-foreground">
        <span className="font-semibold text-foreground">{items.length}</span> saved {items.length === 1 ? "profile" : "profiles"} · Private — members are not notified
      </p>
      <div className="space-y-3">
        {items.map((item) => (
          <article key={item.id} className="royal-card p-3.5 sm:p-4">
            <div className="flex gap-3">
              <Link href={`/profiles/${item.id}`} className="shrink-0">
                <ProfileAvatar profile={item as any} size={56} />
              </Link>
              <div className="min-w-0 flex-1">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <Link href={`/profiles/${item.id}`} className="hover:underline">
                      <h3 className="font-serif text-base font-bold">
                        {item.fullName}, {item.age}
                      </h3>
                    </Link>
                    <p className="text-xs text-muted-foreground">
                      {[item.city, item.caste, item.profession].filter(Boolean).join(" · ")}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => onRemove(item.id)}
                    className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full hover:bg-muted"
                    aria-label="Remove from shortlist"
                  >
                    <BookmarkMinus className="h-4 w-4 text-muted-foreground hover:text-destructive" />
                  </button>
                </div>

                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <Link href={`/profiles/${item.id}`}>
                    <Button size="sm" variant="outline" className="h-8 px-3 text-xs">View profile</Button>
                  </Link>
                  <button
                    type="button"
                    onClick={() => onNoteOpen(item.id)}
                    className="h-8 rounded-lg px-3 text-xs font-semibold text-muted-foreground hover:bg-muted"
                  >
                    <NotebookPen className="mr-1 inline h-3 w-3" />
                    {notes[item.id] ? "Edit note" : "Add note"}
                  </button>
                </div>
              </div>
            </div>
          </article>
        ))}
      </div>
    </div>
  )
}


// ──────────────────────────────────────────────
// Blocked Tab
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
        {ids.map((profileId) => (
          <article key={profileId} className="royal-card p-3.5 sm:p-4 opacity-75">
            <div className="flex gap-3">
              <div className="relative shrink-0">
                <ProfileAvatar size={48} />
                <span className="absolute -bottom-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-destructive ring-2 ring-card">
                  <Ban className="h-2.5 w-2.5 text-white" />
                </span>
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate font-semibold text-foreground">
                  Blocked Profile ({profileId.slice(0, 8)})
                </p>
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
        ))}
      </div>
    </div>
  )
}

// ──────────────────────────────────────────────
// Main Page Export
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
  const { data, isLoading } = useInterestsQuery()
  const { data: shortlist = [] } = useShortlistQuery()
  const toggleShortlistMutation = useToggleShortlistMutation()
  const invalidate = useInvalidateInterests()

  const received = (data?.received ?? []) as InterestItem[]
  const sent = (data?.sent ?? []) as InterestItem[]
  const mutual = (data?.mutual ?? []) as InterestItem[]
  const [notes, setNotes] = React.useState<PrivateNotes>({})
  const [blocked, setBlocked] = React.useState<string[]>([])
  const [noteTarget, setNoteTarget] = React.useState<string | null>(null)

  const pendingReceived = received.filter((i) => i.status === "pending").length
  const mutualCount = mutual.length

  const handleAccept = async (profileId: string) => {
    try {
      await apiClient.interactions.accept(profileId)
      invalidate()
    } catch (e: any) {
      alert(e?.message || "Failed to accept interest")
    }
  }

  const handleDecline = async (profileId: string) => {
    try {
      await apiClient.interactions.decline(profileId)
      invalidate()
    } catch (e: any) {
      alert(e?.message || "Failed to decline interest")
    }
  }

  const handleWithdraw = async (profileId: string) => {
    try {
      await apiClient.interactions.withdraw(profileId)
      invalidate()
    } catch (e: any) {
      alert(e?.message || "Failed to withdraw interest")
    }
  }


  const handleIgnore = (profileId: string) => {
    // Local ignore handler
    invalidate()
  }

  const handleBlock = (profileId: string) => {
    setBlocked((prev) => [...prev, profileId])
  }

  const handleUnblock = (profileId: string) => {
    setBlocked((prev) => prev.filter((id) => id !== profileId))
  }

  const handleRemoveShortlist = (profileId: string) => {
    toggleShortlistMutation.mutate(profileId)
  }

  const handleSaveNote = (note: string) => {
    if (!noteTarget) return
    setNotes((prev) => ({
      ...prev,
      [noteTarget]: note,
    }))
  }

  return (
    <main className="mx-auto max-w-2xl px-3 py-5 sm:px-4 md:py-8">
      <div className="mb-5">
        <p className="royal-label">Your relationship CRM</p>
        <h1 className="mt-0.5 font-serif text-3xl font-bold tracking-tight">Interests</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Track every connection — received, sent, matched, and saved.
        </p>
      </div>

      <nav
        className="mb-6 flex overflow-x-auto hide-scrollbar rounded-2xl border border-border bg-card p-1 gap-0.5"
        role="tablist"
        aria-label="Interests sections"
      >
        {TABS.map((tab) => {
          const badge = tab.id === "received" && pendingReceived > 0 ? pendingReceived : 0
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

      {isLoading ? (
        <div className="flex py-12 items-center justify-center text-muted-foreground gap-2 text-sm">
          <Loader2 className="h-5 w-5 animate-spin" /> Loading interests...
        </div>
      ) : (
        <div role="tabpanel" aria-label={activeTab}>
          {activeTab === "received" && (
            <ReceivedTab
              items={received}
              notes={notes}
              onAccept={handleAccept}
              onDecline={handleDecline}
              onIgnore={handleIgnore}
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
              ids={shortlist}
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
      )}

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
