"use client"

import { cn } from "@/lib/utils"
import { isHoroscopePdfFileName } from "@/lib/horoscope-file"

export function HoroscopePreview({
  src,
  title,
  className,
}: {
  src: string
  title: string
  className?: string
}) {
  const isPdf = isHoroscopePdfFileName(title)

  if (isPdf) {
    return (
      <iframe
        src={src}
        title={title}
        className={cn("h-[min(70vh,640px)] w-full border-0", className)}
      />
    )
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt={title}
      className={cn("max-h-[min(70vh,640px)] w-full object-contain", className)}
    />
  )
}
