import Image from "next/image"
import Link from "next/link"
import { notFound } from "next/navigation"
import type { ReactNode } from "react"
import { Logo } from "@/components/ui/logo"
import { Button } from "@/components/ui/button"
import { getAllMatchIds, getMatchById } from "@/lib/matches"
import {
  ArrowLeft,
  BadgeCheck,
  Briefcase,
  CheckCircle2,
  FileText,
  GraduationCap,
  Heart,
  MapPin,
  MessageCircle,
  Ruler,
  ShieldCheck,
  Sparkles,
  Star,
  Users,
} from "lucide-react"

export function generateStaticParams() {
  return getAllMatchIds().map((id) => ({ id }))
}

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const profile = getMatchById(id)
  if (!profile) return { title: "Profile | Astalakshimi" }
  return {
    title: `${profile.fullName}, ${profile.age} | Astalakshimi`,
    description: `${profile.education} · ${profile.city} · ${profile.community}`,
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

export default async function MatchProfilePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const profile = getMatchById(id)
  if (!profile) notFound()

  const [hero, ...gallery] = profile.photos

  return (
    <div className="min-h-dvh bg-background pb-28 md:pb-10">
      <header className="sticky top-0 z-50 border-b border-secondary/30 bg-[#fffbf4]/90 backdrop-blur-xl safe-top">
        <div className="gold-rule" />
        <div className="mx-auto flex h-14 max-w-5xl items-center justify-between px-4">
          <div className="flex items-center gap-3">
            <Link
              href="/dashboard"
              className="tap-target inline-flex items-center justify-center rounded-full border border-border bg-card text-muted-foreground hover:text-foreground"
              aria-label="Back to matches"
            >
              <ArrowLeft className="h-5 w-5" />
            </Link>
            <Logo />
          </div>
          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/15 px-2.5 py-1 text-xs font-bold text-emerald-700">
            <Star className="h-3.5 w-3.5 fill-current" /> {profile.matchPercent}% match
          </span>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 py-5 md:py-8">
        <div className="grid gap-6 lg:grid-cols-[1.05fr_0.95fr]">
          {/* Photo portfolio */}
          <div className="space-y-3">
            <div className="relative aspect-[4/5] overflow-hidden rounded-3xl bg-muted shadow-lg temple-frame md:aspect-[3/4]">
              <Image
                src={hero}
                alt={profile.fullName}
                fill
                priority
                className="object-cover"
                sizes="(max-width: 1024px) 100vw, 50vw"
              />
              <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 via-black/35 to-transparent p-5 pt-20 text-white">
                <div className="mb-2 flex flex-wrap gap-2">
                  {profile.photoVerified && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-white/15 px-2.5 py-1 text-[11px] font-semibold backdrop-blur">
                      <BadgeCheck className="h-3.5 w-3.5 text-secondary" /> Photo verified
                    </span>
                  )}
                  {profile.verified && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-white/15 px-2.5 py-1 text-[11px] font-semibold backdrop-blur">
                      <ShieldCheck className="h-3.5 w-3.5 text-secondary" /> Profile screened
                    </span>
                  )}
                  {profile.hasHoroscope && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-white/15 px-2.5 py-1 text-[11px] font-semibold backdrop-blur">
                      <FileText className="h-3.5 w-3.5 text-secondary" /> Horoscope
                    </span>
                  )}
                </div>
                <h1 className="font-serif text-3xl font-bold tracking-tight md:text-4xl">
                  {profile.fullName}, {profile.age}
                </h1>
                <p className="mt-1 flex items-center gap-1.5 text-sm text-white/85">
                  <MapPin className="h-4 w-4" />
                  {profile.city}, {profile.state}
                </p>
                <p className="mt-1 text-xs text-white/65">{profile.lastActive}</p>
              </div>
            </div>

            {gallery.length > 0 && (
              <div className="grid grid-cols-3 gap-2">
                {gallery.map((photo, i) => (
                  <div key={photo} className="relative aspect-[3/4] overflow-hidden rounded-2xl bg-muted">
                    <Image
                      src={photo}
                      alt={`${profile.fullName} photo ${i + 2}`}
                      fill
                      className="object-cover"
                      sizes="120px"
                    />
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Portfolio details */}
          <div className="space-y-4">
            <section className="rounded-2xl border border-border bg-card p-5 shadow-sm">
              <div className="flex flex-wrap gap-2 text-sm">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-muted px-3 py-1.5 font-medium">
                  <Ruler className="h-3.5 w-3.5 text-primary" /> {profile.height}
                </span>
                <span className="inline-flex items-center gap-1.5 rounded-full bg-muted px-3 py-1.5 font-medium">
                  <GraduationCap className="h-3.5 w-3.5 text-primary" /> {profile.education.split("—")[0].trim()}
                </span>
                <span className="inline-flex items-center gap-1.5 rounded-full bg-muted px-3 py-1.5 font-medium">
                  <Briefcase className="h-3.5 w-3.5 text-primary" /> {profile.occupation}
                </span>
                <span className="inline-flex items-center gap-1.5 rounded-full bg-muted px-3 py-1.5 font-medium">
                  <Users className="h-3.5 w-3.5 text-primary" /> {profile.community}
                </span>
              </div>
              <p className="mt-4 text-sm leading-relaxed text-foreground/85">{profile.about}</p>
            </section>

            <Section title={profile.gender === "Female" ? "About her" : "About him"} icon={<Sparkles className="h-4 w-4" />}>
              <dl>
                <DetailRow label="Marital status" value={profile.maritalStatus} />
                <DetailRow label="Religion" value={profile.religion} />
                <DetailRow label="Community" value={profile.community} />
                <DetailRow label="Mother tongue" value={profile.motherTongue} />
                <DetailRow label="Lives in" value={`${profile.city}, ${profile.state}`} />
              </dl>
            </Section>

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
      </main>

      <div className="fixed inset-x-0 bottom-0 z-50 border-t border-border bg-background/95 backdrop-blur-xl safe-bottom">
        <div className="mx-auto flex max-w-5xl gap-3 px-4 py-3">
          <Link href="/dashboard" className="flex-1">
            <Button variant="outline" className="w-full">
              Skip
            </Button>
          </Link>
          <Button variant="soft" className="flex-1">
            <MessageCircle className="mr-2 h-4 w-4" /> Shortlist
          </Button>
          <Button className="flex-[1.4]">
            <Heart className="mr-2 h-4 w-4 fill-current" /> Connect
          </Button>
        </div>
      </div>
    </div>
  )
}
