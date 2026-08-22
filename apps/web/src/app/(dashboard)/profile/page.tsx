"use client"

import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import * as React from "react"
import Image from "next/image"
import Link from "next/link"
import { getMediaUrl } from "@/lib/utils"
import { useProfileQuery } from "@/hooks/queries"
import { emptySignupData, VERIFICATION_SLA_HOURS } from "@/lib/profile-store"
import { CompletenessRing } from "@/components/profile/completeness-ring"
import {
  Camera,
  CheckCircle2,
  ChevronRight,
  Clock3,
  FileText,
  IdCard,
  Pencil,
  Phone,
  ShieldCheck,
  Sparkles,
  Users,
  XCircle,
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
  const { data: profile = null, isPending } = useProfileQuery()

  const data = profile ?? emptySignupData()
  const completeness = 100
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

  const verificationItems = [
    {
      icon: Phone,
      label: "Phone verified",
      done: Boolean(data.phone),
      href: "/settings",
      note: "Auto-earned at signup",
    },
    {
      icon: IdCard,
      label: "ID verified",
      done: verified,
      pending: pending && data.verificationMethod === "govt_id",
      href: "/profile/edit#verification",
      note: data.govtIdType ? `${data.govtIdType} uploaded` : "Upload Aadhaar / PAN / Passport",
    },
    {
      icon: Users,
      label: "Family verified",
      done: false,
      href: "/profile/edit#verification",
      note: "Add a family member's number",
    },
  ]

  if (isPending) {
    return <main className="px-4 py-10 text-center text-sm text-muted-foreground">Loading…</main>
  }

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
      {/* Header card with ring */}
      <section className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
        <div className="relative h-36 bg-gradient-to-br from-[#3d120c] via-[#6b1024] to-primary sm:h-44">
          <div className="absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-black/40 to-transparent" />
        </div>
        <div className="-mt-14 px-4 pb-5 sm:px-6">
          <div className="flex items-end gap-4">
            <div className="relative h-24 w-24 overflow-hidden rounded-2xl border-4 border-card bg-muted shadow-md sm:h-28 sm:w-28">
              {data.photos[0] ? (
                <Image
                  src={getMediaUrl(data.photos[0])}
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

          {/* Completeness ring */}
          <div className="mt-4 flex items-center gap-4 rounded-2xl bg-muted/40 p-4">
            <CompletenessRing percentage={completeness} size={88} strokeWidth={8} />
            <div className="min-w-0 flex-1">
              <p className="font-serif text-base font-bold">Profile completeness</p>
              <p className="mt-0.5 text-sm text-muted-foreground">
                {completeness >= 90
                  ? "Excellent — your profile stands out to families."
                  : completeness >= 80
                    ? "Profile is complete. Discover opens after verification."
                    : completeness >= 60
                      ? "Good progress. Reach 80% and get verified to unlock Discover."
                      : "Signup is kept short — add the rest to unlock Discover and Interests."}
              </p>
              <Link href="/profile/edit" className="mt-1.5 inline-block text-xs font-semibold text-primary hover:underline">
                Improve your score →
              </Link>
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
                <ShieldCheck className="mr-1.5 h-3.5 w-3.5" /> Privacy
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Verification score card */}
      <section className="rounded-2xl border border-border bg-card p-5 shadow-sm">
        <h2 className="font-serif text-lg font-bold">Verification badges</h2>
        <p className="mt-0.5 text-sm text-muted-foreground">Build trust with families by completing verifications.</p>
        <div className="mt-4 space-y-2.5">
          {verificationItems.map((item: any) => {
            const Icon = item.icon
            return (
              <Link
                key={item.label}
                href={item.href}
                className="flex items-center gap-3 rounded-xl bg-muted/40 px-3 py-3 transition-colors hover:bg-muted"
              >
                <span
                  className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${
                    item.done ? "bg-emerald-100 text-emerald-700" : "bg-muted text-muted-foreground"
                  }`}
                >
                  <Icon className="h-5 w-5" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold">{item.label}</p>
                  <p className="text-xs text-muted-foreground">{item.note}</p>
                </div>
                {item.done ? (
                  <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                ) : item.pending ? (
                  <Clock3 className="h-5 w-5 text-amber-500" />
                ) : (
                  <ChevronRight className="h-5 w-5 text-muted-foreground" />
                )}
              </Link>
            )
          })}
        </div>
      </section>

      {/* Basics */}
      <section className="rounded-2xl border border-border bg-card p-5 shadow-sm">
        <div className="flex items-center justify-between">
          <h2 className="font-serif text-lg font-bold">Basic info</h2>
          <Link href="/profile/edit#basics" className="text-xs font-semibold text-primary hover:underline">
            Edit
          </Link>
        </div>
        <dl className="mt-2">
          <Row label="Gender" value={data.gender} />
          <Row label="Marital status" value={data.maritalStatus} />
          <Row label="Height" value={data.height} />
          <Row label="Complexion" value={data.complexion} />
          <Row label="Diet" value={data.diet} />
          <Row label="Profile for" value={data.profileFor} />
          <Row label="Phone" value={data.phone ? `+91 ${data.phone}` : ""} />
        </dl>
      </section>

      {/* Community */}
      <section className="rounded-2xl border border-border bg-card p-5 shadow-sm">
        <div className="flex items-center justify-between">
          <h2 className="font-serif text-lg font-bold">Community details</h2>
          <Link href="/profile/edit#community" className="text-xs font-semibold text-primary hover:underline">
            Edit
          </Link>
        </div>
        <dl className="mt-2">
          <Row label="Religion" value={data.religion} />
          <Row label="Caste / community" value={data.caste} />
          <Row label="Subcaste / gotra" value={data.subcaste || data.gotra} />
          <Row label="Star / nakshatra" value={data.star} />
          <Row label="Rashi" value={data.rashi} />
          <Row label="Manglik" value={data.manglik} />
          <Row label="Mother tongue" value={data.motherTongue} />
        </dl>
      </section>

      {/* Education & career */}
      <section className="rounded-2xl border border-border bg-card p-5 shadow-sm">
        <div className="flex items-center justify-between">
          <h2 className="font-serif text-lg font-bold">Education & career</h2>
          <Link href="/profile/edit#career" className="text-xs font-semibold text-primary hover:underline">
            Edit
          </Link>
        </div>
        <dl className="mt-2">
          <Row label="Education" value={data.otherEducation || data.education} />
          <Row label="Occupation" value={data.otherOccupation || data.occupation} />
          <Row label="Company" value={data.companyName} />
          <Row label="Income" value={data.annualIncome} />
        </dl>
      </section>

      {/* Family */}
      <section className="rounded-2xl border border-border bg-card p-5 shadow-sm">
        <div className="flex items-center justify-between">
          <h2 className="font-serif text-lg font-bold">Family details</h2>
          <Link href="/profile/edit#family" className="text-xs font-semibold text-primary hover:underline">
            Edit
          </Link>
        </div>
        <dl className="mt-2">
          <Row label="Family type" value={data.familyType} />
          <Row label="Family status" value={data.familyStatus} />
          <Row label="Father's occupation" value={data.fatherOccupation} />
          <Row label="Mother's occupation" value={data.motherOccupation} />
          <Row label="Siblings" value={data.siblings} />
        </dl>
      </section>

      {/* Location */}
      <section className="rounded-2xl border border-border bg-card p-5 shadow-sm">
        <div className="flex items-center justify-between">
          <h2 className="font-serif text-lg font-bold">Location</h2>
          <Link href="/profile/edit#location" className="text-xs font-semibold text-primary hover:underline">
            Edit
          </Link>
        </div>
        <dl className="mt-2">
          <Row label="City" value={data.city} />
          <Row label="State" value={data.state} />
          <Row label="Willing to relocate" value={data.willingToRelocate} />
        </dl>
      </section>

      {/* About me */}
      {data.aboutMe && (
        <section className="rounded-2xl border border-border bg-card p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <h2 className="font-serif text-lg font-bold">About me</h2>
            <Link href="/profile/edit#about" className="text-xs font-semibold text-primary hover:underline">
              Edit
            </Link>
          </div>
          <p className="mt-2 text-sm leading-relaxed text-foreground">{data.aboutMe}</p>
        </section>
      )}

      {/* Partner preferences */}
      <section id="preferences" className="rounded-2xl border border-border bg-card p-5 shadow-sm">
        <div className="flex items-center justify-between">
          <h2 className="font-serif text-lg font-bold">Partner preferences</h2>
          <Link href="/profile/edit#preferences" className="text-xs font-semibold text-primary hover:underline">
            Edit
          </Link>
        </div>
        <dl className="mt-2">
          <Row label="Age range" value={`${data.prefAgeMin} – ${data.prefAgeMax} yrs`} />
          <Row label="Religions" value={data.prefReligion.join(", ")} />
        </dl>
      </section>

      {/* Horoscope */}
      <section className="rounded-2xl border border-border bg-card p-5 shadow-sm">
        <div className="flex items-center justify-between">
          <h2 className="font-serif text-lg font-bold">Horoscope details</h2>
          <Link href="/profile/edit#horoscope" className="text-xs font-semibold text-primary hover:underline">
            Edit
          </Link>
        </div>
        <dl className="mt-2">
          <Row label="Birth time" value={data.birthTime} />
          <Row label="Birth place" value={data.birthPlace} />
          <Row label="Horoscope PDF" value={data.horoscopeName} />
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
