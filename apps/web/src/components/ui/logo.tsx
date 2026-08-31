import Link from "next/link"
import { cn } from "@/lib/utils"

interface LogoProps {
  withText?: boolean
  className?: string
  light?: boolean
  href?: string | null
  size?: number
}

const MARK_SRC = "/images/logo-lakshmi.png"
const WORDMARK_SRC = "/images/logo_123.png"

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
        className="relative shrink-0 overflow-hidden rounded-full bg-primary shadow-sm ring-1 ring-secondary/40"
        style={{ width: size, height: size }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element -- local public assets; next/image blanks when turbopack dies */}
        <img
          src={MARK_SRC}
          alt=""
          width={size}
          height={size}
          className="h-full w-full object-cover object-center"
          decoding="async"
        />
      </span>
      {withText && (
        // Wordmark PNG is gold on black — luminance-mask so cream headers get gold type, dark footers get cream type
        <span
          role="img"
          aria-label="Sri Ashtalakshmi Matrimony"
          className="inline-block h-9 w-[150px] shrink-0 bg-secondary sm:h-10 sm:w-[168px]"
          style={{
            backgroundColor: light ? "#fff8ee" : "#b8901f",
            WebkitMaskImage: `url(${WORDMARK_SRC})`,
            WebkitMaskSize: "contain",
            WebkitMaskRepeat: "no-repeat",
            WebkitMaskPosition: "left center",
            maskImage: `url(${WORDMARK_SRC})`,
            maskSize: "contain",
            maskRepeat: "no-repeat",
            maskPosition: "left center",
          }}
        />
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
