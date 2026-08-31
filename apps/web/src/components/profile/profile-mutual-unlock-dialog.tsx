"use client"

import * as React from "react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { HeartHandshake, Lock } from "lucide-react"

export type MutualUnlockReason = "contact" | "horoscope"

const COPY: Record<
  MutualUnlockReason,
  { title: string; description: string }
> = {
  contact: {
    title: "Contact locked",
    description:
      "Mutual connect required to unlock contact details. Send interest and get accepted — or accept theirs — to view their mobile number.",
  },
  horoscope: {
    title: "Horoscope locked",
              description:
                "Horoscope view and download unlock after a mutual connect on Silver and above.",
  },
}

export function ProfileMutualUnlockDialog({
  open,
  onOpenChange,
  reason,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  reason: MutualUnlockReason
}) {
  const copy = COPY[reason]

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[420px]">
        <DialogHeader>
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
            <Lock className="h-5 w-5" />
          </div>
          <DialogTitle className="text-center font-serif text-xl">{copy.title}</DialogTitle>
          <DialogDescription className="text-center text-sm leading-relaxed">
            {copy.description}
          </DialogDescription>
        </DialogHeader>
        <div className="rounded-xl border border-primary/15 bg-primary/5 px-4 py-3 text-center text-xs text-muted-foreground">
          <HeartHandshake className="mx-auto mb-1.5 h-4 w-4 text-primary" />
          Use <span className="font-semibold text-foreground">Connect</span> below, then accept when both sides
          agree.
        </div>
        <DialogFooter className="sm:justify-center">
          <Button type="button" className="w-full sm:w-auto" onClick={() => onOpenChange(false)}>
            Got it
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export function useMutualUnlockDialog() {
  const [open, setOpen] = React.useState(false)
  const [reason, setReason] = React.useState<MutualUnlockReason>("contact")

  const prompt = React.useCallback((nextReason: MutualUnlockReason) => {
    setReason(nextReason)
    setOpen(true)
  }, [])

  return { open, setOpen, reason, prompt }
}
