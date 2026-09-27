"use client"

import * as React from "react"
import { cn } from "@/lib/utils"

/**
 * Prevents the browser's image context menu (Save image as, Copy image,
 * Open in new tab) and drag-to-save on member photos. Also disables the
 * iOS long-press callout and text/image selection.
 *
 * A transparent overlay sits above the photo so a right-click never
 * reaches the underlying <img>, and the container cancels the contextmenu
 * event as a backstop. This blocks casual saving only. It cannot stop
 * operating-system screenshots or DevTools access.
 */
export function PhotoGuard({
  children,
  className,
  overlayClassName,
}: {
  children: React.ReactNode
  className?: string
  /** Override the overlay z-index / pointer behavior when needed. */
  overlayClassName?: string
}) {
  return (
    <div
      className={cn("relative select-none", className)}
      onContextMenu={(e) => e.preventDefault()}
      onDragStart={(e) => e.preventDefault()}
      draggable={false}
      style={{ WebkitTouchCallout: "none" as unknown as React.CSSProperties["WebkitTouchCallout"] }}
    >
      {children}
      {/* Transparent guard layer. pointer-events-none so it never blocks
          clicks to interactive overlays (lightbox open, prev/next, badges);
          the contextmenu event still bubbles to this container, where it
          is cancelled. */}
      <div
        aria-hidden
        draggable={false}
        className={cn("pointer-events-none absolute inset-0 z-[1]", overlayClassName)}
      />
    </div>
  )
}
