import { cn } from "@/lib/utils"

export function TempleDivider({ className }: { className?: string }) {
  return (
    <div className={cn("flex items-center gap-3", className)} aria-hidden>
      <span className="gold-rule flex-1" />
      <svg width="28" height="18" viewBox="0 0 28 18" fill="none">
        <path d="M14 1 17 7h6l-5 4 2 6-6-4-6 4 2-6-5-4h6L14 1Z" fill="#c9a227" />
      </svg>
      <span className="gold-rule flex-1" />
    </div>
  )
}

export function KolamCorner({ className }: { className?: string }) {
  return (
    <svg
      className={cn("text-gold/50", className)}
      width="48"
      height="48"
      viewBox="0 0 48 48"
      fill="none"
      aria-hidden
    >
      <path
        d="M8 8c10 0 16 6 16 16M8 16c6 0 10 4 10 10M8 24c3 0 5 2 5 5"
        stroke="currentColor"
        strokeWidth="1.2"
      />
      <circle cx="8" cy="8" r="1.6" fill="currentColor" />
      <circle cx="24" cy="24" r="1.6" fill="currentColor" />
    </svg>
  )
}
