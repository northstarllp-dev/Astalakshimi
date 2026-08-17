"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { canAccessFullPortal } from "@/lib/portal-access"
import {
  useProfileQuery,
  useSendInterestMutation,
  useShortlistQuery,
  useSkipMatchMutation,
  useToggleShortlistMutation,
} from "@/hooks/queries"
import { Heart, MessageCircle } from "lucide-react"

export function ProfileActionBar({ profileId }: { profileId: string }) {
  const router = useRouter()
  const { data: profile = null } = useProfileQuery()
  const { data: shortlist = [] } = useShortlistQuery()
  const skipMutation = useSkipMatchMutation()
  const toggleMutation = useToggleShortlistMutation()
  const connectMutation = useSendInterestMutation()
  const [connected, setConnected] = React.useState(false)
  const shortlisted = shortlist.includes(profileId)

  return (
    <div className="fixed inset-x-0 bottom-0 z-50 border-t border-border bg-background/95 backdrop-blur-xl safe-bottom">
      <div className="mx-auto flex max-w-5xl gap-3 px-4 py-3">
        <Button
          variant="outline"
          className="flex-1"
          onClick={() => {
            skipMutation.mutate(profileId)
            router.push(canAccessFullPortal(profile) ? "/dashboard" : "/home")
          }}
        >
          Skip
        </Button>
        <Button
          variant="soft"
          className="flex-1"
          onClick={() => toggleMutation.mutate(profileId)}
        >
          <MessageCircle className="mr-2 h-4 w-4" /> {shortlisted ? "Saved" : "Shortlist"}
        </Button>
        <Button
          className="flex-[1.4]"
          disabled={connected}
          onClick={() => {
            connectMutation.mutate(profileId)
            setConnected(true)
          }}
        >
          <Heart className="mr-2 h-4 w-4 fill-current" /> {connected ? "Sent" : "Connect"}
        </Button>
      </div>
    </div>
  )
}
