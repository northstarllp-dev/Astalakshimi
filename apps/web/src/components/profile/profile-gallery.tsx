"use client"

import * as React from "react"
import Image from "next/image"
import { BadgeCheck, ChevronLeft, ChevronRight, FileText, MapPin, ShieldCheck, X } from "lucide-react"
import { cn } from "@/lib/utils"

type ProfileGalleryProps = {
  name: string
  age: number
  city: string
  state: string
  lastActive: string
  photos: string[]
  photoVerified?: boolean
  verified?: boolean
  hasHoroscope?: boolean
}

type BadgeKey = "photo" | "screened" | "horoscope"

const BADGE_POPUPS: Record<BadgeKey, { title: string; body: string }> = {
  photo: {
    title: "Photo verified",
    body: "This member’s photos were reviewed by our team. The pictures match the profile and were approved within our 12-hour review window.",
  },
  screened: {
    title: "Profile screened",
    body: "This profile has been screened for authenticity — identity checks and basic details were reviewed before it went live.",
  },
  horoscope: {
    title: "Horoscope available",
    body: "A horoscope (jathagam) PDF is attached to this profile. You can request a match comparison after both families connect.",
  },
}

export function ProfileGallery({
  name,
  age,
  city,
  state,
  lastActive,
  photos,
  photoVerified,
  verified,
  hasHoroscope,
}: ProfileGalleryProps) {
  const [activeIndex, setActiveIndex] = React.useState(0)
  const [lightboxOpen, setLightboxOpen] = React.useState(false)
  const [badgePopup, setBadgePopup] = React.useState<BadgeKey | null>(null)
  const hero = photos[activeIndex] ?? photos[0]
  const extra = photos.slice(1)
  const hasMany = photos.length > 1

  const openLightbox = (index: number) => {
    setActiveIndex(index)
    setLightboxOpen(true)
  }

  const closeLightbox = () => setLightboxOpen(false)
  const prevPhoto = (e?: React.MouseEvent) => {
    e?.stopPropagation()
    setActiveIndex((i) => (i - 1 + photos.length) % photos.length)
  }
  const nextPhoto = (e?: React.MouseEvent) => {
    e?.stopPropagation()
    setActiveIndex((i) => (i + 1) % photos.length)
  }

  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (badgePopup) {
          setBadgePopup(null)
          return
        }
        if (lightboxOpen) closeLightbox()
      }
      if (e.key === "ArrowLeft" && hasMany) setActiveIndex((i) => (i - 1 + photos.length) % photos.length)
      if (e.key === "ArrowRight" && hasMany) setActiveIndex((i) => (i + 1) % photos.length)
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [lightboxOpen, badgePopup, hasMany, photos.length])

  return (
    <>
      <div className="flex h-full flex-col">
        <div className="group relative w-full flex-1 overflow-hidden bg-muted shadow-lg">
          <Image
            src={hero}
            alt={`${name}, ${age}`}
            fill
            priority
            className="object-cover object-[center_12%] transition-transform duration-300 group-hover:scale-[1.02]"
            sizes="(max-width: 1024px) 100vw, 42vw"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/25 to-black/15" />

          <div
            role="button"
            tabIndex={0}
            onClick={() => openLightbox(activeIndex)}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault()
                openLightbox(activeIndex)
              }
            }}
            className="absolute inset-0 z-0 cursor-pointer"
            aria-label="Open photo in large view"
          />

          {hasMany && (
            <>
              <button
                type="button"
                onClick={prevPhoto}
                className="absolute left-2 top-1/2 z-20 inline-flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full bg-[#fffbf4] text-primary shadow-md ring-1 ring-secondary/40 sm:h-10 sm:w-10"
                aria-label="Previous photo"
              >
                <ChevronLeft className="h-5 w-5" />
              </button>
              <button
                type="button"
                onClick={nextPhoto}
                className="absolute right-2 top-1/2 z-20 inline-flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full bg-[#fffbf4] text-primary shadow-md ring-1 ring-secondary/40 sm:h-10 sm:w-10"
                aria-label="Next photo"
              >
                <ChevronRight className="h-5 w-5" />
              </button>
            </>
          )}

          <div className="absolute left-2.5 right-2.5 top-2.5 z-20 flex flex-wrap gap-1.5">
            {photoVerified && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation()
                  setBadgePopup("photo")
                }}
                className="inline-flex items-center gap-1 rounded-full bg-[#fffbf4] px-2.5 py-1 text-[11px] font-semibold text-primary shadow-sm ring-1 ring-secondary/35"
              >
                <BadgeCheck className="h-3.5 w-3.5 text-secondary" /> Photo verified
              </button>
            )}
            {verified && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation()
                  setBadgePopup("screened")
                }}
                className="inline-flex items-center gap-1 rounded-full bg-[#fffbf4] px-2.5 py-1 text-[11px] font-semibold text-primary shadow-sm ring-1 ring-secondary/35"
              >
                <ShieldCheck className="h-3.5 w-3.5 text-secondary" /> Profile screened
              </button>
            )}
            {hasHoroscope && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation()
                  setBadgePopup("horoscope")
                }}
                className="inline-flex items-center gap-1 rounded-full bg-[#fffbf4] px-2.5 py-1 text-[11px] font-semibold text-primary shadow-sm ring-1 ring-secondary/35"
              >
                <FileText className="h-3.5 w-3.5 text-secondary" /> Horoscope
              </button>
            )}
          </div>

          <div className="pointer-events-none absolute inset-x-0 bottom-0 z-10 p-3 text-white sm:p-4 md:p-5">
            <div className="flex items-end justify-between gap-2 sm:gap-3">
              <div className="min-w-0">
                <h1 className="font-serif text-2xl font-bold tracking-tight sm:text-3xl md:text-4xl">
                  {name}, {age}
                </h1>
                <p className="mt-0.5 flex items-center gap-1.5 text-xs text-white/85 sm:mt-1 sm:text-sm">
                  <MapPin className="h-3.5 w-3.5 shrink-0 sm:h-4 sm:w-4" />
                  <span className="truncate">
                    {city}, {state}
                  </span>
                </p>
                <p className="mt-0.5 text-[11px] text-white/65 sm:mt-1 sm:text-xs">{lastActive}</p>
              </div>

              {extra.length > 0 && (
                <div className="pointer-events-auto relative z-20 flex shrink-0 gap-1.5">
                  {extra.slice(0, 4).map((photo, i) => (
                    <button
                      key={photo}
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation()
                        openLightbox(i + 1)
                      }}
                      className={cn(
                        "relative h-10 w-10 shrink-0 overflow-hidden rounded-lg border-2 transition-all sm:h-12 sm:w-12 md:h-14 md:w-14",
                        activeIndex === i + 1 ? "border-secondary" : "border-white/40 hover:border-white"
                      )}
                      aria-label={`Open photo ${i + 2}`}
                    >
                      <Image src={photo} alt="" fill className="object-cover" sizes="56px" />
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {badgePopup && (
        <div
          className="fixed inset-0 z-[110] flex items-end justify-center bg-black/50 p-4 sm:items-center"
          onClick={() => setBadgePopup(null)}
          role="dialog"
          aria-modal="true"
          aria-labelledby="badge-popup-title"
        >
          <div
            className="w-full max-w-sm rounded-2xl border border-secondary/30 bg-[#fffbf4] p-5 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-3">
              <h2 id="badge-popup-title" className="font-serif text-xl font-bold text-primary">
                {BADGE_POPUPS[badgePopup].title}
              </h2>
              <button
                type="button"
                onClick={() => setBadgePopup(null)}
                className="tap-target inline-flex items-center justify-center rounded-full border border-border bg-card"
                aria-label="Close"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <p className="mt-3 text-sm leading-relaxed text-foreground/85">{BADGE_POPUPS[badgePopup].body}</p>
          </div>
        </div>
      )}

      {lightboxOpen && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 backdrop-blur-sm"
          onClick={closeLightbox}
          role="dialog"
          aria-modal="true"
          aria-label={`${name} photos`}
        >
          <button
            type="button"
            onClick={closeLightbox}
            className="absolute right-4 top-4 z-10 inline-flex h-10 w-10 items-center justify-center rounded-full bg-[#fffbf4] text-primary shadow-md"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>

          {hasMany && (
            <>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation()
                  prevPhoto(e)
                }}
                className="absolute left-3 z-10 inline-flex h-12 w-12 items-center justify-center rounded-full bg-[#fffbf4] text-primary shadow-md sm:left-6"
                aria-label="Previous photo"
              >
                <ChevronLeft className="h-6 w-6" />
              </button>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation()
                  nextPhoto(e)
                }}
                className="absolute right-3 z-10 inline-flex h-12 w-12 items-center justify-center rounded-full bg-[#fffbf4] text-primary shadow-md sm:right-6"
                aria-label="Next photo"
              >
                <ChevronRight className="h-6 w-6" />
              </button>
            </>
          )}

          <div className="relative h-full w-full max-w-4xl" onClick={(e) => e.stopPropagation()}>
            <Image
              src={photos[activeIndex]}
              alt={`${name} photo ${activeIndex + 1}`}
              fill
              className="object-contain"
              sizes="100vw"
            />
          </div>

          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 rounded-full bg-[#fffbf4] px-3 py-1 text-xs font-semibold text-primary">
            {activeIndex + 1} / {photos.length}
          </div>
        </div>
      )}
    </>
  )
}
