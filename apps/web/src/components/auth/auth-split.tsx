"use client"

import Image from "next/image"
import Link from "next/link"
import { Logo } from "@/components/ui/logo"
import { cn } from "@/lib/utils"
import { ArrowLeft, ShieldCheck, type LucideIcon } from "lucide-react"

type TrustItem = {
  icon?: LucideIcon
  label: string
}

type AuthSplitProps = {
  imageSrc: string
  imageAlt: string
  kicker: string
  title: string
  subtitle: string
  trust?: TrustItem[]
  backHref?: string
  onBack?: () => void
  backLabel?: string
  children: React.ReactNode
  panelClassName?: string
}

export function AuthSplit({
  imageSrc,
  imageAlt,
  kicker,
  title,
  subtitle,
  trust = [{ icon: ShieldCheck, label: "Trusted by families across India" }],
  backHref = "/",
  onBack,
  backLabel = "Back to home",
  children,
  panelClassName,
}: AuthSplitProps) {
  return (
    <div className="grid min-h-dvh bg-background lg:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)]">
      <aside className="relative isolate hidden overflow-hidden lg:block">
        <Image
          src={imageSrc}
          alt={imageAlt}
          fill
          priority
          className="object-cover object-[center_28%]"
          sizes="52vw"
        />
        <div
          className="absolute inset-0"
          style={{
            background:
              "linear-gradient(180deg, rgba(26,6,8,0.35) 0%, rgba(61,18,12,0.28) 38%, rgba(26,6,8,0.82) 100%)",
          }}
        />
        <div className="gold-rule absolute inset-x-0 top-0 z-10 opacity-80" />
        <div className="gold-rule absolute inset-x-0 bottom-0 z-10 opacity-60" />
        <div className="relative z-10 flex h-full flex-col justify-between p-10 xl:p-14">
          <Logo light href="/" size={44} />
          <div className="max-w-md space-y-4">
            <p className="royal-label text-gold-light">{kicker}</p>
            <h1
              className="font-serif text-5xl font-bold leading-[1.08] text-white xl:text-[3.4rem]"
              style={{ textShadow: "0 2px 24px rgba(26,6,8,0.45)" }}
            >
              {title}
            </h1>
            <p className="max-w-sm text-sm leading-relaxed text-white/75">{subtitle}</p>
            <ul className="mt-6 space-y-2">
              {trust.map((item) => {
                const Icon = item.icon ?? ShieldCheck
                return (
                  <li key={item.label} className="flex items-center gap-2 text-sm text-white/80">
                    <Icon className="h-4 w-4 shrink-0 text-gold-light" />
                    {item.label}
                  </li>
                )
              })}
            </ul>
          </div>
        </div>
      </aside>

      <section className="relative flex min-h-dvh flex-col kolam-surface lg:h-dvh lg:overflow-y-auto hide-scrollbar">
        <div
          className="pointer-events-none absolute inset-x-0 top-0 h-40 lg:hidden"
          aria-hidden
        >
          <Image src={imageSrc} alt="" fill className="object-cover object-[center_22%] opacity-90" sizes="100vw" />
          <div className="absolute inset-0 bg-gradient-to-b from-[#1a0608]/50 via-[#1a0608]/20 to-background" />
        </div>

        <header className="relative z-10 flex items-center gap-3 px-4 pb-2 pt-4 safe-top lg:px-10 lg:pt-8">
          {onBack ? (
            <button
              type="button"
              onClick={onBack}
              className="tap-target inline-flex cursor-pointer items-center justify-center rounded-full border border-secondary/25 bg-card/90 text-muted-foreground shadow-sm backdrop-blur hover:border-primary/30 hover:text-primary"
              aria-label={backLabel}
            >
              <ArrowLeft className="h-4 w-4" />
            </button>
          ) : (
            <Link
              href={backHref}
              className="tap-target inline-flex items-center justify-center rounded-full border border-secondary/25 bg-card/90 text-muted-foreground shadow-sm backdrop-blur hover:border-primary/30 hover:text-primary"
              aria-label={backLabel}
            >
              <ArrowLeft className="h-4 w-4" />
            </Link>
          )}
          <div className="lg:hidden">
            <Logo size={36} />
          </div>
        </header>

        <div className={cn("relative z-10 mx-auto flex w-full max-w-lg flex-1 flex-col px-4 py-6 lg:max-w-xl lg:px-10 lg:py-10", panelClassName)}>
          {children}
        </div>
      </section>
    </div>
  )
}
