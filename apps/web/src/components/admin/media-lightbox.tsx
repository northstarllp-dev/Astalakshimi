"use client"

import * as React from "react"
import { Expand, ExternalLink, FileText, X } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { isHoroscopePdfFileName } from "@/lib/horoscope-file"

type MediaLightboxProps = {
  src: string
  alt?: string
  /** When true, open as PDF (iframe / new tab) instead of image. */
  pdf?: boolean
  className?: string
  children?: React.ReactNode
}

/**
 * Click-to-enlarge for admin review media (photos, selfie, govt ID, PDF).
 * Thumbnails stay small in the grid; the dialog shows a full viewport preview.
 */
export function MediaLightbox({ src, alt = "Media preview", pdf, className, children }: MediaLightboxProps) {
  const [open, setOpen] = React.useState(false)

  if (!src) return null

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={cn(
          "group relative block w-full overflow-hidden rounded-xl border border-border text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40",
          className,
        )}
        aria-label={pdf ? `Open ${alt}` : `Enlarge ${alt}`}
      >
        {children}
        <span className="pointer-events-none absolute inset-0 flex items-end justify-end bg-gradient-to-t from-black/40 via-transparent to-transparent p-2 opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100">
          <span className="inline-flex items-center gap-1 rounded-full bg-black/70 px-2 py-1 text-[10px] font-semibold text-white">
            {pdf ? <ExternalLink className="h-3 w-3" /> : <Expand className="h-3 w-3" />}
            {pdf ? "Open" : "View"}
          </span>
        </span>
      </button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent
          showCloseButton={false}
          className="max-h-[92vh] w-[min(96vw,960px)] overflow-hidden border-none bg-black/95 p-0 shadow-2xl sm:max-w-[960px]"
        >
          <DialogTitle className="sr-only">{alt}</DialogTitle>
          <div className="flex items-center justify-between gap-2 border-b border-white/10 px-3 py-2">
            <p className="truncate text-sm font-medium text-white/90">{alt}</p>
            <div className="flex shrink-0 items-center gap-1">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-8 text-white hover:bg-white/10 hover:text-white"
                asChild
              >
                <a href={src} target="_blank" rel="noopener noreferrer">
                  <ExternalLink className="mr-1.5 h-3.5 w-3.5" />
                  Open in tab
                </a>
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-white hover:bg-white/10 hover:text-white"
                onClick={() => setOpen(false)}
                aria-label="Close"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>
          <div className="relative flex max-h-[calc(92vh-3rem)] min-h-[240px] items-center justify-center bg-black p-3">
            {pdf ? (
              <iframe title={alt} src={src} className="h-[min(80vh,720px)] w-full rounded-lg bg-white" />
            ) : (
              // eslint-disable-next-line @next/next/no-img-element -- signed S3 URLs vary; img avoids Next optimizer issues
              <img src={src} alt={alt} className="max-h-[min(80vh,720px)] max-w-full object-contain" />
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}

/** Compact PDF tile that opens the lightbox / new tab. */
export function PdfLightboxTile({
  src,
  name,
}: {
  src: string
  name: string
}) {
  const isPdf = isHoroscopePdfFileName(name, src)

  return (
    <MediaLightbox src={src} alt={name} pdf={isPdf} className="bg-muted/30">
      <div className="flex items-center gap-3 p-3">
        <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10 text-primary">
          <FileText className="h-6 w-6" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold">{name}</p>
          <p className="text-xs text-muted-foreground">
            {isPdf ? "Click to preview PDF" : "Click to preview image"}
          </p>
        </div>
      </div>
    </MediaLightbox>
  )
}
