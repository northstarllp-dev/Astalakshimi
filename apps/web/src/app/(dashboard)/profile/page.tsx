"use client"

import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import * as React from "react"
import Image from "next/image"
import Link from "next/link"
import { displayHeight, formatHeightFromCm } from "@/lib/input-units"
import { maritalAsksChildren } from "@/lib/identity-fields"
import { getMediaUrl } from "@/lib/utils"
import { useProfileQuery } from "@/hooks/queries"
import { emptySignupData, VERIFICATION_SLA_HOURS, formatSiblings, getPrimaryPhotoSrc, PHOTO_PRIVACY } from "@/lib/profile-store"
import { CompletenessRing } from "@/components/profile/completeness-ring"
import { getProfileCompletenessStats, getRequiredFieldEditHash } from "@/lib/portal-access"
import {
  CheckCircle2,
  ChevronRight,
  IdCard,
  Pencil,
  Phone,
  Settings,
  ScanFace,
  Sparkles,
} from "lucide-react"

function listValue(values?: string[]) {
  return values?.map((value) => value.trim()).filter(Boolean).join(", ") || ""
}

function GridItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-1 rounded-xl bg-muted/30 p-3">
      <dt className="text-[11px] font-semibold tracking-wide text-muted-foreground uppercase">{label}</dt>
      <dd className="text-sm font-medium text-foreground">{value || "Not specified"}</dd>
    </div>
  )
}

export default function MyProfilePage() {
  const router = useRouter()
  const { data: profile = null, isPending } = useProfileQuery()
  const [activeTab, setActiveTab] = React.useState("basics")

  const data = profile ?? emptySignupData()
  const primaryPhoto = getPrimaryPhotoSrc(data)
  const completenessStats = getProfileCompletenessStats(data)
  const completeness = completenessStats.percentage
  const pending = data.verificationStatus === "pending"
  const verified = data.verificationStatus === "verified"
  const rejected = data.verificationStatus === "rejected"
  const age =
    data.dobYear && data.dobMonth && data.dobDay
      ? Math.max(
          18,
          new Date().getFullYear() -
            Number(data.dobYear) -
            (new Date() < new Date(Number(data.dobYear), Number(data.dobMonth) - 1, Number(data.dobDay)) ? 1 : 0)
        )
      : null

  const phoneReady = Boolean(data.phone) && data.consentAccepted === true
  const hasSelfie = Boolean(data.selfieS3Key || data.selfiePhoto)
  const hasGovtId = Boolean(data.govtIdS3Key || data.govtIdPhoto || data.govtIdType)
  const govtIdName = data.govtIdType || "government ID"
  const reviewNote = `Under review, within ${VERIFICATION_SLA_HOURS} hours`
  const rejectionNote = data.rejectionReason || "Re-upload"

  const trustChecks = [
    {
      id: "phone",
      label: "Phone",
      sentenceName: "phone",
      icon: Phone,
      done: phoneReady,
      pending: false,
      rejected: false,
      href: "/settings",
      status: "Phone and consent",
    },
    {
      id: "selfie",
      label: "Selfie",
      sentenceName: "selfie",
      icon: ScanFace,
      done: verified && hasSelfie,
      pending: pending && hasSelfie,
      rejected,
      href: "/profile/verify",
      status: rejected ? rejectionNote : pending && hasSelfie ? reviewNote : "Take a selfie",
    },
    {
      id: "govt-id",
      label: "Govt ID",
      sentenceName: govtIdName,
      icon: IdCard,
      done: verified && hasGovtId,
      pending: pending && hasGovtId,
      rejected,
      href: "/profile/verify",
      status: rejected ? rejectionNote : pending && hasGovtId ? reviewNote : "Upload ID",
    },
  ]
  const openChecks = trustChecks.filter((item) => !item.done)

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

  const placeLine = [data.city, data.caste, data.motherTongue].filter(Boolean).join(" · ")

  return (
    <main className="mx-auto max-w-4xl space-y-5 px-3 py-5 sm:px-4 md:py-8">
      <section className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
        <div className="h-1 bg-primary" aria-hidden="true" />
        <div className="px-4 pt-5 sm:px-6 sm:pt-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-4">
              <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-2xl border border-border bg-muted sm:h-24 sm:w-24">
                {primaryPhoto ? (
                  <Image
                    src={getMediaUrl(primaryPhoto)}
                    alt=""
                    fill
                    className={`object-cover ${pending ? "blur-[2px]" : ""}`}
                    sizes="96px"
                  />
                ) : (
                  <div className="flex h-full items-center justify-center font-serif text-2xl font-bold text-primary">
                    {(data.fullName || "M")[0]}
                  </div>
                )}
              </div>
              <div className="min-w-0">
                <h1 className="font-serif text-2xl font-semibold leading-tight text-foreground sm:text-3xl">
                  {data.fullName || "Member"}
                  {age ? <span className="font-normal text-muted-foreground">, {age}</span> : null}
                </h1>
                <p className="mt-1 text-sm text-muted-foreground">{placeLine || "Add your details"}</p>
                {data.horoscopeName || data.photos.length > 0 ? (
                  <p className="mt-1.5 flex flex-wrap gap-x-3 text-sm">
                    {data.horoscopeName ? (
                      <button
                        type="button"
                        onClick={() => setActiveTab("preferences")}
                        className="text-muted-foreground underline-offset-2 hover:text-primary hover:underline"
                      >
                        Horoscope
                      </button>
                    ) : null}
                    {data.photos.length > 0 ? (
                      <Link
                        href="/profile/edit#photos"
                        className="text-muted-foreground underline-offset-2 hover:text-primary hover:underline"
                      >
                        {data.photos.length} {data.photos.length === 1 ? "photo" : "photos"}
                      </Link>
                    ) : null}
                  </p>
                ) : null}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Link href="/profile/edit" className="min-w-0 flex-1 sm:flex-none">
                <Button className="h-11 w-full sm:w-auto">
                  <Pencil className="mr-1.5 h-4 w-4" aria-hidden="true" /> Edit profile
                </Button>
              </Link>
              <Link href="/settings">
                <Button variant="outline" className="h-11 w-11 px-0" aria-label="Settings">
                  <Settings className="h-4 w-4" aria-hidden="true" />
                </Button>
              </Link>
            </div>
          </div>

          <div className="mt-5 grid gap-4 rounded-2xl bg-muted/30 p-3 sm:grid-cols-2 sm:items-center sm:gap-0 sm:p-4">
            <div className="flex items-center gap-3 sm:pr-4">
              <CompletenessRing percentage={completeness} size={72} strokeWidth={6} />
              <div className="min-w-0">
                <p className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">Completeness</p>
                <p className="font-serif text-lg leading-tight text-foreground">
                  {completenessStats.filled} of {completenessStats.total}
                </p>
                {!completenessStats.requiredComplete ? (
                  <p className="mt-0.5 text-sm text-muted-foreground">
                    Fill the missing details to unlock interests and messaging.
                  </p>
                ) : (
                  <p className="mt-0.5 text-sm text-muted-foreground">Required details are in.</p>
                )}
                {!completenessStats.requiredComplete && completenessStats.missingRequired.length > 0 ? (
                  <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1">
                    {completenessStats.missingRequired.map((field) => (
                      <Link
                        key={field.id}
                        href={`/profile/edit${getRequiredFieldEditHash(field)}`}
                        className="text-sm font-medium text-primary underline-offset-2 hover:underline"
                      >
                        {field.label}
                      </Link>
                    ))}
                  </div>
                ) : null}
              </div>
            </div>

            <div className="sm:border-l sm:border-border sm:pl-4">
              <h2 className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">Verifications</h2>
              {trustChecks.some((item) => item.done) ? (
                <ul className="mt-2 flex flex-wrap gap-2">
                  {trustChecks
                    .filter((item) => item.done)
                    .map((item) => (
                      <li
                        key={item.id}
                        className="inline-flex items-center gap-1.5 rounded-full bg-card px-2.5 py-1 text-sm font-medium text-foreground"
                      >
                        <CheckCircle2 className="h-3.5 w-3.5 text-primary" aria-hidden="true" />
                        {item.label === "Govt ID" ? govtIdName : item.label}
                        <span className="sr-only">verified</span>
                      </li>
                    ))}
                </ul>
              ) : null}
              {openChecks.length > 0 ? (
                <ul className="mt-2 flex flex-col gap-2">
                  {openChecks.map((item) => {
                    const Icon = item.icon
                    return (
                      <li key={item.id}>
                        <Link
                          href={item.href}
                          className="flex min-h-11 items-center gap-3 rounded-xl border border-border bg-card px-3 py-2.5 transition-colors hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                        >
                          <Icon className="h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
                          <span className="min-w-0 flex-1">
                            <span className="block text-sm font-semibold text-foreground">{item.label}</span>
                            <span className="block text-sm text-muted-foreground">{item.status}</span>
                          </span>
                          <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
                        </Link>
                      </li>
                    )
                  })}
                </ul>
              ) : null}
            </div>
          </div>
        </div>

        <div className="flex overflow-x-auto border-t border-border hide-scrollbar">
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
                  <h3 className="mb-4 font-serif text-lg font-bold">About me</h3>
                  <p className="text-sm leading-relaxed text-foreground rounded-xl bg-muted/20 p-4">
                    {data.aboutMe || "No description provided."}
                  </p>
                </div>

                <div>
                  <h3 className="mb-4 font-serif text-lg font-bold">Basic Info</h3>
                  <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                    <GridItem label="Profile for" value={data.profileFor} />
                    <GridItem label="Gender" value={data.gender} />
                    <GridItem
                      label="Date of birth"
                      value={
                        data.dobYear && data.dobMonth && data.dobDay
                          ? new Date(
                              Number(data.dobYear),
                              Number(data.dobMonth) - 1,
                              Number(data.dobDay),
                            ).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })
                          : ""
                      }
                    />
                    <GridItem label="Marital status" value={data.maritalStatus} />
                    <GridItem label="Height" value={displayHeight(data.height)} />
                    <GridItem label="Weight" value={data.weight} />
                    <GridItem label="Complexion" value={data.complexion} />
                    <GridItem label="Disability" value={data.disability} />
                    <GridItem label="Phone" value={data.phone ? `+91 ${data.phone}` : ""} />
                    <GridItem
                      label="Photo privacy"
                      value={PHOTO_PRIVACY.find((option) => option.value === data.photoPrivacy)?.label || data.photoPrivacy}
                    />
                    {maritalAsksChildren(data.maritalStatus) ? (
                      <GridItem label="Has children" value={data.hasChildren ? "Yes" : "No"} />
                    ) : null}
                    {maritalAsksChildren(data.maritalStatus) && data.hasChildren ? (
                      <>
                        <GridItem label="Children" value={String(data.childrenCount || 0)} />
                        <GridItem
                          label="Children live with"
                          value={
                            data.childrenLivingWithMe === true
                              ? "Yes"
                              : data.childrenLivingWithMe === false
                                ? "No"
                                : ""
                          }
                        />
                      </>
                    ) : null}
                  </dl>
                </div>

                <div>
                  <h3 className="mb-4 font-serif text-lg font-bold">Lifestyle</h3>
                  <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                    <GridItem label="Diet" value={data.diet} />
                    <GridItem label="Smoking" value={data.smoking} />
                    <GridItem label="Drinking" value={data.alcohol} />
                    <GridItem label="Interests" value={listValue(data.interests)} />
                  </dl>
                </div>
              </div>
            )}

            {activeTab === "career" && (
              <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
                <div>
                  <h3 className="mb-4 font-serif text-lg font-bold">Education & Career</h3>
                  <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                    <GridItem label="Education" value={data.educationLevel} />
                    <GridItem label="Degree" value={data.degree} />
                    <GridItem label="College" value={data.collegeName} />
                    <GridItem label="Employment" value={data.employmentStatus} />
                    <GridItem label="Profession" value={data.profession} />
                    <GridItem label="Company" value={data.companyName} />
                    <GridItem label="Company sector" value={data.companySector ?? ""} />
                    <GridItem label="Income" value={data.annualIncome} />
                  </dl>
                </div>
              </div>
            )}

            {activeTab === "community" && (
              <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
                <div>
                  <h3 className="mb-4 font-serif text-lg font-bold">Community</h3>
                  <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                    <GridItem label="Religion" value={data.religion} />
                    <GridItem label="Caste" value={data.caste} />
                    <GridItem label="Subcaste" value={data.subcaste} />
                    <GridItem label="Gotra" value={data.gotra} />
                    <GridItem label="Mother Tongue" value={data.motherTongue} />
                  </dl>
                </div>
                <div>
                  <h3 className="mb-4 font-serif text-lg font-bold">Location</h3>
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
                  <h3 className="mb-4 font-serif text-lg font-bold">Family Details</h3>
                  <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                    <GridItem label="Family Type" value={data.familyType} />
                    <GridItem label="Family Status" value={data.familyStatus} />
                    <GridItem label="Family Values" value={data.familyValues ?? ""} />
                    <GridItem label="Father's Occupation" value={data.fatherOccupation} />
                    <GridItem label="Mother's Occupation" value={data.motherOccupation} />
                    <GridItem label="Brothers" value={String(data.brothersCount ?? 0)} />
                    <GridItem label="Sisters" value={String(data.sistersCount ?? 0)} />
                    <GridItem label="Siblings" value={formatSiblings(data.brothersCount, data.sistersCount)} />
                  </dl>
                </div>
              </div>
            )}

            {activeTab === "preferences" && (
              <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
                <div>
                  <h3 className="mb-4 font-serif text-lg font-bold">Horoscope</h3>
                  <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                    <GridItem label="Birth Time" value={data.birthTime} />
                    <GridItem label="Birth Place" value={data.birthPlace} />
                    <GridItem label="Star / Nakshatra" value={data.star} />
                    <GridItem label="Rashi" value={data.rashi} />
                    <GridItem label="Manglik" value={data.manglik} />
                    <GridItem label="Horoscope file" value={data.horoscopeName} />
                  </dl>
                </div>

                <div>
                  <h3 className="mb-4 font-serif text-lg font-bold">Partner Preferences</h3>
                  <dl className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <GridItem label="Age range" value={data.prefAgeMin && data.prefAgeMax ? `${data.prefAgeMin} – ${data.prefAgeMax} yrs` : ""} />
                    <GridItem label="Min height" value={data.prefHeightMinCm ? formatHeightFromCm(data.prefHeightMinCm) : ""} />
                    <GridItem label="Max height" value={data.prefHeightMaxCm ? formatHeightFromCm(data.prefHeightMaxCm) : ""} />
                    <GridItem label="Religions" value={listValue(data.prefReligion)} />
                    <GridItem label="Marital status" value={listValue(data.prefMaritalStatuses)} />
                    <GridItem label="Communities" value={listValue(data.prefCastes)} />
                    <GridItem label="Mother tongues" value={listValue(data.prefMotherTongues)} />
                    <GridItem label="Minimum education" value={data.prefMinEducation ?? ""} />
                    <GridItem label="Income" value={listValue(data.prefAcceptableIncomes)} />
                    <GridItem label="Locations" value={listValue(data.prefLocations)} />
                  </dl>
                </div>
              </div>
            )}
          </div>
        </section>

        <Link
          href="/plans"
          className="flex min-h-11 items-center gap-3 rounded-2xl border border-secondary/30 bg-gradient-to-r from-[#fff8ef] to-card p-4 shadow-sm"
        >
          <span className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary">
            <Sparkles className="h-5 w-5" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="font-semibold">Membership plans</p>
            <p className="text-sm text-muted-foreground">View Free & Community Plan options</p>
          </div>
          <ChevronRight className="h-5 w-5 text-muted-foreground" aria-hidden="true" />
        </Link>
    </main>
  )
}
