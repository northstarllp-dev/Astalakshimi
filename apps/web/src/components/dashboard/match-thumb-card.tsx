"use client"

import Image from "next/image"
import Link from "next/link"
import { getMediaUrl } from "@/lib/utils"
import { Badge } from "@/components/ui/badge"
import { BadgeCheck, Star } from "lucide-react"

export function MatchThumbCard({
  match,
  priority = false,
}: {
  match: any
  priority?: boolean
}) {
  return (
    <Link
      href={`/profiles/${match.id}`}
      className="group relative block overflow-hidden rounded-2xl border border-secondary/20 bg-card shadow-sm transition-shadow hover:shadow-md"
    >
      <div className="relative aspect-[3/4]">
        <Image
          src={getMediaUrl(match.photos[0])}
          alt={`${match.fullName}, ${match.age}`}
          fill
          priority={priority}
          className="object-cover object-[center_18%] transition-transform duration-500 group-hover:scale-[1.03]"
          sizes="(max-width: 640px) 50vw, 220px"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/15 to-black/20" />
        <div className="absolute left-2 top-2 flex flex-col items-start gap-1">
          <Badge className="border-transparent bg-emerald-500 text-[10px] font-bold text-white">
            <Star className="fill-current" /> {match.matchPercent}%
          </Badge>
          {match.photoVerified && (
            <Badge
              variant="outline"
              className="border-transparent bg-black/50 text-[10px] font-semibold text-white backdrop-blur"
            >
              <BadgeCheck className="text-secondary" /> Verified
            </Badge>
          )}
        </div>
        <div className="absolute inset-x-0 bottom-0 p-2.5 text-white">
          <h3 className="truncate font-serif text-base font-bold leading-tight sm:text-lg">
            {match.fullName}, {match.age}
          </h3>
        </div>
      </div>
    </Link>
  )
}
