"use client"

import * as React from "react"
import { Button } from "@/components/ui/button"
import { Download, Share } from "lucide-react"
import { cn } from "@/lib/utils"

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>
}

function isIos() {
  if (typeof navigator === "undefined") return false
  return /iphone|ipad|ipod/i.test(navigator.userAgent)
}

function isStandalone() {
  if (typeof window === "undefined") return false
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    // iOS Safari
    ("standalone" in navigator && Boolean((navigator as Navigator & { standalone?: boolean }).standalone))
  )
}

export function InstallAppButton({
  className,
  compact = false,
}: {
  className?: string
  compact?: boolean
}) {
  const [deferred, setDeferred] = React.useState<BeforeInstallPromptEvent | null>(null)
  const [installed, setInstalled] = React.useState(false)
  const [showIosHint, setShowIosHint] = React.useState(false)

  React.useEffect(() => {
    if (isStandalone()) {
      setInstalled(true)
      return
    }

    const onBeforeInstall = (event: Event) => {
      event.preventDefault()
      setDeferred(event as BeforeInstallPromptEvent)
    }
    const onInstalled = () => {
      setInstalled(true)
      setDeferred(null)
    }

    window.addEventListener("beforeinstallprompt", onBeforeInstall)
    window.addEventListener("appinstalled", onInstalled)
    return () => {
      window.removeEventListener("beforeinstallprompt", onBeforeInstall)
      window.removeEventListener("appinstalled", onInstalled)
    }
  }, [])

  if (installed) {
    return (
      <span className={cn("text-xs text-muted-foreground", className)}>
        Installed as app
      </span>
    )
  }

  const handleInstall = async () => {
    if (deferred) {
      await deferred.prompt()
      const choice = await deferred.userChoice
      if (choice.outcome === "accepted") {
        setInstalled(true)
      }
      setDeferred(null)
      return
    }
    if (isIos()) {
      setShowIosHint((v) => !v)
      return
    }
    setShowIosHint(true)
  }

  return (
    <div className={cn("relative", className)}>
      <Button
        type="button"
        variant={compact ? "ghost" : "outline"}
        size={compact ? "icon" : "sm"}
        onClick={() => void handleInstall()}
        aria-label="Install as web app"
        className={compact ? "tap-target" : undefined}
      >
        {isIos() ? <Share className="h-4 w-4" /> : <Download className="h-4 w-4" />}
        {!compact && <span className="ml-2">{isIos() ? "Add to Home" : "Install app"}</span>}
      </Button>
      {showIosHint && (
        <div className="absolute right-0 top-full z-50 mt-2 w-64 rounded-xl border border-border bg-card p-3 text-xs shadow-sm">
          {isIos() ? (
            <p>
              Tap <span className="font-semibold">Share</span> in Safari, then{" "}
              <span className="font-semibold">Add to Home Screen</span>.
            </p>
          ) : (
            <p>
              Use your browser menu → <span className="font-semibold">Install app</span> or{" "}
              <span className="font-semibold">Add to Home screen</span>.
            </p>
          )}
          <button
            type="button"
            className="mt-2 cursor-pointer font-semibold text-primary"
            onClick={() => setShowIosHint(false)}
          >
            Got it
          </button>
        </div>
      )}
    </div>
  )
}
