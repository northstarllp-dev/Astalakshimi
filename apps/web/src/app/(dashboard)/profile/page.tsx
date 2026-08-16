"use client"

import * as React from "react"
import Image from "next/image"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { emptySignupData, loadProfile, type SignupData, VERIFICATION_SLA_HOURS } from "@/lib/profile-store"
import { profileCompleteness } from "@/lib/user-activity"
import {
  Camera,
  ChevronRight,
  Clock3,
  FileText,
  Pencil,
  Settings,
  ShieldCheck,
  Sparkles,
} from "lucide-react"

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-border/70 py-3 last:border-0">
      <dt className="shrink-0 text-sm text-muted-foreground">{label}</dt>
      <dd className="text-right text-sm font-medium text-foreground">{value || "—"}</dd>
    </div>
  )
}

export default function MyProfilePage() {
  const router = useRouter()
  const [profile, setProfile] = React.useState<SignupData | null>(null)

  React.useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setProfile(loadProfile())
  }, [])

  const data = profile ?? emptySignupData()
  const completeness = profileCompleteness(data)
  const pending = data.verificationStatus === "pending"
  const verified = data.verificationStatus === "verified"
  const age =
    data.dobYear && data.dobMonth && data.dobDay
      ? Math.max(
          18,
          new Date().getFullYear() -
            Number(data.dobYear) -
            (new Date() < new Date(Number(data.dobYear), Number(data.dobMonth) - 1, Number(data.dobDay)) ? 1 : 0)
        )
      : null

  if (!profile) {
    return (
      <main className="mx-auto max-w-3xl px-4 py-10 text-center">
        <h1 className="font-serif text-2xl font-bold">Complete your profile</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Sign up to create your Astalakshimi profile, then manage it here.
        </p>
        <Button className="mt-6" onClick={() => router.push("/register")}>
          Create profile
        </Button>
      </main>
    )
  }

  return (
    <main className="mx-auto max-w-3xl space-y-5 px-3 py-5 sm:px-4 md:py-8">
      <section className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
        <div className="relative h-36 bg-gradient-to-br from-[#3d120c] via-[#6b1024] to-primary sm:h-44">
          <div className="absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-black/40 to-transparent" />
        </div>
        <div className="-mt-14 px-4 pb-5 sm:px-6">
          <div className="flex items-end gap-4">
            <div className="relative h-24 w-24 overflow-hidden rounded-2xl border-4 border-card bg-muted shadow-md sm:h-28 sm:w-28">
              {data.photos[0] ? (
                <Image
                  src={data.photos[0]}
                  alt={data.fullName}
                  fill
                  className={`object-cover ${pending ? "blur-[2px]" : ""}`}
                  sizes="112px"
                />
              ) : (
                <div className="flex h-full items-center justify-center text-2xl font-bold text-primary">
                  {(data.fullName || "M")[0]}
                </div>
              )}
            </div>
            <div className="min-w-0 flex-1 pb-1">
              <h1 className="truncate font-serif text-2xl font-bold">
                {data.fullName || "Member"}
                {age ? `, ${age}` : ""}
              </h1>
              <p className="text-sm text-muted-foreground">
                {[data.city, data.caste, data.motherTongue].filter(Boolean).join(" · ") || "Add your details"}
              </p>
            </div>
          </div>

          <div className="mt-4">
            <div className="mb-1.5 flex items-center justify-between text-xs font-semibold">
              <span className="text-muted-foreground">Profile completeness</span>
              <span className="text-primary">{completeness}%</span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-muted">
              <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${completeness}%` }} />
            </div>
          </div>

          <div className="mt-3 flex flex-wrap gap-2">
            {pending && (
              <Badge className="border-transparent bg-amber-100 text-amber-900">
                <Clock3 className="h-3 w-3" /> Under review · &lt;{VERIFICATION_SLA_HOURS}h
              </Badge>
            )}
            {verified && (
              <Badge className="border-transparent bg-emerald-100 text-emerald-800">
                <ShieldCheck className="h-3 w-3" /> Verified
              </Badge>
            )}
            {data.horoscopeName && (
              <Badge variant="outline">
                <FileText className="h-3 w-3" /> Horoscope uploaded
              </Badge>
            )}
          </div>

          <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
            <Link href="/profile/edit">
              <Button variant="outline" size="sm" className="h-10 w-full">
                <Pencil className="mr-1.5 h-3.5 w-3.5" /> Edit
              </Button>
            </Link>
            <Link href="/profile/edit#photos">
              <Button variant="outline" size="sm" className="h-10 w-full">
                <Camera className="mr-1.5 h-3.5 w-3.5" /> Photos
              </Button>
            </Link>
            <Link href="/profile/edit#horoscope">
              <Button variant="outline" size="sm" className="h-10 w-full">
                <FileText className="mr-1.5 h-3.5 w-3.5" /> Horoscope
              </Button>
            </Link>
            <Link href="/settings">
              <Button variant="outline" size="sm" className="h-10 w-full">
                <Settings className="mr-1.5 h-3.5 w-3.5" /> Settings
              </Button>
            </Link>
          </div>
        </div>
      </section>

      <section className="rounded-2xl border border-border bg-card p-5 shadow-sm">
        <h2 className="font-serif text-lg font-bold">Basics</h2>
        <dl className="mt-2">
          <Row label="Gender" value={data.gender} />
          <Row label="Marital status" value={data.maritalStatus} />
          <Row label="Profile for" value={data.profileFor} />
          <Row label="Phone" value={data.phone ? `+91 ${data.phone}` : ""} />
        </dl>
      </section>

      <section className="rounded-2xl border border-border bg-card p-5 shadow-sm">
        <h2 className="font-serif text-lg font-bold">Community</h2>
        <dl className="mt-2">
          <Row label="Religion" value={data.religion} />
          <Row label="Caste / community" value={data.caste} />
          <Row label="Mother tongue" value={data.motherTongue} />
          <Row label="City" value={data.city} />
        </dl>
      </section>

      <section className="rounded-2xl border border-border bg-card p-5 shadow-sm">
        <h2 className="font-serif text-lg font-bold">Education & career</h2>
        <dl className="mt-2">
          <Row label="Education" value={data.otherEducation || data.education} />
          <Row label="Occupation" value={data.otherOccupation || data.occupation} />
          <Row label="Company" value={data.companyName} />
          <Row label="Income" value={data.annualIncome} />
        </dl>
      </section>

      <section id="preferences" className="rounded-2xl border border-border bg-card p-5 shadow-sm">
        <div className="flex items-center justify-between">
          <h2 className="font-serif text-lg font-bold">Partner preferences</h2>
          <Link href="/profile/edit#preferences" className="text-xs font-semibold text-primary">
            Edit
          </Link>
        </div>
        <dl className="mt-2">
          <Row label="Age range" value={`${data.prefAgeMin} – ${data.prefAgeMax} yrs`} />
          <Row label="Religions" value={data.prefReligion.join(", ")} />
        </dl>
      </section>

      <Link
        href="/plans"
        className="flex items-center gap-3 rounded-2xl border border-secondary/30 bg-gradient-to-r from-[#fff8ef] to-card p-4 shadow-sm"
      >
        <span className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary">
          <Sparkles className="h-5 w-5" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="font-semibold">Membership plans</p>
          <p className="text-sm text-muted-foreground">View Free & Community Plan options</p>
        </div>
        <ChevronRight className="h-5 w-5 text-muted-foreground" />
      </Link>
    </main>
  )
}
