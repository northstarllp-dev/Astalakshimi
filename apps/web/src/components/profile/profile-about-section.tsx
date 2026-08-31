"use client"

import * as React from "react"
import Link from "next/link"
import { Sparkles, Phone, FileText, Eye, Download, Lock } from "lucide-react"
import { cn, getMediaUrl } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  ProfileMutualUnlockDialog,
  useMutualUnlockDialog,
} from "@/components/profile/profile-mutual-unlock-dialog"
import {
  ProfileContactUnlockDialog,
  type ContactAccessState,
} from "@/components/profile/profile-contact-unlock-dialog"

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-border/70 py-3 last:border-0">
      <dt className="shrink-0 text-sm text-muted-foreground">{label}</dt>
      <dd className="text-right text-sm font-medium text-foreground">{value}</dd>
    </div>
  )
}

function formatPhone(phone: string) {
  const digits = phone.replace(/\D/g, "")
  if (digits.length === 10) {
    return `+91 ${digits.slice(0, 5)} ${digits.slice(5)}`
  }
  if (digits.length === 12 && digits.startsWith("91")) {
    return `+91 ${digits.slice(2, 7)} ${digits.slice(7)}`
  }
  return phone.startsWith("+") ? phone : `+${phone}`
}

const MASKED_PHONE = "+91 ••••• •••••"

type ProfileAboutSectionProps = {
  profileId: string
  gender: string
  maritalStatus: string
  religion: string
  community: string
  motherTongue: string
  city: string
  state: string
  hasHoroscope?: boolean
  horoscopeFileName?: string | null
  horoscopeS3Key?: string | null
  contactPhone?: string | null
  initialMutualConnect?: boolean
  contactAccess?: ContactAccessState | null
}

export function ProfileAboutSection({
  profileId,
  gender,
  maritalStatus,
  religion,
  community,
  motherTongue,
  city,
  state,
  hasHoroscope,
  horoscopeFileName,
  horoscopeS3Key,
  contactPhone,
  initialMutualConnect = false,
  contactAccess,
}: ProfileAboutSectionProps) {
  const horoscopeDialog = useMutualUnlockDialog()
  const [contactOpen, setContactOpen] = React.useState(false)
  const [revealOpen, setRevealOpen] = React.useState(false)
  const [storedPhone, setStoredPhone] = React.useState<string | null>(null)
  const [isRevealed, setIsRevealed] = React.useState(false)

  React.useEffect(() => {
    setStoredPhone(contactPhone ?? null)
    setIsRevealed(false)
  }, [contactPhone, profileId])

  const canViewContact = Boolean(contactAccess?.canView || storedPhone)
  const canViewHoroscope = Boolean(
    (initialMutualConnect && contactAccess?.isMutualBenefit) || horoscopeS3Key
  )

  const handlePhoneClick = () => {
    if (canViewContact && storedPhone) {
      setRevealOpen(true)
      return
    }
    setContactOpen(true)
  }

  const confirmReveal = () => {
    setIsRevealed(true)
    setRevealOpen(false)
  }

  const horoscopeUrl = horoscopeS3Key ? getMediaUrl(horoscopeS3Key) : null
  const horoscopeTitle = horoscopeFileName || "Horoscope PDF"

  return (
    <>
      <section className="rounded-2xl border border-border bg-card p-5 shadow-sm">
        <div className="mb-4 flex items-center gap-2">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <Sparkles className="h-4 w-4" />
          </span>
          <h2 className="font-serif text-lg font-bold">
            {gender === "Female" ? "About her" : "About him"}
          </h2>
        </div>

        <dl>
          <DetailRow label="Marital status" value={maritalStatus} />
          <DetailRow label="Religion" value={religion} />
          <DetailRow label="Community" value={community} />
          <DetailRow label="Mother tongue" value={motherTongue} />
          <DetailRow label="Lives in" value={`${city}, ${state}`} />

          <div className="flex items-start justify-between gap-4 border-b border-border/70 py-3 last:border-0">
            <dt className="flex shrink-0 items-center gap-1.5 text-sm text-muted-foreground">
              <Phone className="h-3.5 w-3.5" />
              Mobile no.
            </dt>
            <dd className="text-right">
              {isRevealed && storedPhone ? (
                <span className="text-sm font-medium text-foreground">{formatPhone(storedPhone)}</span>
              ) : (
                <button
                  type="button"
                  onClick={handlePhoneClick}
                  className={cn(
                    "inline-flex items-center gap-1.5 rounded-lg px-2 py-1 text-sm font-medium tracking-wide text-muted-foreground",
                    "transition-colors hover:bg-muted/60 hover:text-foreground"
                  )}
                  aria-label={
                    canViewContact
                      ? "Mobile number hidden. Tap to confirm reveal."
                      : "Mobile number locked. Tap to unlock."
                  }
                >
                  <span className="font-mono">{MASKED_PHONE}</span>
                  {canViewContact ? (
                    <Eye className="h-3.5 w-3.5 text-primary/70" />
                  ) : (
                    <Lock className="h-3.5 w-3.5 text-primary/70" />
                  )}
                </button>
              )}
            </dd>
          </div>

          {hasHoroscope && (
            <div className="flex flex-col gap-3 py-3 sm:flex-row sm:items-center sm:justify-between">
              <dt className="flex items-center gap-1.5 text-sm text-muted-foreground">
                <FileText className="h-3.5 w-3.5" />
                Horoscope
              </dt>
              <dd className="flex flex-wrap justify-end gap-2">
                {canViewHoroscope && horoscopeUrl ? (
                  <>
                    <Dialog>
                      <DialogTrigger asChild>
                        <Button type="button" variant="soft" size="sm">
                          <Eye className="mr-1.5 h-4 w-4" />
                          View
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="max-h-[90vh] w-[min(96vw,720px)] max-w-none p-0">
                        <DialogHeader className="border-b border-border px-4 py-3">
                          <DialogTitle>{horoscopeTitle}</DialogTitle>
                        </DialogHeader>
                        <iframe
                          src={horoscopeUrl}
                          title={horoscopeTitle}
                          className="h-[min(70vh,640px)] w-full border-0"
                        />
                      </DialogContent>
                    </Dialog>
                    <Button type="button" variant="outline" size="sm" asChild>
                      <Link href={horoscopeUrl} download={horoscopeTitle} target="_blank" rel="noopener noreferrer">
                        <Download className="mr-1.5 h-4 w-4" />
                        Download
                      </Link>
                    </Button>
                  </>
                ) : (
                  <>
                    <Button
                      type="button"
                      variant="soft"
                      size="sm"
                      onClick={() => horoscopeDialog.prompt("horoscope")}
                    >
                      <Eye className="mr-1.5 h-4 w-4" />
                      View
                      <Lock className="ml-1.5 h-3.5 w-3.5 opacity-70" />
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => horoscopeDialog.prompt("horoscope")}
                    >
                      <Download className="mr-1.5 h-4 w-4" />
                      Download
                      <Lock className="ml-1.5 h-3.5 w-3.5 opacity-70" />
                    </Button>
                  </>
                )}
              </dd>
            </div>
          )}
        </dl>
      </section>

      <ProfileContactUnlockDialog
        open={contactOpen}
        onOpenChange={setContactOpen}
        profileId={profileId}
        access={contactAccess}
        onUnlocked={(phone) => {
          if (phone) setStoredPhone(phone)
        }}
      />
      <Dialog open={revealOpen} onOpenChange={setRevealOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Reveal mobile number?</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            This contact is shared privately. Confirm to view the full number on this device.
          </p>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button type="button" variant="outline" onClick={() => setRevealOpen(false)}>
              Cancel
            </Button>
            <Button type="button" onClick={confirmReveal}>
              Confirm reveal
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <ProfileMutualUnlockDialog
        open={horoscopeDialog.open}
        onOpenChange={horoscopeDialog.setOpen}
        reason="horoscope"
      />
    </>
  )
}
