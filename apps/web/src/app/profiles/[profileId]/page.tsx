import { notFound } from "next/navigation"
import { formatHeightFromCm } from "@/lib/input-units"
import { apiClient } from "@/lib/api-client"
import {
  Briefcase,
  CheckCircle2,
  GraduationCap,
  Heart,
  MapPin,
  Ruler,
  Star,
  Users,
} from "lucide-react"
import { ProfileActionBar } from "@/components/profile/profile-action-bar"
import { ProfileAboutSection } from "@/components/profile/profile-about-section"
import { ProfileGallery } from "@/components/profile/profile-gallery"
import { ProfileVisitTracker } from "@/components/profile/profile-visit-tracker"


import { ReactNode } from "react"

export async function generateMetadata({ params }: { params: Promise<{ profileId: string }> }) {
  const { profileId } = await params
  
  if (profileId === 'me' || profileId === 'undefined') return { title: "Profile | Astalakshimi" }

  const NEXT_PUBLIC_API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api';
  const rawProfile = await fetch(`${NEXT_PUBLIC_API_URL}/profiles/${profileId}`)
    .then(res => res.ok ? res.json() : null)
    .catch(() => null);

  if (!rawProfile) return { title: "Profile | Astalakshimi" }
  
  const age = Math.floor((new Date().getTime() - new Date(rawProfile.profile.dob).getTime()) / 31557600000)
  return {
    title: `${rawProfile.profile.fullName}, ${age} | Astalakshimi`,
    description: `${rawProfile.profile.educationLevel} · ${rawProfile.profile.city} · ${rawProfile.profile.caste}`,
  }
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-border/70 py-3 last:border-0">
      <dt className="shrink-0 text-sm text-muted-foreground">{label}</dt>
      <dd className="text-right text-sm font-medium text-foreground">{value}</dd>
    </div>
  )
}

function Section({
  title,
  icon,
  children,
}: {
  title: string
  icon: ReactNode
  children: ReactNode
}) {
  return (
    <section className="rounded-2xl border border-border bg-card p-5 shadow-sm">
      <div className="mb-4 flex items-center gap-2">
        <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10 text-primary">{icon}</span>
        <h2 className="font-serif text-lg font-bold">{title}</h2>
      </div>
      {children}
    </section>
  )
}

export default async function anyPage({ params }: { params: Promise<{ profileId: string }> }) {
  const { profileId } = await params
  
  if (profileId === 'me' || profileId === 'undefined') {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="text-center">
          <h2 className="text-xl font-bold">Redirecting...</h2>
          <script dangerouslySetInnerHTML={{ __html: 'window.location.href = "/profile";' }} />
        </div>
      </div>
    );
  }

  const { cookies } = await import("next/headers");
  const cookieStore = await cookies();
  const token = cookieStore.get('astalakshimi.auth_token')?.value;

  const NEXT_PUBLIC_API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api';
  const data = await fetch(`${NEXT_PUBLIC_API_URL}/profiles/${profileId}`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    cache: 'no-store'
  })
    .then(res => res.ok ? res.json() : null)
    .catch(() => null);

  if (!data) notFound()

  const profile = {
    id: data.profile.id,
    fullName: data.profile.fullName,
    age: Math.floor((new Date().getTime() - new Date(data.profile.dob).getTime()) / 31557600000),
    city: data.profile.city,
    state: data.profile.state,
    lastActive: "Recently",
    photos: (data.photos || []).map((p: { s3Key?: string; url?: string }) => p.s3Key || p.url || ''),
    photoVerified: data.verificationStatus === 'verified',
    verified: data.verificationStatus === 'verified',
    hasHoroscope: !!data.hasHoroscope || !!data.horoscope?.horoscopeS3Key,
    blurPhoto: data.blurPhoto,
    matchPercent: 90,
    height: formatHeightFromCm(data.profile.heightCm),
    education: data.profile.educationLevel,
    occupation: data.profile.profession,
    community: data.profile.caste,
    about: data.profile.aboutMe || "No details provided.",
    gender: data.profile.gender,
    maritalStatus: data.profile.maritalStatus,
    religion: data.profile.religion,
    motherTongue: data.profile.motherTongue,
    college: data.profile.collegeName || "Not specified",
    company: data.profile.companyName || "Not specified",
    income: data.profile.annualIncome,
    lifestyle: {
      drinking: data.lifestyle?.alcohol || "Never",
      smoking: data.lifestyle?.smoking || "Never",
      diet: data.lifestyle?.diet || "Vegetarian",
    },
    family: {
      type: data.family?.familyType || "Nuclear",
      values: data.family?.familyValues || "Traditional",
      father: data.family?.fatherOccupation || "Employed",
      mother: data.family?.motherOccupation || "Homemaker",
      siblings: `${(data.family?.brothersCount || 0) + (data.family?.sistersCount || 0)}`,
    },
    preferences: {
      ageRange: "25 - 32 yrs",
      heightRange: "160 - 180 cm",
      maritalStatus: "Never Married",
      religion: data.profile.religion,
      community: data.profile.caste,
      education: "Bachelors",
      location: "India"
    }
  }

  return (
    <div className="flex h-full min-h-0 flex-col bg-background">
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden lg:flex-row">
        {/* LEFT: portrait photo, no scroll */}
        <aside className="relative flex shrink-0 flex-col overflow-hidden px-4 pt-3 lg:w-[40%] lg:max-w-[480px] lg:px-5 lg:pt-5">
          <div className="relative mx-auto aspect-[3/4] w-full max-h-[min(72dvh,640px)] overflow-hidden rounded-2xl shadow-md">
            <ProfileGallery
              name={profile.fullName}
              age={profile.age}
              city={profile.city}
              state={profile.state}
              lastActive={profile.lastActive}
              photos={profile.photos}
              photoVerified={profile.photoVerified}
              verified={profile.verified}
              hasHoroscope={profile.hasHoroscope}
              blurPhoto={profile.blurPhoto}
            />

            <span className="absolute right-3 top-3 z-30 inline-flex items-center gap-1 rounded-full bg-emerald-500/90 px-2 py-1 text-[11px] font-bold text-white shadow backdrop-blur">
              <Star className="h-3 w-3 fill-current" /> {profile.matchPercent}% match
            </span>
          </div>
        </aside>

        {/* RIGHT: details column */}
        <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
          <div className="flex-1 overflow-y-auto hide-scrollbar">
            <div className="space-y-4 p-4 pb-[6.5rem] sm:p-6 sm:pb-[6.5rem]">

            {/* Quick pills */}
            <section className="rounded-2xl border border-border bg-card p-5 shadow-sm">
              <div className="flex flex-wrap gap-2 text-sm">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-muted px-3 py-1.5 font-medium">
                  <Ruler className="h-3.5 w-3.5 text-primary" /> {profile.height}
                </span>
                <span className="inline-flex items-center gap-1.5 rounded-full bg-muted px-3 py-1.5 font-medium">
                  <GraduationCap className="h-3.5 w-3.5 text-primary" /> {profile.education.split(" ")[0].trim()}
                </span>
                <span className="inline-flex items-center gap-1.5 rounded-full bg-muted px-3 py-1.5 font-medium">
                  <Briefcase className="h-3.5 w-3.5 text-primary" /> {profile.occupation}
                </span>
                <span className="inline-flex items-center gap-1.5 rounded-full bg-muted px-3 py-1.5 font-medium">
                  <Users className="h-3.5 w-3.5 text-primary" /> {profile.community}
                </span>
                <span className="inline-flex items-center gap-1.5 rounded-full bg-muted px-3 py-1.5 font-medium">
                  <MapPin className="h-3.5 w-3.5 text-primary" /> {profile.city}
                </span>
              </div>
              <p className="mt-4 text-sm leading-relaxed text-foreground/85">{profile.about}</p>
            </section>

            <ProfileAboutSection
              profileId={profile.id}
              gender={profile.gender}
              maritalStatus={profile.maritalStatus}
              religion={profile.religion}
              community={profile.community}
              motherTongue={profile.motherTongue}
              city={profile.city}
              state={profile.state}
              hasHoroscope={profile.hasHoroscope}
              horoscopeFileName={data.horoscope?.horoscopeFileName}
              horoscopeS3Key={data.horoscope?.horoscopeS3Key}
              contactPhone={data.contactPhone}
              initialMutualConnect={Boolean(data.isMutualConnect)}
              contactAccess={data.contactAccess}
            />

            <Section title="Education & career" icon={<Briefcase className="h-4 w-4" />}>
              <dl>
                <DetailRow label="Education" value={profile.education} />
                <DetailRow label="College" value={profile.college} />
                <DetailRow label="Occupation" value={profile.occupation} />
                <DetailRow label="Company" value={profile.company} />
                <DetailRow label="Annual income" value={profile.income} />
              </dl>
            </Section>

            <Section title="Lifestyle" icon={<Heart className="h-4 w-4" />}>
              <dl>
                <DetailRow label="Diet" value={profile.lifestyle.diet} />
                <DetailRow label="Smoking" value={profile.lifestyle.smoking} />
                <DetailRow label="Drinking" value={profile.lifestyle.drinking} />
              </dl>
            </Section>

            <Section title="Family" icon={<Users className="h-4 w-4" />}>
              <dl>
                <DetailRow label="Family type" value={profile.family.type} />
                <DetailRow label="Family values" value={profile.family.values} />
                <DetailRow label="Father" value={profile.family.father} />
                <DetailRow label="Mother" value={profile.family.mother} />
                <DetailRow label="Siblings" value={profile.family.siblings} />
              </dl>
            </Section>

            <Section title="Partner preferences" icon={<CheckCircle2 className="h-4 w-4" />}>
              <dl>
                <DetailRow label="Age" value={profile.preferences.ageRange} />
                <DetailRow label="Height" value={profile.preferences.heightRange} />
                <DetailRow label="Education" value={profile.preferences.education} />
                <DetailRow label="Location" value={profile.preferences.location} />
                <DetailRow label="Community" value={profile.preferences.community} />
              </dl>
            </Section>

          </div>
        </div>
        </div>
      </div>

      <ProfileVisitTracker profileId={profile.id} />
      <ProfileActionBar profileId={profile.id} />
    </div>
  )
}
