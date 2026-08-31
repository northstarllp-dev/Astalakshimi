"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { useInterestsQuery, useSendInterestMutation } from "@/hooks/queries"
import { getConnectStatus } from "@/lib/connect-status"
import { cn } from "@/lib/utils"
import { Check, Heart, HeartHandshake, Loader2 } from "lucide-react"

type ConnectButtonProps = {
  profileId: string
  className?: string
  size?: "default" | "sm"
  justSent?: boolean
  isAccepting?: boolean
  isSending?: boolean
  onConnect?: () => void
  onAccept?: () => void
}

export function ConnectButton({
  profileId,
  className,
  size = "default",
  justSent = false,
  isAccepting = false,
  isSending = false,
  onConnect,
  onAccept,
}: ConnectButtonProps) {
  const router = useRouter()
  const { data: interests } = useInterestsQuery()
  const connectMutation = useSendInterestMutation()

  const status = getConnectStatus(profileId, interests, { justSent })
  const sending = isSending || connectMutation.isPending

  const handleConnect = () => {
    if (onConnect) {
      onConnect()
      return
    }
    connectMutation.mutate(profileId)
  }

  if (status === "mutual") {
    return (
      <Button
        size={size}
        className={cn("bg-[#067647] text-white hover:bg-[#05603a]", className)}
        onClick={() => router.push(`/inbox?thread=${profileId}`)}
      >
        <HeartHandshake className="mr-1.5 h-3.5 w-3.5 fill-current sm:mr-2 sm:h-4 sm:w-4" />
        Connected
      </Button>
    )
  }

  if (status === "accept") {
    return (
      <Button
        size={size}
        className={cn("bg-primary text-white", className)}
        disabled={isAccepting}
        onClick={onAccept}
      >
        {isAccepting ? (
          <>
            <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin sm:mr-2 sm:h-4 sm:w-4" />
            Accepting...
          </>
        ) : (
          <>
            <Check className="mr-1.5 h-3.5 w-3.5 sm:mr-2 sm:h-4 sm:w-4" />
            Accept Interest
          </>
        )}
      </Button>
    )
  }

  if (status === "sent") {
    return (
      <Button
        size={size}
        className={cn("cursor-default bg-[#b8901f] text-white hover:bg-[#b8901f]", className)}
        disabled
      >
        <Heart className="mr-1.5 h-3.5 w-3.5 fill-current sm:mr-2 sm:h-4 sm:w-4" />
        Request sent
      </Button>
    )
  }

  return (
    <Button size={size} className={className} disabled={sending} onClick={handleConnect}>
      {sending ? (
        <>
          <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin sm:mr-2 sm:h-4 sm:w-4" />
          Sending...
        </>
      ) : (
        <>
          <Heart className="mr-1.5 h-3.5 w-3.5 fill-current sm:mr-2 sm:h-4 sm:w-4" />
          Connect
        </>
      )}
    </Button>
  )
}
