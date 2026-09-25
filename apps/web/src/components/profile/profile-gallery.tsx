"use client"

import * as React from "react"
import Image from "next/image"
import { ChevronLeft, ChevronRight, FileText, MapPin, X } from "lucide-react"
import { cn, getMediaUrl } from "@/lib/utils"
import { LockedPhoto } from "@/components/profile/locked-photo"

type ProfileGalleryProps = {
  name: string
  age: number
  city: string
  state: string
  lastActive: string
  photos: string[]
  hasHoroscope?: boolean
  blurPhoto?: boolean
  plan?: string | null
}

const HOROSCOPE_POPUP = {
  title: "Horoscope available",
  body: "A horoscope (jathagam) PDF is attached to this profile. You can request a match comparison after both families connect.",
}

export function ProfileGallery({
  name,
  age,
  city,
  state,
  lastActive,
  photos,
  hasHoroscope,
  blurPhoto,
  plan,
}: ProfileGalleryProps) {
  const [activeIndex, setActiveIndex] = React.useState(0)
  const [lightboxOpen, setLightboxOpen] = React.useState(false)
  const [horoscopePopupOpen, setHoroscopePopupOpen] = React.useState(false)
  const [naturalSize, setNaturalSize] = React.useState<{ width: number; height: number } | null>(null)
  const [slot, setSlot] = React.useState({ width: 0, height: 0 })
  const slotRef = React.useRef<HTMLDivElement>(null)
  const hero = photos[activeIndex] ?? photos[0]
  const extra = photos.slice(1)
  const hasMany = photos.length > 1
  const isHidden = Boolean(blurPhoto) || photos.length === 0

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
    const el = slotRef.current
    if (!el) return
    const update = () => {
      const rect = el.getBoundingClientRect()
      setSlot({ width: Math.floor(rect.width), height: Math.floor(rect.height) })
    }
    update()
    const observer = new ResizeObserver(update)
    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  const fitted = React.useMemo(() => {
    if (!naturalSize || slot.width < 8 || slot.height < 8) return null
    const scale = Math.min(slot.width / naturalSize.width, slot.height / naturalSize.height, 1)
    return {
      width: Math.max(1, Math.floor(naturalSize.width * scale)),
      height: Math.max(1, Math.floor(naturalSize.height * scale)),
    }
  }, [naturalSize, slot])

  React.useEffect(() => {
    setNaturalSize(null)
    if (!hero || isHidden) return
    const probe = new window.Image()
    let cancelled = false
    probe.onload = () => {
      if (!cancelled && probe.naturalWidth > 0 && probe.naturalHeight > 0) {
        setNaturalSize({ width: probe.naturalWidth, height: probe.naturalHeight })
      }
    }
    probe.src = getMediaUrl(hero)
    return () => {
      cancelled = true
    }
  }, [hero, isHidden])

  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (horoscopePopupOpen) {
          setHoroscopePopupOpen(false)
          return
        }
        if (lightboxOpen) closeLightbox()
      }
      if (e.key === "ArrowLeft" && hasMany) setActiveIndex((i) => (i - 1 + photos.length) % photos.length)
      if (e.key === "ArrowRight" && hasMany) setActiveIndex((i) => (i + 1) % photos.length)
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [lightboxOpen, horoscopePopupOpen, hasMany, photos.length])
  return (
    <>
      <div ref={slotRef} className="flex h-full w-full items-center justify-center">
        <div
          className="group relative overflow-hidden rounded-2xl border border-border/70 bg-muted shadow-md sm:rounded-3xl"
          style={fitted ? { width: fitted.width, height: fitted.height } : { width: "100%", height: "100%" }}
        >
          {isHidden ? (
            <LockedPhoto src={hero} label={`${name}'s photo is hidden`} />
          ) : fitted && naturalSize ? (
            <Image
              src={getMediaUrl(hero)}
              alt={`${name}, ${age}`}
              width={naturalSize.width}
              height={naturalSize.height}
              quality={100}
              unoptimized
              priority
              className={cn("block h-full w-full object-contain", blurPhoto ? "blur-xl" : "")}
              style={{ width: "100%", height: "100%", objectFit: "contain" }}
            />
          ) : (
            <div className="h-full w-full bg-muted" aria-hidden />
          )}
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

          <div className="absolute left-2.5 right-2.5 top-2.5 z-20 flex flex-wrap items-center gap-1.5">
            {hasHoroscope && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation()
                  setHoroscopePopupOpen(true)
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
                <h1 className="font-serif text-xl font-bold tracking-tight sm:text-2xl">
                  {name}, {age}
                </h1>
                <p className="mt-0.5 flex items-center gap-1.5 text-xs text-white/85 sm:mt-1 sm:text-sm">
                  <MapPin className="h-3.5 w-3.5 shrink-0 sm:h-4 sm:w-4" />
                  <span className="truncate">
                    {city}, {state}
                  </span>
                </p>
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
                        activeIndex === i + 1 ? "border-secondary" : "border-white/40 hover:border-white",
                        blurPhoto ? "blur-md" : ""
                      )}
                      aria-label={`Open photo ${i + 2}`}
                    >
                      <Image src={getMediaUrl(photo)} alt="" fill className="object-cover" sizes="56px" />
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {horoscopePopupOpen && (
        <div
          className="fixed inset-0 z-[110] flex items-end justify-center bg-black/50 p-4 sm:items-center"
          onClick={() => setHoroscopePopupOpen(false)}
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
                {HOROSCOPE_POPUP.title}
              </h2>
              <button
                type="button"
                onClick={() => setHoroscopePopupOpen(false)}
                className="tap-target inline-flex items-center justify-center rounded-full border border-border bg-card"
                aria-label="Close"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <p className="mt-3 text-sm leading-relaxed text-foreground/85">{HOROSCOPE_POPUP.body}</p>
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
            {isHidden ? (
              <LockedPhoto src={photos[activeIndex] ?? hero} label={`${name}'s photo is hidden`} />
            ) : (
              <Image
                src={getMediaUrl(photos[activeIndex])}
                alt={`${name} photo ${activeIndex + 1}`}
                fill
                className={cn("object-contain", blurPhoto ? "blur-2xl scale-105" : "")}
                sizes="100vw"
              />
            )}
          </div>

          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 rounded-full bg-[#fffbf4] px-3 py-1 text-xs font-semibold text-primary">
            {activeIndex + 1} / {photos.length}
          </div>
        </div>
      )}
    </>
  )
}
