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
          "inline-flex items-center justify-center whitespace-nowrap rounded-full text-sm font-semibold ring-offset-background transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 active:scale-[0.98]",
          {
            "bg-primary text-primary-foreground shadow-sm shadow-primary/20 hover:bg-primary/90":
              variant === "default",
            "border border-border bg-card text-foreground hover:bg-muted":
              variant === "outline",
            "bg-secondary text-secondary-foreground hover:bg-secondary/90":
              variant === "secondary",
            "hover:bg-muted text-foreground": variant === "ghost",
            "bg-primary/10 text-primary hover:bg-primary/15": variant === "soft",
            "h-11 px-5": size === "default",
            "h-9 px-3 text-xs": size === "sm",
            "h-12 px-7 text-base": size === "lg",
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
