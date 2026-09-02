"use client"

import * as React from "react"
import Image from "next/image"
import Link from "next/link"
import { cn, getMediaUrl } from "@/lib/utils"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  BadgeCheck,
  Bookmark,
  Check,
  ChevronLeft,
  ChevronRight,
  Crown,
  Eye,
  Image as ImageIcon,
  Loader2,
  MapPin,
  MoreVertical,
  Phone,
  Sparkles,
  Star,
  Users,
  X,
} from "lucide-react"
import { ConnectButton } from "@/components/profile/connect-button"
import {
  useContactUsageQuery,
  useInterestsQuery,
  useSendInterestMutation,
  useShortlistQuery,
  useToggleShortlistMutation,
  useUnlockedContactsQuery,
} from "@/hooks/queries"
import { getConnectStatus } from "@/lib/connect-status"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { ProfileContactUnlockDialog } from "@/components/profile/profile-contact-unlock-dialog"

function formatHeight(height?: string, heightCm?: number): string {
  if (heightCm && heightCm > 0) {
    const totalInches = Math.round(heightCm / 2.54)
    const feet = Math.floor(totalInches / 12)
    const inches = totalInches % 12
    return `${feet}' ${inches}"`
  }
  if (!height) return ""
  if (height.includes("'")) return height
  const num = parseInt(height.replace(/\D/g, ""), 10)
  if (!isNaN(num) && num >= 100 && num <= 250) {
    const totalInches = Math.round(num / 2.54)
    const feet = Math.floor(totalInches / 12)
    const inches = totalInches % 12
    return `${feet}' ${inches}"`
  }
  return height
}

function formatCommunity(match: any): string {
  const caste = match.caste || match.community || ""
  const subCaste = match.subCaste || match.subcaste || ""
  if (caste && subCaste && !caste.toLowerCase().includes(subCaste.toLowerCase())) {
    return `${caste} - ${subCaste}`
  }
  return caste
}

export function MatchListCard({
  match,
  featured = false,
  priority = false,
  onSkip,
  onConnect,
}: {
  match: any
  featured?: boolean
  priority?: boolean
  onSkip: (id: string) => void
  onConnect?: (id: string) => void
}) {
  const education =
    (match.education || match.educationLevel || "").split(/\s+/)[0]?.trim() ||
    match.education ||
    match.educationLevel ||
    "Not specified"
  const [activePhoto, setActivePhoto] = React.useState(0)
  const [paused, setPaused] = React.useState(false)
  const [contactDialogOpen, setContactDialogOpen] = React.useState(false)
  const [justConnected, setJustConnected] = React.useState(false)

  const photos = match.photos || []

  const { data: shortlistData = [] } = useShortlistQuery()
  const toggleShortlistMutation = useToggleShortlistMutation()
  const { data: interests } = useInterestsQuery()
  const sendInterestMutation = useSendInterestMutation()
  const { data: contactUsage } = useContactUsageQuery()
  const { data: unlockedContacts = [] } = useUnlockedContactsQuery()

  const isShortlisted = shortlistData.some((item: any) =>
    typeof item === "string" ? item === match.id : item.id === match.id || item.profileId === match.id
  )

  const connectStatus = getConnectStatus(match.id, interests, { justSent: justConnected })
  const isConnected = connectStatus === "mutual" || connectStatus === "sent" || justConnected
  const isConnecting = sendInterestMutation.isPending

  const isContactUnlocked = unlockedContacts.some(
    (u: any) => (typeof u === "string" ? u === match.id : u.id === match.id || u.profileId === match.id)
  )

  const handleToggleShortlist = (e?: React.MouseEvent) => {
    e?.preventDefault()
    e?.stopPropagation()
    toggleShortlistMutation.mutate(match.id)
  }

  const handleConnect = async () => {
    if (isConnected || isConnecting) return
    if (onConnect) {
      onConnect(match.id)
      setJustConnected(true)
      return
    }
    try {
      await sendInterestMutation.mutateAsync(match.id)
      setJustConnected(true)
    } catch {
      // Handled by mutation error state
    }
  }

  // Auto-cycle photos every 3s, pause on touch/hover
  React.useEffect(() => {
    if (photos.length <= 1 || paused) return
    const id = setInterval(() => {
      setActivePhoto((p) => (p + 1) % photos.length)
    }, 3000)
    return () => clearInterval(id)
  }, [photos.length, paused])

  const prevPhoto = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setActivePhoto((p) => (p - 1 + photos.length) % photos.length)
  }

  const nextPhoto = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setActivePhoto((p) => (p + 1) % photos.length)
  }

  const formattedHeight = formatHeight(match.height, match.heightCm)
  const formattedCommunity = formatCommunity(match)
  const formattedProfession = match.profession || match.occupation || ""
  const isFemale =
    match.gender?.toLowerCase() === "female" ||
    match.gender?.toLowerCase() === "bride" ||
    match.profileFor?.toLowerCase() === "daughter" ||
    match.profileFor?.toLowerCase() === "sister"

  return (
    <article
      className={cn(
        "overflow-hidden rounded-2xl md:rounded-3xl border bg-card shadow-sm transition-shadow hover:shadow-md",
        featured ? "border-secondary/60 ring-2 ring-secondary/25" : "border-secondary/20"
      )}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onTouchStart={() => setPaused(true)}
      onTouchEnd={() => setTimeout(() => setPaused(false), 2000)}
    >
      {/* ────────────────────────────────────────────────────────────────
          MOBILE VIEW: Exact match to mobile reference
          ──────────────────────────────────────────────────────────────── */}
      <div className="relative block md:hidden aspect-[9/15] min-h-[520px] w-full select-none overflow-hidden bg-neutral-900">
        {/* Full card background photo with link to profile */}
        <Link href={`/profiles/${match.id}`} className="absolute inset-0 block">
          <Image
            src={getMediaUrl(photos[activePhoto] ?? photos[0])}
            alt={`${match.fullName}, ${match.age}`}
            fill
            priority={priority}
            className={cn(
              "object-cover object-[center_20%] transition-all duration-500",
              match.blurPhoto ? "scale-110 blur-xl" : ""
            )}
            sizes="(max-width: 768px) 100vw, 400px"
          />
          {/* Top gradient for badges */}
          <div className="pointer-events-none absolute inset-x-0 top-0 h-28 bg-gradient-to-b from-black/70 via-black/25 to-transparent" />
          {/* Deep bottom gradient for text & actions */}
          <div className="pointer-events-none absolute inset-x-0 bottom-0 h-80 bg-gradient-to-t from-black via-black/80 to-transparent" />
        </Link>

        {/* Top Header Overlay */}
        <div className="absolute inset-x-0 top-0 z-20 flex items-center justify-between p-3.5">
          {/* Top Left: Promoted / Featured badge with (i) icon */}
          <div className="flex items-center gap-1 rounded-full bg-black/45 px-3 py-1 text-xs font-medium text-white/95 backdrop-blur-md border border-white/15 shadow-sm">
            <span>{match.promoted || featured ? "Promoted" : "Promoted"}</span>
            <span className="flex h-3.5 w-3.5 items-center justify-center rounded-full border border-white/70 text-[9px] font-bold leading-none">
              i
            </span>
          </div>

          {/* Top Right: VIP Crown + Photo Count + Three dots menu */}
          <div className="flex items-center gap-2">
            {/* VIP Crown Red Circle */}
            <div className="flex h-7 w-7 items-center justify-center rounded-full bg-[#ff3b30] text-white shadow-md">
              <Crown className="h-3.5 w-3.5 fill-current" />
            </div>

            {/* Photo count pill */}
            <div className="flex items-center gap-1.5 rounded-full bg-black/45 px-2.5 py-1 text-xs font-semibold text-white backdrop-blur-md border border-white/15 shadow-sm">
              <ImageIcon className="h-3.5 w-3.5" />
              <span>{photos.length > 0 ? photos.length : 1}</span>
            </div>

            {/* Three dots menu button */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  type="button"
                  className="flex h-7 w-7 items-center justify-center rounded-full bg-black/45 text-white backdrop-blur-md border border-white/15 hover:bg-black/60 active:scale-95 transition"
                  aria-label="More options"
                >
                  <MoreVertical className="h-4 w-4" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48 rounded-xl border border-border/60 bg-popover/95 p-1 shadow-xl backdrop-blur-md">
                <DropdownMenuItem onClick={handleToggleShortlist} className="cursor-pointer">
                  <Bookmark className={cn("mr-2 h-4 w-4", isShortlisted && "fill-amber-400 text-amber-400")} />
                  <span>{isShortlisted ? "Remove Shortlist" : "Add to Shortlist"}</span>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => onSkip(match.id)} className="cursor-pointer">
                  <X className="mr-2 h-4 w-4 text-muted-foreground" />
                  <span>Pass Profile</span>
                </DropdownMenuItem>
                <DropdownMenuItem asChild className="cursor-pointer">
                  <Link href={`/profiles/${match.id}`}>
                    <Eye className="mr-2 h-4 w-4 text-muted-foreground" />
                    <span>View Full Profile</span>
                  </Link>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {/* Tap areas for photo gallery navigation if multiple photos */}
        {photos.length > 1 && (
          <>
            <div
              className="absolute left-0 top-14 bottom-48 w-1/4 z-10"
              onClick={prevPhoto}
              aria-label="Previous photo"
            />
            <div
              className="absolute right-0 top-14 bottom-48 w-1/4 z-10"
              onClick={nextPhoto}
              aria-label="Next photo"
            />
          </>
        )}

        {/* Bottom Overlay Info & Action Bar */}
        <div className="absolute inset-x-0 bottom-0 z-20 flex flex-col justify-end">
          {/* Profile Details (Clickable link to full profile) */}
          <Link href={`/profiles/${match.id}`} className="block px-4 pb-3 text-white">
            {/* Name, Age, Blue Verified Badge */}
            <div className="flex items-center gap-1.5">
              <h2 className="font-serif text-2xl font-bold tracking-tight text-white drop-shadow-sm">
                {match.fullName}, {match.age}
              </h2>
              {/* Blue verified badge with checkmark */}
              <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-[#1d9bf0] text-white shadow-sm ring-1 ring-white/30">
                <Check className="h-3 w-3 stroke-[3]" />
              </span>
            </div>

            {/* Line 2: 5' 3" • Mudaliar - Senguntha • Software Developer... */}
            <p className="mt-1 text-sm font-medium text-white/95 drop-shadow-sm truncate">
              {[formattedHeight, formattedCommunity, formattedProfession].filter(Boolean).join(" • ")}
            </p>

            {/* Line 3: Kanchipuram, Tamil Nadu */}
            <p className="mt-0.5 text-xs text-white/80 font-normal drop-shadow-sm truncate">
              {[match.city, match.state].filter(Boolean).join(", ")}
            </p>

            {/* Line 4: Status Pills (Online + You & Her / You & Him) */}
            <div className="mt-2 flex items-center gap-2">
              {/* Online status */}
              <span className="inline-flex items-center gap-1.5 rounded-full bg-black/55 px-2.5 py-1 text-xs font-medium text-white backdrop-blur-md border border-white/10 shadow-sm">
                <span className="h-2 w-2 rounded-full bg-[#10b981] ring-2 ring-[#10b981]/30" />
                Online
              </span>

              {/* Mutual criteria (You & Her / You & Him) */}
              <span className="inline-flex items-center gap-1.5 rounded-full bg-black/55 px-2.5 py-1 text-xs font-medium text-white backdrop-blur-md border border-white/10 shadow-sm">
                <Users className="h-3.5 w-3.5 text-[#ff6b6b]" />
                <span>{isFemale ? "You & Her" : "You & Him"}</span>
              </span>
            </div>
          </Link>

          {/* Bottom Action Bar */}
          <div className="relative z-10 flex items-center justify-between border-t border-white/15 bg-black/40 px-4 py-3 backdrop-blur-md">
            {/* Left: Like this Profile? */}
            <span className="font-serif italic text-white/95 text-sm sm:text-base font-normal tracking-wide">
              Like this Profile?
            </span>

            {/* Right: Action Buttons */}
            <div className="flex items-center gap-4">
              {/* View Contact Button */}
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault()
                  e.stopPropagation()
                  setContactDialogOpen(true)
                }}
                className="flex flex-col items-center gap-1 group active:scale-95 transition"
              >
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-white shadow-lg transition-transform group-hover:scale-105">
                  <Phone className="h-5 w-5 text-[#10b981] fill-[#10b981]" />
                </div>
                <span className="text-[10px] sm:text-[11px] font-semibold text-white/90 tracking-tight">
                  View Contact
                </span>
              </button>

              {/* Connect Now Button */}
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault()
                  e.stopPropagation()
                  handleConnect()
                }}
                disabled={isConnecting}
                className="flex flex-col items-center gap-1 group active:scale-95 transition"
              >
                <div
                  className={cn(
                    "flex h-12 w-12 items-center justify-center rounded-full shadow-lg transition-transform group-hover:scale-105",
                    isConnected
                      ? "bg-[#067647] text-white"
                      : "bg-gradient-to-br from-[#22c55e] to-[#10b981] text-white"
                  )}
                >
                  {isConnecting ? (
                    <Loader2 className="h-6 w-6 animate-spin text-white" />
                  ) : (
                    <Check className="h-6 w-6 stroke-[3] text-white" />
                  )}
                </div>
                <span className="text-[10px] sm:text-[11px] font-semibold text-white/90 tracking-tight">
                  {isConnected ? "Connected" : "Connect Now"}
                </span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ────────────────────────────────────────────────────────────────
          DESKTOP VIEW: Two-column expansive layout
          ──────────────────────────────────────────────────────────────── */}
      <div className="hidden md:grid md:grid-cols-[minmax(220px,260px)_1fr]">
        {/* Photo column */}
        <div className="relative">
          <Link
            href={`/profiles/${match.id}`}
            className="relative block aspect-[4/5] overflow-hidden md:aspect-auto md:min-h-[300px]"
          >
            <Image
              src={getMediaUrl(photos[activePhoto] ?? photos[0])}
              alt={`${match.fullName}, ${match.age}`}
              fill
              priority={priority}
              className={cn(
                "object-cover object-[center_18%] transition-all duration-500",
                match.blurPhoto ? "blur-xl scale-110" : ""
              )}
              sizes="260px"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/15 to-black/20" />

            {/* Photo badges */}
            <div className="absolute left-2.5 top-2.5 flex flex-col items-start gap-1.5">
              <Badge className="border-transparent bg-emerald-500 text-[11px] font-bold text-white">
                <Star className="fill-current" /> {match.matchPercent || 92}%
              </Badge>
              {match.photoVerified && (
                <Badge
                  variant="outline"
                  className="border-transparent bg-black/50 text-[11px] font-semibold text-white backdrop-blur"
                >
                  <BadgeCheck className="text-secondary" /> Verified
                </Badge>
              )}
            </div>

            <button
              type="button"
              onClick={handleToggleShortlist}
              disabled={toggleShortlistMutation.isPending}
              aria-label={isShortlisted ? "Remove from shortlist" : "Add to shortlist"}
              className="absolute right-2.5 top-2.5 z-10 flex h-8 w-8 items-center justify-center rounded-full bg-black/50 text-white backdrop-blur transition hover:bg-black/75 hover:scale-105 active:scale-95"
            >
              <Bookmark
                className={cn(
                  "h-4 w-4 transition-colors",
                  isShortlisted ? "fill-amber-400 text-amber-400" : "text-white"
                )}
              />
            </button>

            {/* Name overlay */}
            <div className="absolute inset-x-0 bottom-0 p-3.5 pb-8 text-white">
              <h2 className="font-serif text-[1.35rem] font-bold leading-tight flex items-center gap-1.5">
                <span>{match.fullName}, {match.age}</span>
                <span className="inline-flex h-4 w-4 items-center justify-center rounded-full bg-[#1d9bf0] text-white shadow-sm ring-1 ring-white/30">
                  <Check className="h-2.5 w-2.5 stroke-[3]" />
                </span>
              </h2>
              <p className="mt-1 flex items-center gap-1 text-xs text-white/90">
                <MapPin className="h-3.5 w-3.5 shrink-0" />
                <span className="truncate">
                  {[match.city, formattedCommunity, formattedHeight].filter(Boolean).join(" · ")}
                </span>
              </p>
              <p className="mt-0.5 truncate text-[11px] text-white/75">
                {[education, formattedProfession].filter(Boolean).join(" · ")}
              </p>
            </div>
          </Link>

          {/* Dots */}
          {photos.length > 1 && (
            <div className="absolute bottom-3.5 left-3.5 z-10 flex gap-1">
              {photos.map((_: any, i: number) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => setActivePhoto(i)}
                  aria-label={`Photo ${i + 1}`}
                  className={cn(
                    "h-1.5 rounded-full transition-all",
                    activePhoto === i ? "w-5 bg-white" : "w-1.5 bg-white/45"
                  )}
                />
              ))}
            </div>
          )}

          {/* Arrows */}
          {photos.length > 1 && (
            <>
              <button
                type="button"
                onClick={prevPhoto}
                aria-label="Previous photo"
                className="absolute left-2 top-1/2 -translate-y-1/2 z-10 flex h-8 w-8 items-center justify-center rounded-full bg-black/40 text-white backdrop-blur transition hover:bg-black/70"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={nextPhoto}
                aria-label="Next photo"
                className="absolute right-2 top-1/2 -translate-y-1/2 z-10 flex h-8 w-8 items-center justify-center rounded-full bg-black/40 text-white backdrop-blur transition hover:bg-black/70"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </>
          )}
        </div>

        {/* Details column */}
        <div className="flex flex-col justify-between gap-3 p-4">
          <div className="flex flex-wrap gap-1.5">
            {featured && (
              <Badge variant="secondary" className="text-[11px] font-bold">
                <Sparkles className="h-3 w-3" /> Top
              </Badge>
            )}
            {match.joinedDaysAgo <= 7 && (
              <Badge className="border-transparent bg-primary text-[11px] font-bold text-white">New</Badge>
            )}
            {match.premium && (
              <Badge className="border-transparent bg-[#b8901f] text-[11px] font-bold text-white">
                <Sparkles className="h-3 w-3" /> Premium
              </Badge>
            )}
            {["Online now", "Today", "2 hours ago"].includes(match.lastActive) && (
              <Badge
                variant="outline"
                className="border-emerald-200 bg-emerald-50 text-[11px] font-semibold text-emerald-800"
              >
                <span className="mr-1 h-1.5 w-1.5 rounded-full bg-emerald-500" /> Active today
              </Badge>
            )}
          </div>

          <dl className="grid grid-cols-2 gap-x-3 gap-y-2 text-sm">
            <Detail label="Education" value={match.education} />
            <Detail label="Profession" value={match.occupation} />
            <Detail label="Company" value={match.company} />
            <Detail label="Income" value={match.income} />
            <Detail label="Mother tongue" value={match.motherTongue} />
            <Detail label="Last active" value={match.lastActive} />
          </dl>

          <p className="line-clamp-3 text-sm leading-relaxed text-muted-foreground">{match.about}</p>

          <div className="grid grid-cols-3 gap-2">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-10 border border-border"
              onClick={() => onSkip(match.id)}
            >
              Skip
            </Button>
            <Link href={`/profiles/${match.id}`} className="min-w-0">
              <Button variant="outline" size="sm" className="h-10 w-full">
                View
              </Button>
            </Link>
            <ConnectButton profileId={match.id} size="sm" className="h-10 w-full" />
          </div>
        </div>
      </div>

      {/* Contact Unlock Modal */}
      <ProfileContactUnlockDialog
        open={contactDialogOpen}
        onOpenChange={setContactDialogOpen}
        profileId={match.id}
        access={
          contactUsage
            ? {
                canView: false,
                isUnlocked: isContactUnlocked,
                isMutualBenefit: true,
                limit: contactUsage.limit,
                usedThisMonth: contactUsage.usedThisMonth,
                remaining: contactUsage.remaining,
                canUnlockWithQuota:
                  contactUsage.limit === null ||
                  (contactUsage.remaining !== null && contactUsage.remaining > 0),
                canPayExtra: contactUsage.canPayExtra,
                extraContactFeePaise: contactUsage.extraContactFeePaise,
                planSlug: contactUsage.planSlug,
              }
            : null
        }
      />
    </article>
  )
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0">
      <dt className="text-[10px] font-semibold tracking-wide text-muted-foreground uppercase">{label}</dt>
      <dd className="truncate font-medium text-foreground">{value || "Not specified"}</dd>
    </div>
  )
}
