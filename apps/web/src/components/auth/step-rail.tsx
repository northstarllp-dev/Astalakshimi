import { cn } from "@/lib/utils"

const STEPS = ["Account", "Identity", "Community", "Photos", "OTP"] as const

export function StepRail({ step, total = 5 }: { step: number; total?: number }) {
  return (
    <nav aria-label="Registration steps" className="mb-6">
      <ol className="flex items-center justify-between gap-1">
        {STEPS.slice(0, total).map((label, index) => {
          const n = index + 1
          const done = n < step
          const current = n === step
          return (
            <li key={label} className="flex min-w-0 flex-1 flex-col items-center gap-1.5">
              <span
                className={cn(
                  "flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold transition-colors",
                  done && "bg-primary text-primary-foreground",
                  current && "bg-secondary text-secondary-foreground shadow-sm shadow-secondary/30",
                  !done && !current && "border border-border bg-card text-muted-foreground"
                )}
              >
                {n}
              </span>
              <span
                className={cn(
                  "hidden truncate text-[10px] font-semibold tracking-wide uppercase sm:block",
                  current ? "text-primary" : "text-muted-foreground"
                )}
              >
                {label}
              </span>
            </li>
          )
        })}
      </ol>
      <div className="mt-3 h-1 overflow-hidden rounded-full bg-muted">
        <div
          className="h-full rounded-full bg-gradient-to-r from-primary to-secondary transition-all duration-500"
          style={{ width: `${(step / total) * 100}%` }}
        />
      </div>
    </nav>
  )
}
