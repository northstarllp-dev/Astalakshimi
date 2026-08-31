"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { ConnectButton } from "@/components/profile/connect-button"
import {
  useProfileQuery,
  useSendInterestMutation,
  useShortlistQuery,
  useSkipMatchMutation,
  useToggleShortlistMutation,
  useInvalidateInterests,
} from "@/hooks/queries"
import { apiClient } from "@/lib/api-client"
import { cn } from "@/lib/utils"
import { Star } from "lucide-react"

export function ProfileActionBar({ profileId }: { profileId: string }) {
  const router = useRouter()
  const { data: shortlist = [] } = useShortlistQuery()
  const invalidateInterests = useInvalidateInterests()
  const skipMutation = useSkipMatchMutation()
  const toggleMutation = useToggleShortlistMutation()
  const connectMutation = useSendInterestMutation()

  const [justSent, setJustSent] = React.useState(false)
  const [errorMsg, setErrorMsg] = React.useState<string | null>(null)
  const [isAccepting, setIsAccepting] = React.useState(false)

  const shortlisted = shortlist.some((item: any) =>
    typeof item === "string" ? item === profileId : item.id === profileId || item.profileId === profileId
  )

  const handleConnect = async () => {
    setErrorMsg(null)
    try {
      await connectMutation.mutateAsync(profileId)
      setJustSent(true)
    } catch (err: any) {
      setErrorMsg(err?.message || "Failed to send interest. Please try again.")
    }
  }

  const handleAccept = async () => {
    setIsAccepting(true)
    setErrorMsg(null)
    try {
      await apiClient.interests.accept(profileId)
      invalidateInterests()
    } catch (err: any) {
      setErrorMsg(err?.message || "Failed to accept interest.")
    } finally {
      setIsAccepting(false)
    }
  }

  return (
    <div className="fixed inset-x-0 bottom-0 z-50 border-t border-border bg-background/95 backdrop-blur-xl safe-bottom">
      {errorMsg && (
        <div className="mx-auto max-w-5xl px-4 pt-2">
          <div className="flex items-center justify-between rounded-lg bg-destructive/10 px-3 py-1.5 text-xs font-medium text-destructive">
            <span>{errorMsg}</span>
            {errorMsg.toLowerCase().includes("quota") || errorMsg.toLowerCase().includes("upgrade") ? (
              <Button
                size="sm"
                variant="outline"
                className="h-6 text-[11px]"
                onClick={() => router.push("/plans")}
              >
                Upgrade Plan
              </Button>
            ) : (
              <button
                type="button"
                onClick={() => setErrorMsg(null)}
                className="text-muted-foreground hover:text-foreground"
              >
                ✕
              </button>
            )}
          </div>
        </div>
      )}
      <div className="mx-auto flex max-w-5xl gap-3 px-4 py-3">
        <Button
          variant="outline"
          className="flex-1"
          onClick={() => {
            skipMutation.mutate(profileId)
            router.push("/dashboard")
          }}
        >
          Skip
        </Button>
        <Button
          variant="soft"
          className="flex-1"
          disabled={toggleMutation.isPending}
          onClick={() => toggleMutation.mutate(profileId)}
        >
          <Star
            className={cn(
              "mr-2 h-4 w-4 transition-colors",
              shortlisted ? "fill-amber-400 text-amber-400" : "text-muted-foreground"
            )}
          />{" "}
          {shortlisted ? "Saved" : "Shortlist"}
        </Button>

        <ConnectButton
          profileId={profileId}
          className="flex-[1.4]"
          justSent={justSent}
          isSending={connectMutation.isPending}
          isAccepting={isAccepting}
          onConnect={handleConnect}
          onAccept={handleAccept}
        />
      </div>
    </div>
  )
}
