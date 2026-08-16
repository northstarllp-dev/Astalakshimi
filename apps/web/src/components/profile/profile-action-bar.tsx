"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { addSkipped, sendInterest, toggleShortlist, loadShortlist } from "@/lib/user-activity"
import { Heart, MessageCircle } from "lucide-react"

export function ProfileActionBar({ profileId }: { profileId: string }) {
  const router = useRouter()
  const [shortlisted, setShortlisted] = React.useState(false)
  const [connected, setConnected] = React.useState(false)

  React.useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setShortlisted(loadShortlist().includes(profileId))
  }, [profileId])

  return (
    <div className="fixed inset-x-0 bottom-0 z-50 border-t border-border bg-background/95 backdrop-blur-xl safe-bottom">
      <div className="mx-auto flex max-w-5xl gap-3 px-4 py-3">
        <Button
          variant="outline"
          className="flex-1"
          onClick={() => {
            addSkipped(profileId)
            router.push("/dashboard")
          }}
        >
          Skip
        </Button>
        <Button
          variant="soft"
          className="flex-1"
          onClick={() => setShortlisted(toggleShortlist(profileId).includes(profileId))}
        >
          <MessageCircle className="mr-2 h-4 w-4" /> {shortlisted ? "Saved" : "Shortlist"}
        </Button>
        <Button
          className="flex-[1.4]"
          disabled={connected}
          onClick={() => {
            sendInterest(profileId)
            setConnected(true)
          }}
        >
          <Heart className="mr-2 h-4 w-4 fill-current" /> {connected ? "Sent" : "Connect"}
        </Button>
      </div>
    </div>
  )
}
