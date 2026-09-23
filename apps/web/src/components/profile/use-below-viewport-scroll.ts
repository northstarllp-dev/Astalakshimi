"use client"

import * as React from "react"

/**
 * Form dropdowns in this app always open below their trigger (never flip over
 * the form) and cap their list to the space left under it. When the trigger
 * sits near the viewport bottom there may be no room for even a few rows, so
 * on open, nudge the page down until there is room for a minimal panel. The
 * popover follows the trigger via Radix auto-update and the capped list grows
 * as space opens up.
 */
export function useBelowViewportScroll(minPanelHeight = 170) {
  const contentRef = React.useRef<HTMLDivElement | null>(null)

  const handleOpenChange = React.useCallback(
    (open: boolean, afterToggle?: () => void) => {
      afterToggle?.()
      if (!open) return
      window.requestAnimationFrame(() => {
        window.requestAnimationFrame(() => {
          const rect = contentRef.current?.getBoundingClientRect()
          if (!rect) return
          const deficit = rect.top + minPanelHeight - window.innerHeight
          if (deficit > 0) {
            window.scrollBy({ top: deficit + 8, behavior: "smooth" })
          }
        })
      })
    },
    [minPanelHeight],
  )

  return { contentRef, handleOpenChange }
}
