"use client"

import * as React from "react"
import Image from "next/image"
import Link from "next/link"
import { cn, getMediaUrl } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
  Bookmark,
  Check,
  ChevronLeft,
  ChevronRight,
  Eye,
  Image as ImageIcon,
  Loader2,
  MapPin,
  MoreVertical,
  Phone,
  Users,
  X,
} from "lucide-react"
import { displayHeight, formatHeightFromCm } from "@/lib/input-units"
import { ConnectButton } from "@/components/profile/connect-button"
import { PlanCrownBadge } from "@/components/profile/plan-crown-badge"
import { LockedPhoto } from "@/components/profile/locked-photo"
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
import { ProfileMutualUnlockDialog, useMutualUnlockDialog } from "@/components/profile/profile-mutual-unlock-dialog"

function formatHeight(height?: string, heightCm?: number): string {
  if (heightCm && heightCm > 0) {
    return `${heightCm} cm`
  }
  if (!height) return ""
  if (height.includes("cm") || height.includes("'")) return height
  const num = parseInt(height.replace(/\D/g, ""), 10)
  if (!isNaN(num) && num >= 100 && num <= 250) {
    return `${num} cm`
  }
  return height
}

/**
 * Warms the next/image cache for the photo the 3s auto-cycle is about to show,
 * so advancing the carousel paints instantly instead of re-fetching.
 * Rendered at 1x1 with the same `sizes` so the browser requests the identical
 * optimizer URL it will need a moment later.
 */
function NextPhotoPreload({ photo, sizes }: { photo?: string; sizes: string }) {
  if (!photo) return null
  return (
    <div aria-hidden className="pointer-events-none absolute left-0 top-0 h-px w-px overflow-hidden opacity-0">
      <Image src={getMediaUrl(photo)} alt="" fill sizes={sizes} className="object-cover" />
    </div>
  )
}

const PROFILE_CREATED_BY: Record<string, string> = {
  Myself: "Self",
  Son: "Parent",
  Daughter: "Parent",
  Brother: "Sibling",
  Sister: "Sibling",
  Relative: "Relative",
  Friend: "Friend",
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
  fillViewport = false,
  className,
  onSkip,
  onConnect,
  interactionsLocked = false,
}: {
  match: any
  featured?: boolean
  priority?: boolean
  fillViewport?: boolean
  className?: string
  onSkip: (id: string) => void
  onConnect?: (id: string) => void
  /** Unverified teaser — disable interest / skip / contact unlock; keep shortlist. */
  interactionsLocked?: boolean
}) {
  const [activePhoto, setActivePhoto] = React.useState(0)
  const [paused, setPaused] = React.useState(false)
  const [contactDialogOpen, setContactDialogOpen] = React.useState(false)
  const [justConnected, setJustConnected] = React.useState(false)
  const mutualUnlockDialog = useMutualUnlockDialog()

  const photos = match.photos || []
  // The API withholds keys entirely when a photo should be blurred.
  const isHidden = match.blurPhoto || photos.length === 0

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
    if (interactionsLocked || isConnected || isConnecting) return
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

  const desktopHeight =
    match.heightCm && match.heightCm > 0 ? formatHeightFromCm(match.heightCm) : displayHeight(match.height)
  const profileCreatedBy = PROFILE_CREATED_BY[match.profileFor as string] ?? ""
  const aboutSnippet = String(match.aboutMe || match.about || "").trim()
  const religionCommunity = [match.religion, formattedCommunity].filter(Boolean).join(" · ")
  const summaryRows = [
    { label: "Religion", value: religionCommunity },
    { label: "Mother tongue", value: match.motherTongue },
    { label: "Education", value: match.education || match.educationLevel },
    { label: "Profession", value: match.occupation || match.profession },
    { label: "Works at", value: match.company },
    { label: "Annual income", value: match.income || match.annualIncome },
  ].filter((row): row is { label: string; value: string } => Boolean(row.value && String(row.value).trim()))

  return (
    <article
      className={cn(
        "overflow-hidden rounded-2xl md:rounded-3xl border bg-card shadow-sm transition-shadow hover:shadow-md",
        featured ? "border-secondary/60 ring-2 ring-secondary/25" : "border-secondary/20",
        fillViewport && "max-md:flex max-md:h-full max-md:min-h-0 max-md:flex-col",
        className,
      )}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onTouchStart={() => setPaused(true)}
      onTouchEnd={() => setTimeout(() => setPaused(false), 2000)}
    >
      {/* ────────────────────────────────────────────────────────────────
          MOBILE VIEW: Exact match to mobile reference
          ──────────────────────────────────────────────────────────────── */}
      <div className={cn(
        "relative block w-full select-none overflow-hidden bg-neutral-900 md:hidden",
        fillViewport ? "min-h-0 flex-1" : "aspect-[9/15] min-h-[520px]",
      )}>
        {/* Full card background photo with link to profile */}
        <Link href={`/profiles/${match.id}`} className="absolute inset-0 block">
          {isHidden ? (
            <LockedPhoto src={photos[activePhoto] ?? photos[0]} label="Photo hidden" />
          ) : (
            <>
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
              {photos.length > 1 && (
                <NextPhotoPreload
                  photo={photos[(activePhoto + 1) % photos.length]}
                  sizes="(max-width: 768px) 100vw, 400px"
                />
              )}
            </>
          )}
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

          {/* Top Right: Photo Count + Three dots menu */}
          <div className="flex items-center gap-2">

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
                <DropdownMenuItem
                  onClick={() => {
                    if (interactionsLocked) return
                    onSkip(match.id)
                  }}
                  disabled={interactionsLocked}
                  className="cursor-pointer"
                  title={interactionsLocked ? "Verify to interact" : undefined}
                >
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
            {/* Name, Age */}
            <div className="flex items-center gap-1.5">
              <h2 className="font-serif text-2xl font-bold tracking-tight text-white drop-shadow-sm">
                {match.fullName}, {match.age}
              </h2>
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
                  if (interactionsLocked) return
                  if (connectStatus !== "mutual") {
                    mutualUnlockDialog.prompt("contact")
                    return
                  }
                  setContactDialogOpen(true)
                }}
                disabled={interactionsLocked}
                title={interactionsLocked ? "Verify to unlock contact" : undefined}
                className="flex flex-col items-center gap-1 group active:scale-95 transition disabled:opacity-50"
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
                disabled={isConnecting || interactionsLocked}
                title={interactionsLocked ? "Verify to send interest" : undefined}
                className="flex flex-col items-center gap-1 group active:scale-95 transition disabled:opacity-50"
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
      <div className="hidden md:flex md:flex-row md:items-stretch">
        {/* Left: Photo Showcase Column */}
        <div className="flex w-[240px] shrink-0 flex-col justify-between border-r border-border/40 bg-secondary/[0.02] p-3.5 lg:w-[280px] xl:w-[300px] sm:p-4">
          <div className="relative aspect-[3/4] max-h-[min(46vh,380px)] w-full overflow-hidden rounded-2xl border border-border/50 bg-neutral-900 shadow-sm">
            <Link href={`/profiles/${match.id}`} className="absolute inset-0 block">
              {isHidden ? (
                <LockedPhoto src={photos[activePhoto] ?? photos[0]} label="Photo hidden" />
              ) : (
                <>
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
                  {photos.length > 1 && (
                    <NextPhotoPreload
                      photo={photos[(activePhoto + 1) % photos.length]}
                      sizes="(max-width: 1200px) 300px, 330px"
                    />
                  )}
                </>
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-black/30 pointer-events-none" />
            </Link>

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


        </div>

        {/* Right: matrimony-style profile summary */}
        <div className="flex min-w-0 flex-1 flex-col justify-between gap-4 p-5 lg:p-6">
          <div>
            <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
              <Link
                href={`/profiles/${match.id}`}
                className="font-serif text-2xl font-bold text-foreground transition-colors hover:text-primary lg:text-[1.65rem]"
              >
                {match.fullName}
              </Link>
              {profileCreatedBy && (
                <span className="text-xs text-muted-foreground">Profile created by {profileCreatedBy}</span>
              )}
            </div>

            <p className="mt-1 text-sm text-foreground/85">
              {[
                match.age ? `${match.age} yrs` : "",
                desktopHeight,
                match.maritalStatus,
              ]
                .filter(Boolean)
                .join(", ")}
            </p>
            <p className="mt-0.5 flex items-center gap-1 text-sm text-muted-foreground">
              <MapPin className="h-3.5 w-3.5 shrink-0 text-primary" />
              {[match.city, match.state].filter(Boolean).join(", ") || "Location not shared"}
            </p>

            <div className="my-4 h-px bg-gradient-to-r from-secondary/40 via-secondary/15 to-transparent" />

            <dl className="grid grid-cols-1 gap-x-8 gap-y-2 text-sm lg:grid-cols-2">
              {summaryRows.map((row) => (
                <div key={row.label} className="flex gap-2">
                  <dt className="w-28 shrink-0 text-muted-foreground">{row.label}</dt>
                  <dd className="min-w-0 truncate font-medium text-foreground" title={row.value}>
                    {row.value}
                  </dd>
                </div>
              ))}
            </dl>

            {aboutSnippet && (
              <p className="mt-4 line-clamp-2 text-sm italic leading-relaxed text-foreground/75">
                &ldquo;{aboutSnippet}&rdquo;
              </p>
            )}

            {Array.isArray(match.matchReasons) && match.matchReasons.length > 0 && (
              <p className="mt-3 text-xs text-[#8a6a12]">
                <span className="font-semibold">Why this match:</span> {match.matchReasons.join(" · ")}
              </p>
            )}
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border/60 pt-3">
            <Link
              href={`/profiles/${match.id}`}
              className="text-sm font-semibold text-primary hover:underline"
            >
              View full profile →
            </Link>

            <div className="flex items-center gap-2 sm:gap-2.5">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-10 rounded-full px-4 text-xs font-semibold text-muted-foreground hover:text-foreground"
                disabled={interactionsLocked}
                title={interactionsLocked ? "Verify to interact" : undefined}
                onClick={() => {
                  if (interactionsLocked) return
                  onSkip(match.id)
                }}
              >
                Not now
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-10 rounded-full border-secondary/40 px-4 text-xs font-semibold text-primary hover:bg-secondary/10"
                onClick={handleToggleShortlist}
                disabled={toggleShortlistMutation.isPending}
              >
                <Bookmark className={cn("mr-1.5 h-3.5 w-3.5", isShortlisted && "fill-amber-400 text-amber-400")} />
                {isShortlisted ? "Shortlisted" : "Shortlist"}
              </Button>
              <ConnectButton
                profileId={match.id}
                size="sm"
                className="h-10 rounded-full px-5 text-xs font-semibold shadow-xs"
                disabled={interactionsLocked}
                title={interactionsLocked ? "Verify to send interest" : undefined}
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
      <ProfileMutualUnlockDialog
        open={mutualUnlockDialog.open}
        onOpenChange={mutualUnlockDialog.setOpen}
        reason={mutualUnlockDialog.reason}
      />
    </article>
  )
}