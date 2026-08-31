import { cn } from "@/lib/utils"

export function StatCard({
  label,
  value,
  hint,
  tone = "default",
}: {
  label: string
  value: string | number
  hint?: string
  tone?: "default" | "warn" | "ok" | "bad"
}) {
  return (
    <div
      className={cn(
        "rounded-xl border border-border bg-card px-3.5 py-3",
        tone === "warn" && "border-amber-200/80 bg-amber-50/40",
        tone === "ok" && "border-emerald-200/80 bg-emerald-50/30",
        tone === "bad" && "border-destructive/20 bg-destructive/[0.03]"
      )}
    >
      <p className="text-[11px] font-medium text-muted-foreground">{label}</p>
      <p className="mt-1 font-serif text-2xl font-semibold tabular-nums tracking-tight text-foreground">
        {value}
      </p>
      {hint && <p className="mt-0.5 text-[11px] text-muted-foreground">{hint}</p>}
    </div>
  )
}
