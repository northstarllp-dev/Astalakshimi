"use client"

import * as React from "react"
import { cn } from "@/lib/utils"

type OtpBoxesProps = {
  id?: string
  length?: number
  value: string
  onChange: (next: string) => void
  autoFocus?: boolean
  disabled?: boolean
  error?: boolean
}

export function OtpBoxes({
  id = "otp",
  length = 6,
  value,
  onChange,
  autoFocus,
  disabled,
  error,
}: OtpBoxesProps) {
  const digits = value.replace(/\D/g, "").slice(0, length)
  const refs = React.useRef<Array<HTMLInputElement | null>>([])

  React.useEffect(() => {
    if (autoFocus) refs.current[0]?.focus()
  }, [autoFocus])

  const setDigit = (index: number, char: string) => {
    const next = digits.split("")
    while (next.length < length) next.push("")
    next[index] = char
    onChange(next.join("").replace(/\D/g, "").slice(0, length))
  }

  const handlePaste = (event: React.ClipboardEvent<HTMLInputElement>) => {
    event.preventDefault()
    const pasted = event.clipboardData.getData("text").replace(/\D/g, "").slice(0, length)
    if (!pasted) return
    onChange(pasted)
    refs.current[Math.min(pasted.length, length) - 1]?.focus()
  }

  return (
    <div className="flex justify-center gap-2" role="group" aria-label="One-time password">
      {Array.from({ length }).map((_, index) => (
        <input
          key={index}
          id={index === 0 ? id : undefined}
          ref={(el) => {
            refs.current[index] = el
          }}
          type="text"
          inputMode="numeric"
          autoComplete={index === 0 ? "one-time-code" : "off"}
          maxLength={1}
          disabled={disabled}
          aria-label={`Digit ${index + 1}`}
          value={digits[index] ?? ""}
          onPaste={handlePaste}
          onChange={(event) => {
            const char = event.target.value.replace(/\D/g, "").slice(-1)
            setDigit(index, char)
            if (char) refs.current[index + 1]?.focus()
          }}
          onKeyDown={(event) => {
            if (event.key === "Backspace" && !digits[index] && index > 0) {
              event.preventDefault()
              setDigit(index - 1, "")
              refs.current[index - 1]?.focus()
            }
            if (event.key === "ArrowLeft" && index > 0) refs.current[index - 1]?.focus()
            if (event.key === "ArrowRight" && index < length - 1) refs.current[index + 1]?.focus()
          }}
          className={cn(
            "h-14 w-11 rounded-xl border-[1.5px] bg-card text-center font-serif text-2xl font-bold transition-all duration-150 sm:w-12",
            error
              ? "border-destructive focus-visible:shadow-[0_0_0_3px_rgba(180,35,24,0.12)]"
              : "border-input focus-visible:border-primary focus-visible:shadow-[0_0_0_3px_rgba(124,21,53,0.10)]",
            "focus-visible:outline-none disabled:opacity-50"
          )}
        />
      ))}
    </div>
  )
}
