"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Lock, ShieldAlert } from "lucide-react"

export function ContactUnlockModal() {
  const router = useRouter()
  const [open, setOpen] = React.useState(false)
  const [targetId, setTargetId] = React.useState<string | null>(null)

  React.useEffect(() => {
    const handleTrigger = (e: any) => {
      setTargetId(e.detail?.targetProfileId || null)
      setOpen(true)
    }

    if (typeof window !== "undefined") {
      window.addEventListener("TRIGGER_CONTACT_PAYWALL", handleTrigger)
    }
    return () => {
      if (typeof window !== "undefined") {
        window.removeEventListener("TRIGGER_CONTACT_PAYWALL", handleTrigger)
      }
    }
  }, [])

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="sm:max-w-[425px] text-center p-6">
        <DialogHeader>
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-red-100/80 mb-4 border border-red-200">
            <ShieldAlert className="h-7 w-7 text-red-600" />
          </div>
          <DialogTitle className="text-xl font-serif font-bold text-center">Contact Sharing Blocked</DialogTitle>
          <DialogDescription className="text-center pt-2 text-sm text-foreground/80 leading-relaxed">
            For security and privacy, exchanging contact details through chat is disabled. 
            If you want to take this conversation off-platform, please unlock their verified contact details directly.
          </DialogDescription>
        </DialogHeader>

        <div className="bg-primary/5 p-4 rounded-xl mt-2 border border-primary/20">
          <div className="flex items-center gap-2 font-bold justify-center text-primary">
            <Lock className="h-4 w-4" />
            <span>₹49 One-time Unlock</span>
          </div>
          <p className="text-[11px] text-muted-foreground mt-1.5 font-medium">
            Instantly get their verified Phone Number and WhatsApp details.
          </p>
        </div>

        <DialogFooter className="flex-col sm:flex-col gap-2 mt-4 sm:space-x-0 w-full">
          <Button 
            className="w-full font-bold shadow-sm" 
            size="lg"
            onClick={() => {
              setOpen(false)
              // In the future this can open Razorpay natively or go to a dedicated checkout
              alert("Razorpay checkout for ₹49 goes here!")
            }}
          >
            Pay ₹49 to Unlock Details
          </Button>
          <Button 
            variant="ghost" 
            className="w-full text-muted-foreground hover:bg-secondary/20" 
            onClick={() => setOpen(false)}
          >
            Continue chatting here
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
