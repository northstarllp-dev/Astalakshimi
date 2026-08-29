"use client"

import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import * as React from "react"
import Image from "next/image"
import Link from "next/link"
import { getMediaUrl, calculateProfileCompleteness } from "@/lib/utils"
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

function GridItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-1 rounded-xl bg-muted/30 p-3">
      <dt className="text-[11px] font-semibold tracking-wide text-muted-foreground uppercase">{label}</dt>
      <dd className="text-sm font-medium text-foreground">{value || "—"}</dd>
    </div>
  )
}

export default function MyProfilePage() {
  const router = useRouter()
  const { data: profile = null, isPending } = useProfileQuery()
  const [activeTab, setActiveTab] = React.useState("basics")

  const data = profile ?? emptySignupData()
  const completeness = calculateProfileCompleteness(data)
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
      label: "Phone",
      done: Boolean(data.phone),
      href: "/settings",
      note: "Auto-earned",
    },
    {
      icon: IdCard,
      label: "Govt ID",
      done: verified,
      pending: pending && data.verificationMethod === "govt_id",
      href: "/profile/edit#verification",
      note: data.govtIdType || "Upload ID",
    },
    {
      icon: Users,
      label: "Family",
      done: false,
      href: "/profile/edit#verification",
      note: "Not verified",
    },
  ]

  const tabs = [
    { id: "basics", label: "Basic Details" },
    { id: "career", label: "Career & Education" },
    { id: "community", label: "Community & Location" },
    { id: "family", label: "Family" },
    { id: "preferences", label: "Horoscope & Prefs" },
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
    <main className="mx-auto max-w-4xl space-y-5 px-3 py-5 sm:px-4 md:py-8">
      {/* Header card with ring and actions consolidated */}
      <section className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
        <div className="relative h-36 bg-gradient-to-br from-[#3d120c] via-[#6b1024] to-primary sm:h-40">
          <div className="absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-black/40 to-transparent" />
        </div>
        <div className="-mt-14 px-4 pb-5 sm:px-6">
          <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
            <div className="flex items-end gap-4">
              <div className="relative h-24 w-24 shrink-0 overflow-hidden rounded-2xl border-4 border-card bg-muted shadow-md sm:h-28 sm:w-28">
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
            
            {/* Quick Actions moved to the side on desktop */}
            <div className="flex shrink-0 items-center gap-2 pb-1">
              <Link href="/profile/edit">
                <Button variant="outline" size="sm" className="h-9">
                  <Pencil className="mr-1.5 h-3.5 w-3.5" /> Edit Profile
                </Button>
              </Link>
              <Link href="/settings">
                <Button variant="secondary" size="sm" className="h-9 w-9 px-0" aria-label="Privacy Settings">
                  <ShieldCheck className="h-4 w-4" />
                </Button>
              </Link>
            </div>
          </div>

          <div className="mt-5 grid gap-4 lg:grid-cols-2 lg:items-center">
            {/* Completeness ring */}
            <div className="flex items-center gap-4 rounded-2xl bg-muted/30 p-3.5">
              <CompletenessRing percentage={completeness} size={64} strokeWidth={6} />
              <div className="min-w-0 flex-1">
                <p className="font-serif text-sm font-bold">Profile completeness</p>
                <p className="mt-0.5 text-xs text-muted-foreground leading-tight">
                  {completeness >= 90
                    ? "Excellent — your profile stands out to families."
                    : completeness >= 80
                      ? "Profile complete. Discover opens after verification."
                      : completeness >= 60
                        ? "Good progress. Reach 80% to unlock Discover."
                        : "Signup is short — add details to unlock matches."}
                </p>
              </div>
            </div>
            
            {/* Badges grouped in a compact layout */}
            <div className="flex flex-wrap items-center gap-2 lg:justify-end">
              {pending && (
                <Badge className="border-transparent bg-amber-100 text-amber-900">
                  <Clock3 className="mr-1 h-3 w-3" /> Review &lt;{VERIFICATION_SLA_HOURS}h
                </Badge>
              )}
              {verified && (
                <Badge className="border-transparent bg-emerald-100 text-emerald-800">
                  <ShieldCheck className="mr-1 h-3 w-3" /> Verified
                </Badge>
              )}
              {data.horoscopeName && (
                <Badge variant="outline" className="bg-background">
                  <FileText className="mr-1 h-3 w-3" /> Horoscope
                </Badge>
              )}
              {data.photos.length > 0 && (
                <Link href="/profile/edit#photos">
                  <Badge variant="outline" className="cursor-pointer hover:bg-muted bg-background">
                    <Camera className="mr-1 h-3 w-3" /> {data.photos.length} Photos
                  </Badge>
                </Link>
              )}
            </div>
          </div>
        </div>
      </section>

      <div className="grid gap-5 md:grid-cols-12 md:items-start">
        {/* Verification score card (Compact Grid) */}
        <section className="rounded-2xl border border-border bg-card p-5 shadow-sm md:col-span-12">
          <div className="mb-4">
            <h2 className="font-serif text-lg font-bold">Verifications</h2>
            <p className="text-xs text-muted-foreground">Build trust with families by completing verifications.</p>
          </div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {verificationItems.map((item: any) => {
              const Icon = item.icon
              return (
                <Link
                  key={item.label}
                  href={item.href}
                  className="flex items-center gap-3 rounded-xl border border-border/50 bg-muted/20 p-3 transition-colors hover:bg-muted/50 hover:border-border"
                >
                  <span
                    className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${
                      item.done ? "bg-emerald-100 text-emerald-700" : "bg-muted text-muted-foreground"
                    }`}
                  >
                    <Icon className="h-4 w-4" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold">{item.label}</p>
                    <p className="truncate text-[10px] text-muted-foreground">{item.note}</p>
                  </div>
                  {item.done ? (
                    <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                  ) : item.pending ? (
                    <Clock3 className="h-4 w-4 text-amber-500 shrink-0" />
                  ) : (
                    <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
                  )}
                </Link>
              )
            })}
          </div>
        </section>

        {/* Details Section with Tabs */}
        <section className="rounded-2xl border border-border bg-card shadow-sm md:col-span-12">
          {/* Tabs header */}
          <div className="flex overflow-x-auto border-b border-border hide-scrollbar">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`whitespace-nowrap border-b-2 px-5 py-3.5 text-sm font-semibold transition-colors ${
                  activeTab === tab.id
                    ? "border-primary text-primary"
                    : "border-transparent text-muted-foreground hover:text-foreground"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div className="p-5">
            {activeTab === "basics" && (
              <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
                <div>
                  <div className="mb-4 flex items-center justify-between">
                    <h3 className="font-serif text-lg font-bold">About me</h3>
                    <Link href="/profile/edit#about" className="text-xs font-semibold text-primary hover:underline">
                      Edit
                    </Link>
                  </div>
                  <p className="text-sm leading-relaxed text-foreground rounded-xl bg-muted/20 p-4">
                    {data.aboutMe || "No description provided."}
                  </p>
                </div>

                <div>
                  <div className="mb-4 flex items-center justify-between">
                    <h3 className="font-serif text-lg font-bold">Basic Info</h3>
                    <Link href="/profile/edit#basics" className="text-xs font-semibold text-primary hover:underline">
                      Edit
                    </Link>
                  </div>
                  <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                    <GridItem label="Gender" value={data.gender} />
                    <GridItem label="Marital status" value={data.maritalStatus} />
                    <GridItem label="Height" value={data.height} />
                    <GridItem label="Complexion" value={data.complexion} />
                    <GridItem label="Diet" value={data.diet} />
                    <GridItem label="Profile for" value={data.profileFor} />
                    <GridItem label="Phone" value={data.phone ? `+91 ${data.phone}` : ""} />
                  </dl>
                </div>
              </div>
            )}

            {activeTab === "career" && (
              <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
                <div>
                  <div className="mb-4 flex items-center justify-between">
                    <h3 className="font-serif text-lg font-bold">Education & Career</h3>
                    <Link href="/profile/edit#career" className="text-xs font-semibold text-primary hover:underline">
                      Edit
                    </Link>
                  </div>
                  <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                    <GridItem label="Education" value={data.otherEducation || data.education} />
                    <GridItem label="Occupation" value={data.otherOccupation || data.occupation} />
                    <GridItem label="Company" value={data.companyName} />
                    <GridItem label="Income" value={data.annualIncome} />
                  </dl>
                </div>
              </div>
            )}

            {activeTab === "community" && (
              <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
                <div>
                  <div className="mb-4 flex items-center justify-between">
                    <h3 className="font-serif text-lg font-bold">Community</h3>
                    <Link href="/profile/edit#community" className="text-xs font-semibold text-primary hover:underline">
                      Edit
                    </Link>
                  </div>
                  <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                    <GridItem label="Religion" value={data.religion} />
                    <GridItem label="Caste" value={data.caste} />
                    <GridItem label="Subcaste / Gotra" value={data.subcaste || data.gotra} />
                    <GridItem label="Mother Tongue" value={data.motherTongue} />
                  </dl>
                </div>
                <div>
                  <div className="mb-4 flex items-center justify-between">
                    <h3 className="font-serif text-lg font-bold">Location</h3>
                    <Link href="/profile/edit#location" className="text-xs font-semibold text-primary hover:underline">
                      Edit
                    </Link>
                  </div>
                  <dl className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                    <GridItem label="City" value={data.city} />
                    <GridItem label="State" value={data.state} />
                    <GridItem label="Willing to relocate" value={data.willingToRelocate} />
                  </dl>
                </div>
              </div>
            )}

            {activeTab === "family" && (
              <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
                <div>
                  <div className="mb-4 flex items-center justify-between">
                    <h3 className="font-serif text-lg font-bold">Family Details</h3>
                    <Link href="/profile/edit#family" className="text-xs font-semibold text-primary hover:underline">
                      Edit
                    </Link>
                  </div>
                  <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                    <GridItem label="Family Type" value={data.familyType} />
                    <GridItem label="Family Status" value={data.familyStatus} />
                    <GridItem label="Father's Occupation" value={data.fatherOccupation} />
                    <GridItem label="Mother's Occupation" value={data.motherOccupation} />
                    <GridItem label="Siblings" value={data.siblings} />
                  </dl>
                </div>
              </div>
            )}

            {activeTab === "preferences" && (
              <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
                <div>
                  <div className="mb-4 flex items-center justify-between">
                    <h3 className="font-serif text-lg font-bold">Horoscope</h3>
                    <Link href="/profile/edit#horoscope" className="text-xs font-semibold text-primary hover:underline">
                      Edit
                    </Link>
                  </div>
                  <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                    <GridItem label="Birth Time" value={data.birthTime} />
                    <GridItem label="Birth Place" value={data.birthPlace} />
                    <GridItem label="Star / Nakshatra" value={data.star} />
                    <GridItem label="Rashi" value={data.rashi} />
                    <GridItem label="Manglik" value={data.manglik} />
                  </dl>
                </div>
                
                <div>
                  <div className="mb-4 flex items-center justify-between">
                    <h3 className="font-serif text-lg font-bold">Partner Preferences</h3>
                    <Link href="/profile/edit#preferences" className="text-xs font-semibold text-primary hover:underline">
                      Edit
                    </Link>
                  </div>
                  <dl className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <GridItem label="Age Range" value={`${data.prefAgeMin} – ${data.prefAgeMax} yrs`} />
                    <GridItem label="Religions" value={data.prefReligion.join(", ")} />
                  </dl>
                </div>
              </div>
            )}
          </div>
        </section>

        <Link
          href="/plans"
          className="flex items-center gap-3 rounded-2xl border border-secondary/30 bg-gradient-to-r from-[#fff8ef] to-card p-4 shadow-sm md:col-span-12"
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
      </div>
    </main>
  )
}
