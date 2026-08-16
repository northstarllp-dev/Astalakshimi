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
          alt="Astalakshimi  Goddess Lakshmi"
          fill
          className="object-cover object-center"
          sizes={`${size}px`}
          priority
        />
      </span>
      {withText && (
        <Image
          src="/images/logo_123.png"
          alt="Sri Ashtalakshmi Matrimony"
          width={160}
          height={size}
          className={cn("object-contain", light && "brightness-0 invert")}
          style={{ height: size, width: "auto" }}
          priority
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
