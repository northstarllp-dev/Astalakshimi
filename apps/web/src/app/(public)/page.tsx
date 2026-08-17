import Image from "next/image"
import Link from "next/link"
import { SiteHeader } from "@/components/layout/site-header"
import { SiteFooter } from "@/components/layout/site-footer"
import { HeroRegisterCard } from "@/components/landing/hero-register-card"
import { HeroFreeSearchCountdown } from "@/components/landing/hero-free-search-countdown"
import { Button } from "@/components/ui/button"
import { IMAGES } from "@/lib/images"
import { MEMBERSHIP_PLANS } from "@/lib/plans"
import {
  BadgeCheck,
  BriefcaseBusiness,
  Gift,
  Heart,
  IndianRupee,
  Lock,
  ShieldCheck,
  Smartphone,
  Star,
  Users,
} from "lucide-react"

const stats = [
  { value: "25+", label: "Years of trust" },
  { value: "10L+", label: "Verified profiles" },
  { value: "12 hrs", label: "Photo review SLA" },
  { value: "100%", label: "Screened members" },
]

const stories = [
  {
    names: "Ananya & Karthik",
    place: "Chennai",
    quote: "We matched on community and values. The verified photos made our families comfortable from day one.",
    image: IMAGES.stories.chennai,
  },
  {
    names: "Meera & Arjun",
    place: "Bengaluru",
    quote: "Daily recommendations felt personal  not noisy. We met within three weeks.",
    image: IMAGES.stories.bengaluru,
  },
  {
    names: "Divya & Rohan",
    place: "Hyderabad",
    quote: "Privacy controls and ID verification were the reason our parents trusted Astalakshimi.",
    image: IMAGES.stories.hyderabad,
  },
]

const communities = [
  "Hindu",
  "Muslim",
  "Christian",
  "Sikh",
  "Jain",
  "Tamil",
  "Telugu",
  "Hindi",
  "Marathi",
  "Bengali",
  "Gujarati",
  "Punjabi",
]

export default function LandingPage() {
  return (
    <div className="flex min-h-dvh flex-col bg-background">
      <SiteHeader />

      {/* ── Hero ── */}
      <section className="relative overflow-hidden">

        {/* ───── MOBILE LAYOUT ───── */}
        <div className="md:hidden flex flex-col">

          {/* Full hero image with overlaid text */}
          <div className="relative h-[40vh] min-h-[280px] w-full">
            <Image
              src={IMAGES.hero}
              alt="Traditional Indian wedding celebration"
              fill
              priority
              className="object-cover object-[center_50%]"
              sizes="100vw"
            />

            {/* Strong gradient at bottom for text legibility */}
            <div className="absolute inset-x-0 bottom-0 h-64 bg-gradient-to-t from-[#1a0608]/95 via-[#1a0608]/60 to-transparent" />
            {/* Soft top fade */}
            <div className="absolute inset-x-0 top-0 h-20 bg-gradient-to-b from-[#1a0608]/70 to-transparent" />
            {/* Gold top border */}
            <div className="absolute inset-x-0 top-0 h-[2px] bg-gradient-to-r from-transparent via-secondary/60 to-transparent" />

            {/* Welcome greeting */}
            <div className="absolute top-5 left-4 flex items-center gap-3">
              <div className="h-px w-6 bg-secondary/60" />
              <p className="text-xs font-semibold tracking-[0.18em] text-secondary drop-shadow-lg uppercase">
                Namaste
              </p>
              <div className="h-px w-10 bg-gradient-to-r from-secondary/60 to-transparent" />
            </div>

            {/* Headline overlaid — moved up */}
            <div className="absolute bottom-0 inset-x-0 px-5 pb-14 space-y-0">
              <h1
                className="text-[2.35rem] font-bold leading-[1.12] tracking-tight text-white drop-shadow-xl"
                style={{ textShadow: "0 2px 16px rgba(0,0,0,0.6)" }}
              >
                Find a match<br />
                <span className="gold-shimmer">across India</span>
              </h1>
              <p className="text-sm text-white/75 leading-relaxed">
                Every community. Every mother tongue. Trusted by families nationwide.
              </p>
              <HeroFreeSearchCountdown compact />
            </div>
          </div>

          {/* Register card */}
          <div className="relative px-4 pb-12 pt-6 -mt-1 bg-[#1a0608]">
            <HeroRegisterCard />
          </div>
        </div>


        {/* ───── DESKTOP LAYOUT ───── */}
        <div className="relative hidden min-h-[430px] md:block">
          <Image
            src={IMAGES.hero}
            alt="Traditional Indian wedding celebration"
            fill
            priority
            className="object-cover object-[center_18%]"
            sizes="100vw"
          />
          {/* Cinematic gradient  darkens left & right, clear centre */}
          <div className="absolute inset-0 bg-gradient-to-r from-[#1a0608]/95 via-transparent to-[#2e0a0c]/60" />
          <div className="absolute inset-0 bg-gradient-to-t from-[#1a0608]/70 via-transparent to-transparent" />
          <div className="absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t from-background to-transparent" />
          <div className="absolute inset-x-0 top-0 h-[2px] bg-gradient-to-r from-transparent via-secondary/60 to-transparent" />

          <div className="relative z-10 mx-auto flex w-full max-w-[96%] items-center justify-between gap-12 px-8 py-8">
            {/* Left: Copy */}
            <div className="w-full max-w-lg space-y-8 text-white">
              <div className="flex items-center gap-4">
                <div className="h-px w-10 bg-gradient-to-r from-transparent to-secondary/60" />
                <p className="text-sm font-semibold tracking-[0.18em] text-secondary drop-shadow-lg uppercase">
                  Namaste
                </p>
                <div className="h-px flex-1 bg-gradient-to-r from-secondary/60 to-transparent" />
              </div>

              <div className="space-y-2">
                <h1
                  className="text-[3.5rem] font-bold leading-[1.1] tracking-tight drop-shadow-xl"
                  style={{ textShadow: "0 2px 24px rgba(0,0,0,0.5)" }}
                >
                  Find a match<br />
                  <span className="text-white/90">rooted in</span>
                </h1>
                <p className="text-[3.5rem] font-bold leading-[1.1] tracking-tight gold-shimmer">
                  Indian tradition
                </p>
              </div>

              <p className="text-base leading-relaxed text-white/80 drop-shadow max-w-md">
                Pan-India matchmaking for every community and mother tongue  with verified photos and screened profiles.
              </p>

              <HeroFreeSearchCountdown className="max-w-md" />

              {/* Bottom gold rule */}
              <div className="flex items-center gap-3">
                <div className="h-px w-16 bg-gradient-to-r from-secondary/60 to-secondary/20" />
                <span className="text-secondary/50 text-xs tracking-[0.4em] uppercase font-semibold">Astalakshimi</span>
                <div className="h-px flex-1 bg-gradient-to-r from-secondary/20 to-transparent" />
              </div>
            </div>

            {/* Right: Register card */}
            <div className="w-full max-w-[420px] shrink-0">
              <HeroRegisterCard />
            </div>
          </div>
        </div>
      </section>



      {/* ── Stats Bar ── */}
      <section className="relative border-y border-secondary/20 bg-card/90">
        <div className="gold-rule absolute inset-x-0 top-0" />
        <div className="mx-auto grid max-w-5xl grid-cols-2 gap-0 divide-x divide-secondary/15 px-4 py-10 md:grid-cols-4">
          {stats.map((stat) => (
            <div key={stat.label} className="flex flex-col items-center px-6 text-center">
              <p className="font-serif text-3xl font-bold text-primary md:text-4xl">{stat.value}</p>
              <p className="mt-1.5 text-[11px] font-semibold tracking-[0.18em] text-muted-foreground uppercase">{stat.label}</p>
            </div>
          ))}
        </div>
        <div className="gold-rule absolute inset-x-0 bottom-0" />
      </section>

      {/* ── Assisted Service ── */}
      <section id="assisted" className="border-y border-secondary/15 bg-[#fff9f2]">
        <div className="mx-auto grid max-w-6xl items-stretch md:grid-cols-2">
          <div className="flex flex-col justify-center px-5 py-12 sm:px-8 md:px-12 md:py-16">
            <div className="flex items-center gap-3">
              <span className="relative h-11 w-11 overflow-hidden rounded-full border border-secondary/40 shadow-sm">
                <Image
                  src="/images/logo-lakshmi.png"
                  alt=""
                  fill
                  className="object-cover"
                  sizes="44px"
                />
              </span>
              <div>
                <h2 className="font-serif text-xl font-bold leading-tight text-foreground md:text-2xl">
                  Assisted Service
                </h2>
                <p className="text-sm text-muted-foreground">Personalised matchmaking service</p>
              </div>
            </div>

            <h3 className="mt-8 font-serif text-3xl font-bold leading-tight tracking-tight text-foreground sm:text-4xl md:text-[2.75rem]">
              Find your match{" "}
              <span className="text-primary">10x faster</span>
            </h3>
            <p className="mt-3 max-w-md text-sm leading-relaxed text-muted-foreground md:text-base">
              Personalised matchmaking through an expert Relationship Manager for busy families across India.
              Built for members <span className="font-medium text-foreground">and brokers</span>, with prices far below platforms like Shaadi.com.
            </p>

            <ul className="mt-8 grid grid-cols-3 gap-3 sm:gap-5">
              {[
                { icon: BriefcaseBusiness, label: "Portal for brokers" },
                { icon: Gift, label: "Referral system" },
                { icon: IndianRupee, label: "Lower subscription cost" },
              ].map((item) => (
                <li key={item.label} className="flex flex-col items-center gap-2 text-center sm:items-start sm:text-left">
                  <span className="flex h-11 w-11 items-center justify-center rounded-full border border-primary/25 bg-primary/10 text-primary sm:h-12 sm:w-12">
                    <item.icon className="h-5 w-5 sm:h-6 sm:w-6" />
                  </span>
                  <span className="text-[11px] font-semibold leading-snug text-foreground sm:text-xs">
                    {item.label}
                  </span>
                </li>
              ))}
            </ul>

            <p className="mt-5 max-w-md rounded-xl border border-secondary/30 bg-secondary/10 px-3 py-2 text-xs leading-relaxed text-foreground/80">
              Why pay premium rates on big portals? Astalakshimi memberships start from{" "}
              <span className="font-semibold text-primary">₹300</span> — with a free 3-month window from{" "}
              <span className="font-semibold">14 Sep 2026</span>.
            </p>

            <div className="mt-9">
              <Link href="#pricing">
                <Button
                  size="lg"
                  className="rounded-full bg-secondary px-8 text-base font-bold text-secondary-foreground hover:bg-secondary/90"
                >
                  Know More →
                </Button>
              </Link>
            </div>
          </div>

          <div className="relative min-h-[320px] bg-muted md:min-h-[480px]">
            <Image
              src={IMAGES.profiles.ananya[0]}
              alt="Astalakshimi Relationship Manager"
              fill
              className="object-cover object-[center_15%]"
              sizes="(max-width: 768px) 100vw, 50vw"
            />
            <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-[#fff9f2]/40 to-transparent md:hidden" />
          </div>
        </div>
      </section>

      {/* ── Membership Plans ── */}
      <section id="pricing" className="relative overflow-hidden border-b border-secondary/20 py-20 md:py-28"
        style={{ background: "linear-gradient(160deg, #1a0e08 0%, #2a1008 35%, #1a0608 65%, #0d1a10 100%)" }}
      >
        {/* Subtle kolam dots */}
        <div className="pointer-events-none absolute inset-0 opacity-[0.06]"
          style={{ backgroundImage: "radial-gradient(circle, #b8901f 1px, transparent 1px)", backgroundSize: "32px 32px" }} />
        {/* Gold top rule */}
        <div className="absolute inset-x-0 top-0 h-[2px]" style={{ background: "linear-gradient(90deg, transparent, #b8901f 30%, #e8c84a 50%, #b8901f 70%, transparent)" }} />
        {/* Gold bottom rule */}
        <div className="absolute inset-x-0 bottom-0 h-[2px]" style={{ background: "linear-gradient(90deg, transparent, #b8901f 30%, #e8c84a 50%, #b8901f 70%, transparent)" }} />

        <div className="relative mx-auto max-w-6xl px-4">
          {/* Section header */}
          <div className="mb-14 text-center">
            <p className="mb-3 text-[11px] font-bold tracking-[0.35em] uppercase" style={{ color: "#b8901f" }}>Transparent pricing</p>
            <h2 className="font-serif text-4xl font-bold text-white md:text-5xl" style={{ textShadow: "0 2px 20px rgba(184,144,31,0.3)" }}>
              Membership Plans
            </h2>
            <div className="mx-auto mt-4 flex items-center justify-center gap-3">
              <div className="h-px w-16" style={{ background: "linear-gradient(90deg, transparent, #b8901f)" }} />
              <span style={{ color: "#e8c84a" }}>✦</span>
              <div className="h-px w-16" style={{ background: "linear-gradient(90deg, #b8901f, transparent)" }} />
            </div>
            <p className="mt-4 text-sm text-white/50">
              Free · Silver · Gold · Platinum · Diamond
            </p>
          </div>

          {/* Cards — always one row; scroll on smaller screens */}
          <div className="-mx-4 overflow-x-auto px-4 pb-3 hide-scrollbar lg:mx-0 lg:overflow-visible lg:px-0">
          <div className="flex min-w-max flex-nowrap items-end gap-4 lg:min-w-0 lg:grid lg:grid-cols-5">
            {MEMBERSHIP_PLANS.map((plan) => {
              const isGold = plan.id === "gold"
              const isPlatinum = plan.id === "platinum"
              const isDiamond = plan.id === "diamond"

              if (isGold) {
                return (
                  <article
                    key={plan.id}
                    className="relative flex w-[min(260px,82vw)] shrink-0 flex-col overflow-visible rounded-3xl lg:-mt-6 lg:mb-0 lg:w-auto animate-in"
                    style={{
                      background: "linear-gradient(145deg, #1a0e08, #2a1008)",
                      boxShadow: "0 0 0 2px #b8901f, 0 0 40px rgba(184,144,31,0.35), 0 24px 60px rgba(0,0,0,0.6)",
                    }}
                  >
                    {/* Glow halo */}
                    <div className="pointer-events-none absolute -inset-px rounded-3xl opacity-40"
                      style={{ background: "linear-gradient(145deg, rgba(232,200,74,0.2), transparent 60%)" }} />

                    {/* Most popular banner */}
                    <div className="relative flex items-center justify-center gap-2 rounded-t-3xl px-4 py-3"
                      style={{ background: "linear-gradient(90deg, #a07818, #e8c84a 40%, #d4a843 60%, #a07818)" }}
                    >
                      <span className="text-[11px] font-bold tracking-[0.25em] uppercase" style={{ color: "#1a0e08" }}>
                        ✦ Most Popular ✦
                      </span>
                    </div>

                    <div className="flex flex-1 flex-col px-5 py-6">
                      {/* Plan name */}
                      <div className="mb-1 flex items-center gap-2">
                        <span className="font-serif text-xl font-bold" style={{ color: "#e8c84a" }}>Gold</span>
                      </div>
                      <p className="text-xs text-white/50">{plan.tagline}</p>

                      {/* Price */}
                      <div className="my-5 flex items-baseline gap-2">
                        <p className="font-serif text-5xl font-bold leading-none" style={{ color: "#e8c84a", textShadow: "0 0 20px rgba(232,200,74,0.4)" }}>
                          {plan.price}
                        </p>
                        <p className="text-xs font-medium text-white/40">/ {plan.period}</p>
                      </div>

                      {/* Divider */}
                      <div className="mb-4 h-px" style={{ background: "linear-gradient(90deg, transparent, #b8901f 50%, transparent)" }} />

                      {/* Features */}
                      <ul className="flex-1 space-y-2.5">
                        {plan.features.map((f) => (
                          <li key={f} className="flex items-center gap-2.5 text-sm text-white/80">
                            <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full text-[10px]"
                              style={{ background: "rgba(184,144,31,0.25)", color: "#e8c84a" }}>✓</span>
                            {f}
                          </li>
                        ))}
                      </ul>

                      {/* CTA */}
                      <Link href="/register" className="mt-6">
                        <button className="w-full rounded-xl py-3 text-sm font-bold tracking-wide transition-all hover:opacity-90 active:scale-[0.98]"
                          style={{ background: "linear-gradient(90deg, #a07818, #e8c84a 40%, #d4a843 70%, #a07818)", color: "#1a0e08" }}>
                          Choose Gold
                        </button>
                      </Link>
                    </div>
                  </article>
                )
              }

              // Non-gold cards
              const badgeColor = isDiamond
                ? { bg: "linear-gradient(90deg, #3d120c, #6b1024)", text: "#e8c84a" }
                : isPlatinum
                ? { bg: "linear-gradient(90deg, #1a2a3a, #2a3a4a)", text: "#a8c4e0" }
                : { bg: "rgba(255,255,255,0.06)", text: "rgba(255,255,255,0.45)" }

              return (
                <article
                  key={plan.id}
                  className="relative flex w-[min(240px,80vw)] shrink-0 flex-col overflow-hidden rounded-2xl lg:w-auto"
                  style={{
                    background: "rgba(255,255,255,0.04)",
                    backdropFilter: "blur(12px)",
                    border: isDiamond
                      ? "1px solid rgba(232,200,74,0.35)"
                      : isPlatinum
                        ? "1px solid rgba(168,196,224,0.3)"
                        : "1px solid rgba(255,255,255,0.09)",
                    boxShadow: "0 8px 32px rgba(0,0,0,0.4)",
                  }}
                >
                  {/* Badge */}
                  {plan.badge ? (
                    <div className="px-4 py-2.5 text-center text-[11px] font-semibold tracking-wider"
                      style={{ background: badgeColor.bg, color: badgeColor.text }}>
                      {plan.badge}
                    </div>
                  ) : (
                    <div className="h-[38px]" />
                  )}

                  <div className="flex flex-1 flex-col px-4 py-5">
                    <p className="font-serif text-lg font-bold text-white/90">{plan.name}</p>
                    <p className="mt-1 text-xs text-white/40">{plan.tagline}</p>

                    <div className="my-4 flex items-baseline gap-1.5">
                      <p className="font-serif text-3xl font-bold text-white/90">{plan.price}</p>
                      <p className="text-xs text-white/30">/ {plan.period}</p>
                    </div>

                    <div className="mb-4 h-px bg-white/[0.07]" />

                    <ul className="flex-1 space-y-2">
                      {plan.features.map((f) => (
                        <li key={f} className="flex items-center gap-2 text-xs text-white/60">
                          <span className="h-1.5 w-1.5 shrink-0 rounded-full" style={{ background: "#b8901f" }} />
                          {f}
                        </li>
                      ))}
                    </ul>

                    <Link href="/register" className="mt-5">
                      <button className="w-full rounded-xl border py-2.5 text-sm font-semibold transition-all hover:bg-white/10"
                        style={{ borderColor: "rgba(255,255,255,0.14)", color: "rgba(255,255,255,0.7)" }}>
                        {plan.id === "free" ? "Start free" : "Choose Plan"}
                      </button>
                    </Link>
                  </div>
                </article>
              )
            })}
          </div>
          </div>

          <p className="mt-10 text-center text-xs text-white/30">
            Upgrade anytime · Cancel anytime · Prices include GST
          </p>
        </div>
      </section>

      {/* ── Trust Pillars ── */}
      <section id="trust" className="kolam-surface py-20 border-y border-secondary/15">
        <div className="mx-auto max-w-6xl px-4">
          <div className="mx-auto max-w-2xl text-center mb-12">
            <p className="royal-label mb-2">Why families choose us</p>
            <h2 className="font-serif text-4xl font-bold md:text-5xl">
              Screened profiles. Real photos. Your rules.
            </h2>
            <div className="ornament-line mx-auto mt-5 max-w-xs">
              <span className="text-secondary text-sm px-2">✦</span>
            </div>
          </div>
          <div className="grid gap-5 md:grid-cols-3">
            {[
              {
                icon: ShieldCheck,
                title: "100% screened profiles",
                body: "Every member is reviewed before going live. Fake and duplicate accounts are removed.",
              },
              {
                icon: BadgeCheck,
                title: "Photo & ID verification",
                body: "Selfie or government ID is checked by our team within 12 hours. Unverified photos stay hidden.",
              },
              {
                icon: Lock,
                title: "Control over privacy",
                body: "Hide contact details, blur photos, and decide who can connect  just like the platforms you trust.",
              },
            ].map((item) => (
              <article key={item.title} className="royal-card p-7">
                <div className="mb-5 flex h-13 w-13 items-center justify-center rounded-2xl bg-gradient-to-br from-primary/10 to-secondary/10 text-primary border border-secondary/20">
                  <item.icon className="h-6 w-6" />
                </div>
                <h3 className="text-lg font-bold tracking-tight">{item.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{item.body}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* ── Success Stories ── */}
      <section id="success" className="w-full overflow-hidden py-16 md:py-20">
        <div className="mx-auto max-w-6xl px-4">
          <div className="text-center mb-10 md:mb-12">
            <p className="royal-label mb-2">Success stories</p>
            <h2 className="font-serif text-2xl font-bold leading-tight md:text-4xl lg:text-5xl">
              Happily married through Astalakshimi
            </h2>
            <div className="ornament-line mx-auto mt-4 w-48 md:mt-5 md:max-w-xs">
              <span className="text-secondary text-sm px-2">✦</span>
            </div>
          </div>
        </div>

        {/* Cards  bleed to edges on mobile, contained on desktop */}
        <div className="flex gap-4 overflow-x-auto px-4 pb-6 pt-2 snap-x snap-mandatory hide-scrollbar md:mx-auto md:max-w-6xl md:grid md:grid-cols-3 md:gap-5 md:overflow-visible md:p-0 md:px-4">
          {stories.map((story) => (
            <article
              key={story.names}
              className="shrink-0 w-[78vw] max-w-[300px] snap-start overflow-hidden rounded-2xl border border-secondary/20 bg-card shadow-sm md:w-auto md:max-w-none royal-card"
            >
              <div className="relative h-52 md:h-60">
                <Image src={story.image} alt={story.names} fill className="object-cover object-top" sizes="(max-width: 768px) 300px, 33vw" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />
              </div>
              <div className="space-y-2 p-5 md:p-6">
                <div className="flex items-center gap-1 text-secondary">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Star key={i} className="h-3 w-3 fill-current md:h-3.5 md:w-3.5" />
                  ))}
                </div>
                <h3 className="font-serif text-base font-bold md:text-lg">{story.names}</h3>
                <p className="text-xs text-muted-foreground">{story.place}</p>
                <p className="font-serif text-xs leading-relaxed text-foreground/75 italic md:text-sm">&ldquo;{story.quote}&rdquo;</p>
              </div>
            </article>
          ))}
        </div>
      </section>

      {/* ── How It Works ── */}
      <section id="how" className="border-y border-secondary/15 bg-card/60 py-20">
        <div className="mx-auto max-w-5xl px-4">
          <div className="text-center mb-12">
            <p className="royal-label mb-2">Simple process</p>
            <h2 className="font-serif text-4xl font-bold md:text-5xl">How it works</h2>
            <div className="ornament-line mx-auto mt-5 max-w-xs">
              <span className="text-secondary text-sm px-2">✦</span>
            </div>
          </div>
          <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
            {[
              { n: "01", title: "Create profile", body: "Share community, education and partner preferences in a few minutes." },
              { n: "02", title: "Verify photos", body: "Selfie or government ID. Our team reviews within 12 hours." },
              { n: "03", title: "See daily matches", body: "Browse recommendations tailored to your filters  on phone first." },
              { n: "04", title: "Connect with families", body: "Send interests, chat when both accept, and take the next step." },
            ].map((step, i) => (
              <div key={step.n} className="relative text-center sm:text-left">
                {/* Connector line */}
                {i < 3 && (
                  <div className="absolute top-5 left-full hidden w-8 lg:block">
                    <div className="h-px bg-gradient-to-r from-secondary/40 to-transparent" />
                  </div>
                )}
                <span className="font-serif text-4xl font-bold text-secondary/30">{step.n}</span>
                <h3 className="mt-1 font-bold text-base tracking-tight">{step.title}</h3>
                <p className="mt-1.5 text-sm text-muted-foreground leading-relaxed">{step.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Heritage Section ── */}
      <section className="mx-auto max-w-6xl px-4 py-20">
        <div className="grid overflow-hidden rounded-3xl border border-secondary/25 bg-card shadow-lg md:grid-cols-2 temple-frame">
          <div className="relative min-h-[280px]">
            <Image
              src={IMAGES.silk}
              alt="Kanjivaram silk sarees in temple gold and maroon"
              fill
              className="object-cover"
              sizes="(max-width: 768px) 100vw, 50vw"
            />
            <div className="absolute inset-0 bg-gradient-to-r from-transparent to-card/20" />
          </div>
          <div className="flex flex-col justify-center space-y-5 p-8 md:p-12">
            <p className="royal-label">Heritage matchmaking</p>
            <h2 className="font-serif text-3xl font-bold leading-tight">Community, faith, and family  for every Indian home</h2>
            <p className="text-sm leading-relaxed text-muted-foreground">
              Browse by mother tongue, caste, city and profession. Horoscope matching is optional. Your photos stay private until they are verified.
            </p>
            <div className="flex flex-wrap gap-2">
              {communities.map((c) => (
                <span key={c} className="rounded-full border border-secondary/25 bg-muted px-3 py-1 text-xs font-medium text-foreground/80">
                  {c}
                </span>
              ))}
            </div>
            <Link href="/register" className="inline-block">
              <Button size="lg" className="px-8">Register free →</Button>
            </Link>
          </div>
        </div>
      </section>

      {/* ── App Download ── */}
      <section className="mx-auto max-w-6xl px-4 pb-20">
        <div className="grid items-center gap-10 overflow-hidden rounded-3xl bg-gradient-to-br from-[#2e0a0c] via-[#4f0f1a] to-primary p-8 text-white md:grid-cols-2 md:p-12">
          <div className="space-y-5">
            <p className="text-xs font-semibold tracking-[0.22em] text-secondary uppercase">On the go</p>
            <h2 className="font-serif text-3xl font-bold leading-tight">Download the Astalakshimi app</h2>
            <p className="text-white/70 leading-relaxed">Daily matches, chat, and verification status  designed for mobile first.</p>
            <div className="flex flex-col gap-3 sm:flex-row">
              <Button variant="secondary" className="justify-center font-semibold">
                <Smartphone className="mr-2 h-4 w-4" /> Get it on Google Play
              </Button>
              <Button variant="outline" className="border-white/25 bg-white/10 text-white hover:bg-white/20 font-semibold">
                Download on App Store
              </Button>
            </div>
          </div>
          <div className="relative mx-auto h-64 w-40 rounded-[2rem] border-2 border-secondary/40 bg-white/10 p-2.5 shadow-2xl">
            <div className="flex h-full flex-col rounded-2xl bg-[#fffdf8] p-3 text-[#1a0e08]">
              <div className="mb-3 h-8 rounded-lg bg-primary/15" />
              <div className="relative mb-2 h-28 overflow-hidden rounded-xl">
                <Image src={IMAGES.stories.chennai} alt="" fill className="object-cover" sizes="140px" />
              </div>
              <div className="h-2.5 w-3/4 rounded-full bg-muted" />
              <div className="mt-1.5 h-2.5 w-1/2 rounded-full bg-muted" />
              <div className="mt-auto flex justify-center gap-1.5 text-primary">
                <Heart className="h-4 w-4" />
                <Users className="h-4 w-4" />
              </div>
            </div>
            {/* Gold ring accent */}
            <div className="absolute -inset-1 rounded-[2.25rem] border border-secondary/20 pointer-events-none" />
          </div>
        </div>
      </section>

      {/* ── Mobile sticky CTA ── */}
      <div className="sticky bottom-0 z-40 border-t border-secondary/20 bg-background/95 p-3 backdrop-blur-lg md:hidden safe-bottom">
        <Link href="/register">
          <Button className="w-full" size="lg">
            Register free →
          </Button>
        </Link>
      </div>

      <SiteFooter />
    </div>
  )
}
