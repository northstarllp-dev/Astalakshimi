"use client"

import * as React from "react"
import Image from "next/image"
import Link from "next/link"
import { RequireFullPortal } from "@/components/layout/require-full-portal"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { useInterestsQuery } from "@/hooks/queries"
import { cn, getMediaUrl } from "@/lib/utils"
import {
  HeartHandshake,
  MessageSquarePlus,
  MapPin,
  NotebookPen,
  Phone,
  Sparkles,
  Users,
  Briefcase,
  ShieldCheck,
  Heart,
  Loader2,
  LockKeyholeOpen,
  UserRound
} from "lucide-react"

// ──────────────────────────────────────────────
// Types & Helpers
// ──────────────────────────────────────────────
type Tab = "mutual" | "unlocked"

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

const TABS: { id: Tab; label: string; icon: React.ElementType }[] = [
  { id: "mutual", label: "Mutual Matches", icon: HeartHandshake },
  { id: "unlocked", label: "Unlocked Contacts", icon: Phone },
]

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
// Tabs
// ──────────────────────────────────────────────
function MutualTab({
  items,
}: {
  items: InterestItem[]
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
                </div>
              </div>
            </div>
          </article>
        ))}
      </div>
    </div>
  )
}

function UnlockedContactsTab() {
  // Empty state for now
  return (
    <EmptyState
      icon={LockKeyholeOpen}
      title="No unlocked contacts yet"
      body="Use your premium contact unlocks to directly view phone numbers and initiate conversations."
      cta={{ label: "View plans", href: "/plans" }}
    />
  )
}

// ──────────────────────────────────────────────
// Main Page Export
// ──────────────────────────────────────────────
export default function MatchesPage() {
  return (
    <RequireFullPortal>
      <MatchesPageInner />
    </RequireFullPortal>
  )
}

function MatchesPageInner() {
  const [activeTab, setActiveTab] = React.useState<Tab>("mutual")
  const { data, isLoading } = useInterestsQuery()

  const mutual = (data?.mutual ?? []) as InterestItem[]
  const mutualCount = mutual.length

  return (
    <main className="mx-auto max-w-2xl px-3 py-5 sm:px-4 md:py-8">
      <div className="mb-5">
        <p className="royal-label">Your Matches</p>
        <h1 className="mt-0.5 font-serif text-3xl font-bold tracking-tight">Matches</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          View your mutual matches and unlocked contacts here.
        </p>
      </div>

      <nav
        className="mb-6 flex overflow-x-auto hide-scrollbar rounded-2xl border border-border bg-card p-1 gap-0.5"
        role="tablist"
        aria-label="Matches sections"
      >
        {TABS.map((tab) => {
          const badge = tab.id === "mutual" && mutualCount > 0 ? mutualCount : 0
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
          <Loader2 className="h-5 w-5 animate-spin" /> Loading matches...
        </div>
      ) : (
        <div role="tabpanel" aria-label={activeTab}>
          {activeTab === "mutual" && (
            <MutualTab
              items={mutual}
            />
          )}
          {activeTab === "unlocked" && (
            <UnlockedContactsTab />
          )}
        </div>
      )}
    </main>
  )
}
