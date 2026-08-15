import Image from "next/image"
import Link from "next/link"
import { cn } from "@/lib/utils"

interface LogoProps {
  withText?: boolean
  className?: string
  light?: boolean
  href?: string | null
  size?: number
}

export function Logo({
  withText = true,
  className,
  light = false,
  href = "/",
  size = 40,
}: LogoProps) {
  const mark = (
    <span className={cn("inline-flex items-center gap-2.5", className)}>
      <span
        className="relative shrink-0 overflow-hidden rounded-full shadow-sm ring-1 ring-secondary/30"
        style={{ width: size, height: size }}
      >
        <Image
          src="/images/logo-lakshmi.png"
          alt="Astalakshimi — Goddess Lakshmi"
          fill
          className="object-cover object-center"
          sizes={`${size}px`}
          priority
        />
      </span>
      {withText && (
        <span className="leading-tight">
          <span
            className={cn(
              "block font-serif text-lg font-bold tracking-tight sm:text-xl",
              light ? "text-white" : "text-primary"
            )}
          >
            Astalakshimi
          </span>
          <span
            className={cn(
              "hidden font-tamil text-[11px] tracking-[0.18em] sm:block",
              light ? "text-secondary" : "text-gold"
            )}
          >
            அஷ்டலக்ஷ்மி
          </span>
        </span>
      )}
    </span>
  )

  if (!href) return mark

  return (
    <Link href={href} className="inline-flex items-center" aria-label="Astalakshimi home">
      {mark}
    </Link>
  )
}
