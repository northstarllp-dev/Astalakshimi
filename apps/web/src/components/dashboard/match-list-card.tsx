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
  Briefcase,
  Building2,
  Check,
  ChevronLeft,
  ChevronRight,
  Coins,
  Crown,
  Eye,
  GraduationCap,
  Image as ImageIcon,
  Languages,
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
import { PlanCrownBadge } from "@/components/profile/plan-crown-badge"
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

          {/* Top Right: Plan Crown Badge (Silver/Gold/Platinum/Diamond; hidden for free) + Photo Count + Three dots menu */}
          <div className="flex items-center gap-2">
            <PlanCrownBadge plan={match.planSlug || match.plan || match.membership || (match.isVip ? "gold" : null)} />

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
          DESKTOP VIEW: High-end, spacious 2-column showcase layout
          ──────────────────────────────────────────────────────────────── */}
      <div className="hidden md:flex md:flex-row items-stretch">
        {/* Left: Photo Showcase Column */}
        <div className="w-[280px] lg:w-[310px] xl:w-[325px] shrink-0 p-3.5 sm:p-4 flex flex-col justify-between border-r border-border/40 bg-secondary/[0.02]">
          <div className="relative aspect-[3/4] w-full overflow-hidden rounded-2xl bg-neutral-900 shadow-sm border border-border/50">
            <Link href={`/profiles/${match.id}`} className="absolute inset-0 block">
              <Image
                src={getMediaUrl(photos[activePhoto] ?? photos[0])}
                alt={`${match.fullName}, ${match.age}`}
                fill
                priority={priority}
                className={cn(
                  "object-cover object-[center_18%] transition-all duration-500",
                  match.blurPhoto ? "blur-xl scale-110" : "hover:scale-105"
                )}
                sizes="(max-width: 1200px) 300px, 330px"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-black/30 pointer-events-none" />
            </Link>

            {/* Top Photo Badges */}
            <div className="absolute inset-x-0 top-0 z-20 flex items-start justify-between p-2.5">
              <div className="flex flex-col items-start gap-1">
                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-600/95 px-2.5 py-1 text-xs font-bold text-white shadow-sm backdrop-blur-xs">
                  <Star className="h-3 w-3 fill-current" /> {match.matchPercent || 92}% match
                </span>
                {match.photoVerified && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-black/60 px-2 py-0.5 text-[10px] font-semibold text-white backdrop-blur-xs border border-white/10">
                    <BadgeCheck className="h-3 w-3 text-secondary" /> Verified
                  </span>
                )}
              </div>

              <div className="flex items-center gap-1.5">
                <PlanCrownBadge plan={match.planSlug || match.plan || match.membership || (match.isVip ? "gold" : null)} />
                <button
                  type="button"
                  onClick={handleToggleShortlist}
                  disabled={toggleShortlistMutation.isPending}
                  aria-label={isShortlisted ? "Remove from shortlist" : "Add to shortlist"}
                  className="flex h-7 w-7 items-center justify-center rounded-full bg-black/50 text-white backdrop-blur transition hover:bg-black/75 hover:scale-105 active:scale-95 border border-white/20"
                >
                  <Bookmark
                    className={cn(
                      "h-3.5 w-3.5 transition-colors",
                      isShortlisted ? "fill-amber-400 text-amber-400" : "text-white"
                    )}
                  />
                </button>
              </div>
            </div>

            {/* Bottom photo controls (prev/next + photo count) */}
            <div className="absolute inset-x-0 bottom-0 z-20 flex items-center justify-between p-2.5">
              {photos.length > 1 ? (
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={prevPhoto}
                    aria-label="Previous photo"
                    className="flex h-6 w-6 items-center justify-center rounded-full bg-black/50 text-white backdrop-blur transition hover:bg-black/75"
                  >
                    <ChevronLeft className="h-3.5 w-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={nextPhoto}
                    aria-label="Next photo"
                    className="flex h-6 w-6 items-center justify-center rounded-full bg-black/50 text-white backdrop-blur transition hover:bg-black/75"
                  >
                    <ChevronRight className="h-3.5 w-3.5" />
                  </button>
                </div>
              ) : <div />}

              <div className="flex items-center gap-1 rounded-full bg-black/50 px-2 py-0.5 text-[11px] font-semibold text-white backdrop-blur border border-white/10">
                <ImageIcon className="h-3 w-3" />
                <span>{activePhoto + 1}/{photos.length || 1}</span>
              </div>
            </div>
          </div>

          <div className="mt-2.5 flex items-center justify-center gap-1.5 text-center text-[11px] font-medium text-muted-foreground">
            <span className="h-1.5 w-1.5 rounded-full bg-primary/60" />
            <span>ID: {match.id?.slice(0, 8).toUpperCase()}</span>
          </div>
        </div>

        {/* Right: Details and Action Column */}
        <div className="flex-1 min-w-0 p-5 lg:p-6 flex flex-col justify-between gap-4">
          {/* Header Row */}
          <div>
            <div className="flex flex-wrap items-start justify-between gap-2.5">
              <div>
                <div className="flex items-center gap-2">
                  <Link
                    href={`/profiles/${match.id}`}
                    className="font-serif text-2xl lg:text-[1.65rem] font-bold text-foreground hover:text-primary transition-colors flex items-center gap-2"
                  >
                    <span>{match.fullName}, {match.age}</span>
                    <span className="inline-flex h-4 w-4 items-center justify-center rounded-full bg-[#1d9bf0] text-white shadow-xs ring-1 ring-white/30" title="Verified Profile">
                      <Check className="h-2.5 w-2.5 stroke-[3]" />
                    </span>
                  </Link>
                </div>

                <div className="mt-1 flex flex-wrap items-center gap-x-2 text-xs sm:text-sm font-medium text-muted-foreground">
                  <span className="inline-flex items-center gap-1 text-foreground/90 font-semibold">
                    <MapPin className="h-3.5 w-3.5 text-primary" /> {match.city || "City not specified"}
                  </span>
                  {formattedCommunity && (
                    <>
                      <span>•</span>
                      <span>{formattedCommunity}</span>
                    </>
                  )}
                  {formattedHeight && (
                    <>
                      <span>•</span>
                      <span>{formattedHeight}</span>
                    </>
                  )}
                </div>
              </div>

              {/* Badges on the right */}
              <div className="flex flex-wrap items-center gap-1.5">
                {featured && (
                  <Badge variant="secondary" className="text-xs font-bold bg-amber-50 text-amber-900 border-amber-200">
                    <Sparkles className="mr-1 h-3 w-3 text-amber-600" /> Top
                  </Badge>
                )}
                {["Online now", "Today", "2 hours ago"].includes(match.lastActive) && (
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700 border border-emerald-200/60">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" /> Active today
                  </span>
                )}
              </div>
            </div>

            {/* Bento Attribute Tiles */}
            <div className="mt-4 grid grid-cols-2 lg:grid-cols-3 gap-2.5">
              <div className="rounded-xl border border-secondary/20 bg-[#fffbf4]/80 p-2.5 px-3 shadow-xs">
                <dt className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                  <GraduationCap className="h-3.5 w-3.5 text-primary" /> Education
                </dt>
                <dd className="mt-0.5 truncate text-xs sm:text-sm font-semibold text-foreground" title={match.education}>
                  {match.education || "Not specified"}
                </dd>
              </div>

              <div className="rounded-xl border border-secondary/20 bg-[#fffbf4]/80 p-2.5 px-3 shadow-xs">
                <dt className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                  <Briefcase className="h-3.5 w-3.5 text-primary" /> Profession
                </dt>
                <dd className="mt-0.5 truncate text-xs sm:text-sm font-semibold text-foreground" title={match.occupation}>
                  {match.occupation || "Not specified"}
                </dd>
              </div>

              <div className="rounded-xl border border-secondary/20 bg-[#fffbf4]/80 p-2.5 px-3 shadow-xs">
                <dt className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                  <Building2 className="h-3.5 w-3.5 text-primary" /> Company
                </dt>
                <dd className="mt-0.5 truncate text-xs sm:text-sm font-semibold text-foreground" title={match.company}>
                  {match.company || "Not specified"}
                </dd>
              </div>

              <div className="rounded-xl border border-secondary/20 bg-[#fffbf4]/80 p-2.5 px-3 shadow-xs">
                <dt className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                  <Coins className="h-3.5 w-3.5 text-primary" /> Annual Income
                </dt>
                <dd className="mt-0.5 truncate text-xs sm:text-sm font-semibold text-foreground">
                  {match.income || "Not specified"}
                </dd>
              </div>

              <div className="rounded-xl border border-secondary/20 bg-[#fffbf4]/80 p-2.5 px-3 shadow-xs">
                <dt className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                  <Languages className="h-3.5 w-3.5 text-primary" /> Mother Tongue
                </dt>
                <dd className="mt-0.5 truncate text-xs sm:text-sm font-semibold text-foreground">
                  {match.motherTongue || "Tamil"}
                </dd>
              </div>

              <div className="rounded-xl border border-secondary/20 bg-[#fffbf4]/80 p-2.5 px-3 shadow-xs">
                <dt className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                  <Users className="h-3.5 w-3.5 text-primary" /> Profile For
                </dt>
                <dd className="mt-0.5 truncate text-xs sm:text-sm font-semibold text-foreground">
                  {match.profileFor ? `For ${match.profileFor}` : "Self / Family"}
                </dd>
              </div>
            </div>

            {/* About / Personal Note */}
            <div className="mt-3 rounded-xl border border-border/60 bg-muted/30 p-3 text-xs leading-relaxed text-foreground/85">
              <p className="line-clamp-2">
                {match.about || "Profile created by staff on behalf of the family. Looking for an understanding partner from a good family background."}
              </p>
            </div>
          </div>

          {/* Footer Action Bar */}
          <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-border/60">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <span className="flex h-2 w-2 rounded-full bg-emerald-500" />
              <span>Last active: {match.lastActive || "Online now"}</span>
            </div>

            <div className="flex items-center gap-2 sm:gap-2.5">
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-10 rounded-xl px-4 text-xs font-semibold hover:bg-muted text-muted-foreground hover:text-foreground"
                onClick={() => onSkip(match.id)}
              >
                Skip
              </Button>
              <Link href={`/profiles/${match.id}`}>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-10 rounded-xl border-secondary/40 px-4 text-xs font-semibold hover:bg-secondary/10 text-primary"
                >
                  View Profile
                </Button>
              </Link>
              <ConnectButton
                profileId={match.id}
                size="sm"
                className="h-10 rounded-xl px-5 text-xs font-semibold shadow-xs"
              />
            </div>
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
