"use client"

import * as React from "react"
import Image from "next/image"
import Link from "next/link"
import { useParams, useRouter } from "next/navigation"
import { RequireFullPortal } from "@/components/layout/require-full-portal"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  useChatMessagesQuery,
  useSendMessageMutation,
  useProfileQuery,
  useInterestsQuery,
} from "@/hooks/queries"
import { getMediaUrl } from "@/lib/utils"
import { shouldShowMessageTimestamp } from "@/lib/chat-utils"
import { ChatMessageBubble } from "@/components/chat/chat-message-bubble"
import {
  ChevronLeft,
  Loader2,
  Send,
  ShieldCheck,
  Sparkles,
} from "lucide-react"

export default function ChatThreadPage() {
  const params = useParams()
  const threadId = (params?.threadId as string) || ""

  return (
    <RequireFullPortal>
      <ChatThreadInner threadId={threadId} />
    </RequireFullPortal>
  )
}

function ChatThreadInner({ threadId }: { threadId: string }) {
  const router = useRouter()
  const [inputText, setInputText] = React.useState("")
  const messagesEndRef = React.useRef<HTMLDivElement>(null)

  const { data: profile } = useProfileQuery()
  const { data: interestsData } = useInterestsQuery()
  const { data: messages = [], isLoading } = useChatMessagesQuery(threadId)
  const sendMutation = useSendMessageMutation(threadId)

  // Resolve match profile info from interests or threadId
  const mutualList = (interestsData?.mutual ?? []) as any[]
  const receivedList = (interestsData?.received ?? []) as any[]
  const sentList = (interestsData?.sent ?? []) as any[]
  const allConnections = [...mutualList, ...receivedList, ...sentList]

  const matchedConnection = allConnections.find(
    (c) => c.profileId === threadId || c.id === threadId || c.profile?.id === threadId
  )
  const resolvedTargetId =
    matchedConnection?.profile?.id ||
    (matchedConnection?.profileId && matchedConnection?.profileId !== profile?.id ? matchedConnection.profileId : undefined) ||
    (threadId && threadId !== profile?.id ? threadId : undefined)

  const matchProfile = matchedConnection?.profile || {
    id: resolvedTargetId || threadId,
    fullName: "Member " + threadId.slice(0, 6),
    age: 26,
    city: "Tamil Nadu",
    profession: "Professional",
    photo: null,
  }

  // Auto-scroll to bottom on new messages
  React.useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages.length])

  const handleSend = (e?: React.FormEvent) => {
    if (e) e.preventDefault()
    const trimmed = inputText.trim()
    if (!trimmed || sendMutation.isPending) return

    setInputText("")
    sendMutation.mutate({
      text: trimmed,
      receiverProfileId: resolvedTargetId,
    })
  }


  return (
    <main className="mx-auto max-w-4xl px-3 py-4 sm:px-4 md:py-6 flex flex-col h-[calc(100dvh-5rem)]">
      {/* Top Header */}
      <div className="flex items-center justify-between gap-3 border-b border-border bg-card/80 backdrop-blur-md rounded-2xl p-3 sm:p-4 shadow-sm mb-3">
        <div className="flex items-center gap-3">
          <Link href="/inbox" className="text-muted-foreground hover:text-foreground">
            <Button variant="ghost" size="icon" className="size-9 rounded-full">
              <ChevronLeft className="h-5 w-5" />
            </Button>
          </Link>

          <Link href={`/profiles/${matchProfile.id || threadId}`} className="relative size-12 overflow-hidden rounded-full border-2 border-border bg-muted shrink-0">
            {matchProfile.photo ? (
              <Image
                src={getMediaUrl(matchProfile.photo)}
                alt={matchProfile.fullName || "Member"}
                fill
                className="object-cover object-[center_12%]"
                sizes="48px"
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center font-serif text-base font-bold text-primary">
                {matchProfile.fullName?.[0] || "?"}
              </div>
            )}
          </Link>

          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <Link href={`/profiles/${matchProfile.id || threadId}`} className="font-serif text-base sm:text-lg font-bold hover:underline truncate">
                {matchProfile.fullName}, {matchProfile.age}
              </Link>
              <Badge variant="outline" className="border-emerald-200 bg-emerald-50 text-[10px] font-semibold text-emerald-800 hidden sm:inline-flex">
                <ShieldCheck className="mr-0.5 h-3 w-3 text-emerald-600" /> Connected
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground truncate">
              {[matchProfile.city, matchProfile.caste, matchProfile.profession].filter(Boolean).join(" · ")}
            </p>
          </div>
        </div>

        <Link href={`/profiles/${matchProfile.id || threadId}`}>
          <Button variant="outline" size="sm" className="h-8 text-xs">
            View Profile
          </Button>
        </Link>
      </div>

      {/* Message Stream Area */}
      <div className="flex-1 overflow-y-auto rounded-2xl border border-border bg-card p-4 space-y-3 shadow-inner">
        {/* Intro Card */}
        <div className="my-2 rounded-xl bg-secondary/10 p-3.5 text-center text-xs text-secondary max-w-lg mx-auto">
          <Sparkles className="mx-auto mb-1 h-4 w-4" />
          <p className="font-semibold">Direct Chat Unlocked</p>
          <p className="text-[11px] text-muted-foreground mt-0.5">
            You and {matchProfile.fullName} are connected. Your conversation is secure and private.
          </p>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-16 text-muted-foreground gap-2 text-xs">
            <Loader2 className="h-4 w-4 animate-spin" /> Loading message history...
          </div>
        ) : messages.length === 0 ? (
          <div className="py-12 text-center text-muted-foreground space-y-3">
            <p className="text-sm font-medium text-foreground">No messages yet</p>
            <p className="text-xs max-w-xs mx-auto">
              Say hello to start the conversation! Pick a suggested icebreaker below or type your own.
            </p>
            <div className="flex flex-wrap justify-center gap-2 pt-2">
              {[
                "Namaste! Glad to connect with you.",
                "Hello! We liked your profile and would love to know more.",
                "Hi! When is a good time for our families to talk?",
              ].map((icebreaker) => (
                <button
                  key={icebreaker}
                  type="button"
                  onClick={() => setInputText(icebreaker)}
                  className="rounded-lg border border-border bg-background px-3 py-1.5 text-xs text-foreground transition-colors hover:border-primary hover:bg-primary/5 shadow-sm"
                >
                  {icebreaker}
                </button>
              ))}
            </div>
          </div>
        ) : (
          messages.map((msg: any, index: number) => (
            <ChatMessageBubble
              key={msg.id}
              message={msg}
              showTimestamp={shouldShowMessageTimestamp(messages, index)}
            />
          ))
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Box */}
      <form
        onSubmit={handleSend}
        className="mt-3 flex items-center gap-2 rounded-2xl border border-border bg-card p-2 shadow-sm"
      >
        <input
          type="text"
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          placeholder={`Type a message to ${matchProfile.fullName}...`}
          className="flex-1 rounded-xl bg-transparent px-3 py-2 text-sm outline-none placeholder:text-muted-foreground"
        />
        <Button
          type="submit"
          size="sm"
          disabled={!inputText.trim() || sendMutation.isPending}
          className="h-9 px-4 gap-1.5 shadow-sm"
        >
          {sendMutation.isPending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <>
              <Send className="h-3.5 w-3.5" /> Send
            </>
          )}
        </Button>
      </form>
    </main>
  )
}
