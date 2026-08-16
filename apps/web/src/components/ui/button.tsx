import * as React from "react"
import { cn } from "@/lib/utils"

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "default" | "outline" | "ghost" | "secondary" | "soft"
  size?: "default" | "sm" | "lg" | "icon"
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "default", size = "default", ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={cn(
          "inline-flex items-center justify-center whitespace-nowrap rounded-full text-sm font-semibold ring-offset-background transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 active:scale-[0.97] tracking-wide",
          {
            "bg-primary text-primary-foreground shadow-md shadow-primary/25 hover:bg-primary/88 hover:shadow-lg hover:shadow-primary/30":
              variant === "default",
            "border-2 border-border bg-card text-foreground hover:border-primary/30 hover:bg-muted hover:text-primary":
              variant === "outline",
            "bg-gradient-to-r from-secondary to-yellow-500 text-white shadow-md shadow-secondary/30 hover:from-secondary/90 hover:to-yellow-400 hover:shadow-secondary/40":
              variant === "secondary",
            "hover:bg-muted text-foreground/80 hover:text-primary": variant === "ghost",
            "bg-primary/10 text-primary hover:bg-primary/15 border border-primary/20": variant === "soft",
            "h-11 px-6": size === "default",
            "h-9 px-4 text-xs": size === "sm",
            "h-12 px-8 text-base": size === "lg",
            "h-11 w-11": size === "icon",
          },
          className
        )}
        {...props}
      />
    )
  }
)
Button.displayName = "Button"

export { Button }
