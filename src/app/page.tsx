import Image from "next/image"
import Link from "next/link"
import { SiteHeader } from "@/components/layout/site-header"
import { SiteFooter } from "@/components/layout/site-footer"
import { HeroRegisterCard } from "@/components/landing/hero-register-card"
import { Button } from "@/components/ui/button"
import { TempleDivider } from "@/components/ui/temple-ornament"
import { IMAGES } from "@/lib/images"
import {
  BadgeCheck,
  Heart,
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
    place: "Chennai · Tamil wedding",
    quote: "We matched on community and values. The verified photos made our families comfortable from day one.",
    image: IMAGES.stories.chennai,
  },
  {
    names: "Meera & Arjun",
    place: "Bengaluru · Kannada traditions",
    quote: "Daily recommendations felt personal — not noisy. We met within three weeks.",
    image: IMAGES.stories.bengaluru,
  },
  {
    names: "Divya & Rohan",
    place: "Hyderabad · Telugu mandapam",
    quote: "Privacy controls and ID verification were the reason our parents trusted Astalakshimi.",
    image: IMAGES.stories.hyderabad,
  },
]

const regions = [
  { name: "Tamil Nadu", city: "Chennai · Madurai", image: IMAGES.cities.chennai },
  { name: "Karnataka", city: "Bengaluru · Mysuru", image: IMAGES.cities.bengaluru },
  { name: "Kerala", city: "Kochi · Thiruvananthapuram", image: IMAGES.cities.kerala },
  { name: "Andhra & Telangana", city: "Hyderabad · Vijayawada", image: IMAGES.cities.madurai },
]

const communities = ["Tamil", "Telugu", "Malayalam", "Kannada", "Iyer", "Iyengar", "Nair", "Reddy", "Chettiar", "Nadar"]

export default function LandingPage() {
  return (
    <div className="flex min-h-dvh flex-col bg-background">
      <SiteHeader />

      <section className="relative min-h-[640px] overflow-hidden md:min-h-[720px]">
        <Image
          src={IMAGES.hero}
          alt="South Indian temple wedding in Kanjivaram silk"
          fill
          priority
          className="object-cover object-[center_30%]"
          sizes="100vw"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-[#2a0c0e]/92 via-[#3d120c]/70 to-[#3d120c]/25" />
        <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-background to-transparent" />

        <div className="relative z-10 mx-auto grid max-w-6xl items-center gap-10 px-4 py-16 md:grid-cols-[1.1fr_0.9fr] md:py-20">
          <div className="max-w-xl space-y-6 text-white">
            <p className="font-tamil text-lg tracking-[0.28em] text-secondary">
              வணக்கம்
            </p>
            <h1 className="font-serif text-4xl font-bold leading-[1.1] md:text-6xl">
              Find a match rooted in
              <span className="block text-secondary"> South Indian tradition</span>
            </h1>
            <p className="max-w-md text-base leading-relaxed text-white/85 md:text-lg">
              Kanjivaram, jasmine, and family values. Premium matchmaking for Tamil, Telugu, Kannada and Malayalam homes — with verified photos and screened profiles.
            </p>
            <div className="flex flex-wrap gap-2">
              {communities.slice(0, 6).map((c) => (
                <span
                  key={c}
                  className="rounded-full border border-secondary/40 bg-white/10 px-3 py-1 text-xs font-medium tracking-wide text-white/90 backdrop-blur"
                >
                  {c}
                </span>
              ))}
            </div>
          </div>
          <HeroRegisterCard />
        </div>
      </section>

      <section className="border-y border-border bg-card/80">
        <TempleDivider className="px-6 pt-6" />
        <div className="mx-auto grid max-w-6xl grid-cols-2 gap-6 px-4 py-8 md:grid-cols-4">
          {stats.map((stat) => (
            <div key={stat.label} className="text-center">
              <p className="font-serif text-2xl font-bold text-primary md:text-3xl">{stat.value}</p>
              <p className="mt-1 text-xs font-medium tracking-wide text-muted-foreground uppercase">{stat.label}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-16">
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-xs font-semibold tracking-[0.22em] text-primary uppercase">Across the South</p>
          <h2 className="mt-2 font-serif text-3xl font-bold md:text-4xl">From temple towns to tech cities</h2>
          <p className="mt-3 text-sm text-muted-foreground md:text-base">
            Families in Chennai, Madurai, Bengaluru, Hyderabad, Kochi and beyond — searching with community, mother tongue and tradition in mind.
          </p>
        </div>
        <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {regions.map((region) => (
            <article key={region.name} className="group overflow-hidden rounded-2xl border border-secondary/30 bg-card shadow-sm temple-frame">
              <div className="relative h-44">
                <Image
                  src={region.image}
                  alt={region.name}
                  fill
                  className="object-cover transition-transform duration-500 group-hover:scale-105"
                  sizes="(max-width: 640px) 100vw, 25vw"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/20 to-transparent" />
                <div className="absolute inset-x-0 bottom-0 p-4 text-white">
                  <h3 className="font-serif text-xl font-bold">{region.name}</h3>
                  <p className="text-xs text-white/80">{region.city}</p>
                </div>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section id="trust" className="mx-auto max-w-6xl px-4 py-8 pb-16">
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-xs font-semibold tracking-[0.2em] text-primary uppercase">Why families choose us</p>
          <h2 className="mt-2 font-serif text-3xl font-bold md:text-4xl">
            Screened profiles. Real photos. Your rules.
          </h2>
        </div>
        <div className="mt-10 grid gap-4 md:grid-cols-3">
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
              body: "Hide contact details, blur photos, and decide who can connect — just like the platforms you trust.",
            },
          ].map((item) => (
            <article key={item.title} className="rounded-2xl border border-secondary/25 bg-card p-6 shadow-sm">
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                <item.icon className="h-6 w-6" />
              </div>
              <h3 className="text-lg font-semibold">{item.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{item.body}</p>
            </article>
          ))}
        </div>
      </section>

      <section id="success" className="mx-auto max-w-6xl px-4 py-16">
        <div className="text-center">
          <p className="text-xs font-semibold tracking-[0.2em] text-primary uppercase">Success stories</p>
          <h2 className="mt-2 font-serif text-3xl font-bold md:text-4xl">Happily married through Astalakshimi</h2>
          <TempleDivider className="mx-auto mt-5 max-w-xs" />
        </div>
        <div className="mt-10 flex gap-4 overflow-x-auto pb-2 snap-x hide-scrollbar md:grid md:grid-cols-3 md:overflow-visible">
          {stories.map((story) => (
            <article
              key={story.names}
              className="min-w-[280px] snap-start overflow-hidden rounded-2xl border border-secondary/30 bg-card shadow-sm md:min-w-0"
            >
              <div className="relative h-56">
                <Image src={story.image} alt={story.names} fill className="object-cover object-top" sizes="(max-width: 768px) 280px, 33vw" />
              </div>
              <div className="space-y-2 p-5">
                <div className="flex items-center gap-1 text-secondary">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Star key={i} className="h-3.5 w-3.5 fill-current" />
                  ))}
                </div>
                <h3 className="font-semibold">{story.names}</h3>
                <p className="text-xs text-muted-foreground">{story.place}</p>
                <p className="text-sm leading-relaxed text-foreground/80">&ldquo;{story.quote}&rdquo;</p>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section id="how" className="border-y border-border bg-card/80 py-16">
        <div className="mx-auto max-w-5xl px-4">
          <h2 className="text-center font-serif text-3xl font-bold">How it works</h2>
          <TempleDivider className="mx-auto mt-4 max-w-xs" />
          <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {[
              { n: "01", title: "Create profile", body: "Share community, education and partner preferences in a few minutes." },
              { n: "02", title: "Verify photos", body: "Selfie or government ID. Our team reviews within 12 hours." },
              { n: "03", title: "See daily matches", body: "Browse recommendations tailored to your filters — on phone first." },
              { n: "04", title: "Connect with families", body: "Send interests, chat when both accept, and take the next step." },
            ].map((step) => (
              <div key={step.n} className="text-center sm:text-left">
                <p className="font-serif text-3xl text-secondary">{step.n}</p>
                <h3 className="mt-2 font-semibold">{step.title}</h3>
                <p className="mt-1 text-sm text-muted-foreground">{step.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-16">
        <div className="grid overflow-hidden rounded-3xl border border-secondary/30 bg-card shadow-sm md:grid-cols-2">
          <div className="relative min-h-[260px]">
            <Image
              src={IMAGES.silk}
              alt="Kanjivaram silk sarees in temple gold and maroon"
              fill
              className="object-cover"
              sizes="(max-width: 768px) 100vw, 50vw"
            />
          </div>
          <div className="flex flex-col justify-center space-y-4 p-6 md:p-10">
            <p className="text-xs font-semibold tracking-[0.22em] text-primary uppercase">Heritage matchmaking</p>
            <h2 className="font-serif text-3xl font-bold">Woven like a Kanjivaram — community, faith, and family</h2>
            <p className="text-sm leading-relaxed text-muted-foreground">
              Browse by mother tongue, caste, city and profession. Horoscope matching is optional. Your photos stay private until they are verified.
            </p>
            <div className="flex flex-wrap gap-2">
              {communities.map((c) => (
                <span key={c} className="rounded-full border border-border bg-muted px-3 py-1 text-xs font-medium">
                  {c}
                </span>
              ))}
            </div>
            <Link href="/signup">
              <Button size="lg">Register free</Button>
            </Link>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 pb-16">
        <div className="grid items-center gap-10 overflow-hidden rounded-3xl bg-gradient-to-br from-[#3d120c] via-[#6b1024] to-primary p-6 text-white md:grid-cols-2 md:p-10">
          <div className="space-y-4">
            <p className="font-tamil text-sm tracking-[0.2em] text-secondary">நம்பிக்கை</p>
            <h2 className="font-serif text-3xl font-bold">Download the Astalakshimi app</h2>
            <p className="text-white/80">Daily matches, chat, and verification status — designed for mobile first.</p>
            <div className="flex flex-col gap-3 sm:flex-row">
              <Button variant="secondary" className="justify-center">
                <Smartphone className="mr-2 h-4 w-4" /> Get it on Google Play
              </Button>
              <Button variant="outline" className="border-white/30 bg-white/10 text-white hover:bg-white/20">
                Download on App Store
              </Button>
            </div>
          </div>
          <div className="relative mx-auto h-64 w-40 rounded-[2rem] border-4 border-secondary/40 bg-white/10 p-3">
            <div className="flex h-full flex-col rounded-2xl bg-[#fffbf4] p-3 text-[#2a1810]">
              <div className="mb-3 h-8 rounded-lg bg-primary/15" />
              <div className="relative mb-2 h-28 overflow-hidden rounded-xl">
                <Image src={IMAGES.stories.chennai} alt="" fill className="object-cover" sizes="140px" />
              </div>
              <div className="h-3 w-3/4 rounded bg-muted" />
              <div className="mt-2 h-3 w-1/2 rounded bg-muted" />
              <div className="mt-auto flex justify-center gap-1 text-primary">
                <Heart className="h-4 w-4" />
                <Users className="h-4 w-4" />
              </div>
            </div>
          </div>
        </div>
      </section>

      <div className="sticky bottom-0 z-40 border-t border-border bg-background/95 p-3 backdrop-blur md:hidden safe-bottom">
        <Link href="/signup">
          <Button className="w-full" size="lg">
            Register free
          </Button>
        </Link>
      </div>

      <SiteFooter />
    </div>
  )
}
