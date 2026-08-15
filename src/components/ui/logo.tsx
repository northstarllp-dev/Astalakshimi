import * as React from "react"
import { cn } from "@/lib/utils"

interface LogoProps extends React.SVGProps<SVGSVGElement> {
  withText?: boolean
  className?: string
  light?: boolean
}

export function Logo({ withText = true, className, light = false, ...props }: LogoProps) {
  return (
    <div className={cn("flex items-center gap-2.5", className)}>
      <svg
        width="34"
        height="34"
        viewBox="0 0 64 64"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden
        {...props}
      >
        <circle cx="32" cy="32" r="31" fill={light ? "#fff8ee" : "#8b1e3f"} />
        <path
          d="M32 10c1.2 4 1.2 7-1 10 2.8.4 5.2 1.2 7 2.6-3.4 1-6.2.6-8.4-1.2C31 24.8 32.4 27 32 30c-1.8-2.6-3.2-5.4-2.2-8.6-2.4 1.6-4.8 2-8 1.2 1.8-1.6 4.2-2.4 7-2.8-2.2-3-2.2-6-1-10 1.4 2.2 3.2 3.4 4.2.2Z"
          fill="#c9a227"
        />
        <path d="M32 28c6 0 12 4 14 10H18c2-6 8-10 14-10Z" fill="#c9a227" />
        <rect x="22" y="38" width="20" height="5" rx="1.5" fill="#f3e3a0" />
        <rect x="18" y="43" width="28" height="6" rx="2" fill="#c9a227" />
        <path d="M16 51h32c-2 4-10 6-16 6s-14-2-16-6Z" fill="#f3e3a0" />
      </svg>
      {withText && (
        <span className="leading-tight">
          <span
            className={cn(
              "block font-serif text-lg font-bold tracking-tight sm:text-xl",
              light ? "text-white" : "text-primary"
            )}
          >
            Astalakshimi
          </span>
          <span
            className={cn(
              "hidden font-tamil text-[11px] tracking-[0.18em] sm:block",
              light ? "text-secondary" : "text-gold"
            )}
          >
            அஷ்டலக்ஷ்மி
          </span>
        </span>
      )}
    </div>
  )
}
