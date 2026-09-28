import Image from "next/image"
import { getMediaUrl, cn } from "@/lib/utils"

/**
 * Member photo slot. While the profile is still unknown, render an empty
 * placeholder — never a guessed initial such as "M" from "Member".
 */
export function ProfilePhotoMark({
  src,
  name,
  pending = false,
  blur = false,
  className,
  imageClassName,
  letterClassName,
  sizes = "36px",
  alt = "",
}: {
  src?: string | null
  name?: string | null
  pending?: boolean
  blur?: boolean
  className?: string
  imageClassName?: string
  letterClassName?: string
  sizes?: string
  alt?: string
}) {
  const letter = name?.trim()?.[0]

  return (
    <span className={cn("relative block overflow-hidden bg-muted", className)}>
      {pending ? (
        <span className="absolute inset-0 animate-pulse bg-muted" aria-hidden="true" />
      ) : src ? (
        <Image
          src={getMediaUrl(src)}
          alt={alt || name || ""}
          fill
          sizes={sizes}
          className={cn("object-cover", blur && "blur-[2px]", imageClassName)}
        />
      ) : letter ? (
        <span
          className={cn(
            "absolute inset-0 flex items-center justify-center bg-primary/10 font-bold text-primary",
            letterClassName,
          )}
        >
          {letter}
        </span>
      ) : (
        <span className="absolute inset-0 bg-muted" aria-hidden="true" />
      )}
    </span>
  )
}
