import { Logo } from "@/components/ui/logo"

const MIN_HANDOFF_MS = 900
const MAX_HANDOFF_MS = 4500
const HOME_HANDOFF_PENDING_KEY = "astalakshimi.home_handoff_pending"

export function markHomeHandoffPending() {
  sessionStorage.setItem(HOME_HANDOFF_PENDING_KEY, "1")
}

export function clearHomeHandoffPending() {
  sessionStorage.removeItem(HOME_HANDOFF_PENDING_KEY)
}

export function isHomeHandoffPending() {
  return sessionStorage.getItem(HOME_HANDOFF_PENDING_KEY) === "1"
}

/**
 * Hold at least a short beat so the arrival is visible, and longer if Home's
 * data is still in flight. Never wait past the cap — Home keeps this screen
 * until its own queries settle.
 */
export function waitForHomeHandoff(prefetch: Promise<unknown>) {
  const started = Date.now()
  return Promise.race([
    prefetch.catch(() => undefined),
    new Promise<void>((resolve) => {
      window.setTimeout(resolve, MAX_HANDOFF_MS)
    }),
  ]).then(async () => {
    const remaining = MIN_HANDOFF_MS - (Date.now() - started)
    if (remaining > 0) {
      await new Promise<void>((resolve) => {
        window.setTimeout(resolve, remaining)
      })
    }
  })
}

export function HomeEntrance({
  title = "Opening your home",
  detail = "Gathering your matches",
}: {
  title?: string
  detail?: string
}) {
  return (
    <div
      className="fixed inset-0 z-[80] flex flex-col items-center justify-center bg-background px-6 text-center"
      role="status"
      aria-live="polite"
      aria-busy="true"
    >
      <Logo href={null} size={56} />
      <h1 className="mt-8 font-serif text-2xl font-semibold text-foreground">{title}</h1>
      <p className="mt-2 max-w-xs text-sm text-muted-foreground">{detail}</p>
      <div className="mt-8 h-0.5 w-40 overflow-hidden rounded-full bg-muted" aria-hidden="true">
        <div className="h-full w-1/2 bg-secondary animate-[home-entrance_1.15s_ease-in-out_infinite]" />
      </div>
    </div>
  )
}
