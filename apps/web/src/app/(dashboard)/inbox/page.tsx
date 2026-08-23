"use client"

import * as React from "react"
import Image from "next/image"
import Link from "next/link"
import { useSearchParams, useRouter } from "next/navigation"
import { RequireFullPortal } from "@/components/layout/require-full-portal"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  useInterestsQuery,
  useInvalidateInterests,
  useProfileQuery,
  useChatMessagesQuery,
  useChatThreadsQuery,
  useSendMessageMutation,
} from "@/hooks/queries"

import { apiClient } from "@/lib/api-client"
import { cn, getMediaUrl } from "@/lib/utils"
import {
  Check,
  Clock3,
  Heart,
  HeartHandshake,
  Inbox,
  Loader2,
  MapPin,
  MessageCircle,
  MoreHorizontal,
  Send,
  Sparkles,
  User,
  X,
  ArrowLeft,
  Smile,
  ShieldCheck,
  ExternalLink,
} from "lucide-react"

type Tab = "conversations"

const CONFETTI_COLORS = ["#b8901f", "#e8c84a", "#7c1535", "#0d4f42", "#d4a843", "#067647", "#fff"]

function ConfettiBurst({ active }: { active: boolean }) {
  const pieces = React.useMemo(
    () =>
      Array.from({ length: 24 }, (_, i) => ({
        key: i,
        color: CONFETTI_COLORS[i % CONFETTI_COLORS.length]!,
        left: `${10 + Math.random() * 80}%`,
        top: `${Math.random() * 50}%`,
        delay: `${Math.random() * 0.4}s`,
        size: `${6 + Math.floor(Math.random() * 6)}px`,
      })),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [active]
  )

  if (!active) return null
  return (
    <div className="pointer-events-none absolute inset-0 z-20 overflow-hidden rounded-2xl" aria-hidden>
      {pieces.map((p) => (
        <span
          key={p.key}
          className="confetti-piece"
          style={{
            left: p.left,
            top: p.top,
            backgroundColor: p.color,
            width: p.size,
            height: p.size,
            animationDelay: p.delay,
          }}
        />
      ))}
    </div>
  )
}

export default function InboxPage() {
  return (
    <RequireFullPortal>
      <InboxPageInner />
    </RequireFullPortal>
  )
}

function InboxPageInner() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const initialTab: Tab = "conversations"
  const targetThreadId = searchParams.get("thread")

  const [activeTab, setActiveTab] = React.useState<Tab>(initialTab)
  const [selectedThreadId, setSelectedThreadId] = React.useState<string | null>(targetThreadId)
  const [justAcceptedId, setJustAcceptedId] = React.useState<string | null>(null)
  const [actionLoadingId, setActionLoadingId] = React.useState<string | null>(null)
  const [inputMessage, setInputMessage] = React.useState("")

  const { data: profile } = useProfileQuery()
  const { data, isLoading } = useInterestsQuery()
  const invalidate = useInvalidateInterests()

  const { data: threadMessages = [] } = useChatMessagesQuery(selectedThreadId)
  const { data: chatThreads = [] } = useChatThreadsQuery()
  const sendMessageMutation = useSendMessageMutation(selectedThreadId)


  const mutual = (data?.mutual ?? []) as any[]
  const received = (data?.received ?? []) as any[]

  const acceptedConnections = mutual.length > 0 ? mutual : received.filter((i) => i.status === "accepted")

  const unreadConversationsCount = (chatThreads || []).reduce(
    (acc: number, thread: any) => acc + (thread.unreadCount || 0),
    0
  )

  // Sync tab from query param if changed
  React.useEffect(() => {
    if (targetThreadId) {
      setSelectedThreadId(targetThreadId)
      setActiveTab("conversations")
    }
  }, [targetThreadId])

  const handleAccept = async (interestIdOrProfileId: string, profileName: string) => {
    setActionLoadingId(interestIdOrProfileId)
    try {
      // Step 1: Call PATCH /api/interactions/{id}/accept
      await apiClient.interests.accept(interestIdOrProfileId)
      setJustAcceptedId(interestIdOrProfileId)
      
      // Step 2: Invalidate cache so DB records sync
      invalidate()

      // Step 3: Automatically move profile from Pending to Accepted / Conversations tab
      setTimeout(() => {
        setJustAcceptedId(null)
        setActiveTab("conversations")
        setSelectedThreadId(interestIdOrProfileId)
      }, 1200)
    } catch (err: any) {
      alert(err?.message || "Failed to accept interest request.")
    } finally {
      setActionLoadingId(null)
    }
  }

  const handleDecline = async (interestIdOrProfileId: string) => {
    setActionLoadingId(interestIdOrProfileId)
    try {
      await apiClient.interests.decline(interestIdOrProfileId)
      invalidate()
    } catch (err: any) {
      alert(err?.message || "Failed to decline request.")
    } finally {
      setActionLoadingId(null)
    }
  }

  const handleSendMessage = (targetProfileId?: string) => {
    const trimmed = inputMessage.trim()
    if (!trimmed || sendMessageMutation.isPending) return

    const resolvedTarget =
      targetProfileId && targetProfileId !== profile?.id
        ? targetProfileId
        : undefined

    setInputMessage("")
    sendMessageMutation.mutate({
      text: trimmed,
      receiverProfileId: resolvedTarget,
    })
  }

  const selectedConnection = acceptedConnections.find(
    (c) => c.profileId === selectedThreadId || c.id === selectedThreadId || c.profile?.id === selectedThreadId
  )

  return (
    <main className="mx-auto max-w-5xl px-3 py-5 sm:px-4 md:py-8">
      {/* Header */}
      <div className="mb-6 flex flex-wrap items-end justify-between gap-3 border-b border-border/70 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="flex size-7 items-center justify-center rounded-full bg-primary/10 text-primary">
              <Inbox className="h-4 w-4" />
            </span>
            <p className="text-xs font-semibold tracking-wider text-primary uppercase">Relationship Hub</p>
          </div>
          <h1 className="mt-1 font-serif text-3xl font-bold tracking-tight">Inbox & Conversations</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Manage interest requests, accepted connections, and chat messages in one place.
          </p>
        </div>
      </div>



      {isLoading ? (
        <div className="flex items-center justify-center gap-2 py-20 text-muted-foreground text-sm">
          <Loader2 className="h-5 w-5 animate-spin" /> Loading your inbox...
        </div>
      ) : (
        <>

          {/* TAB 2: ACCEPTED / CONVERSATIONS */}
          {activeTab === "conversations" && (
            <div className="grid gap-6 md:grid-cols-[300px_1fr]">
              {/* Left Column: Connections List */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Connected Matches ({acceptedConnections.length})
                  </h2>
                </div>

                {acceptedConnections.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-border bg-card p-6 text-center">
                    <HeartHandshake className="mx-auto h-8 w-8 text-muted-foreground" />
                    <p className="mt-2 text-xs font-medium text-muted-foreground">
                      No accepted connections yet. Accept pending interests to unlock chat!
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {acceptedConnections.map((item) => {
                      const prof = item.profile || {}
                      const profId = item.profileId || item.id || prof.id
                      const isSelected = selectedThreadId === profId
                      const threadInfo = chatThreads.find((t: any) => t.profileId === profId || t.threadId === profId)
                      const lastMsg = threadInfo?.lastMessage || (isSelected && threadMessages.length > 0 ? threadMessages[threadMessages.length - 1]?.text : "Connected! Start the conversation.")


                      return (
                        <button
                          key={item.id || profId}
                          type="button"
                          onClick={() => setSelectedThreadId(profId)}
                          className={cn(
                            "flex w-full items-center gap-3 rounded-xl border p-3 text-left transition-all",
                            isSelected
                              ? "border-primary bg-primary/5 shadow-sm ring-1 ring-primary/30"
                              : "border-border bg-card hover:border-border hover:bg-muted/40"
                          )}
                        >
                          <div className="relative size-12 shrink-0 overflow-hidden rounded-full border border-border bg-muted">
                            {prof.photo ? (
                              <Image
                                src={getMediaUrl(prof.photo)}
                                alt={prof.fullName || "User"}
                                fill
                                className="object-cover object-[center_12%]"
                                sizes="48px"
                              />
                            ) : (
                              <div className="flex h-full w-full items-center justify-center font-serif text-sm font-bold text-primary">
                                {prof.fullName?.[0] || "?"}
                              </div>
                            )}
                          </div>

                          <div className="min-w-0 flex-1">
                            <div className="flex items-center justify-between">
                              <h3 className="truncate font-serif text-sm font-bold text-foreground">
                                {prof.fullName}, {prof.age}
                              </h3>
                              <span className="text-[10px] text-muted-foreground">Active</span>
                            </div>
                            <p className="truncate text-xs text-muted-foreground mt-0.5">{lastMsg}</p>
                          </div>
                        </button>
                      )
                    })}
                  </div>
                )}
              </div>

              {/* Right Column: Active Chat Thread Pane */}
              <div className="rounded-2xl border border-border bg-card shadow-sm overflow-hidden flex flex-col min-h-[460px]">
                {selectedConnection ? (
                  <>
                    {/* Thread Header */}
                    <div className="flex items-center justify-between border-b border-border/80 bg-muted/30 px-4 py-3">
                      <div className="flex items-center gap-3">
                        <Link href={`/profiles/${selectedConnection.profileId || selectedConnection.id}`} className="relative size-10 overflow-hidden rounded-full border border-border bg-muted">
                          {selectedConnection.profile?.photo ? (
                            <Image
                              src={getMediaUrl(selectedConnection.profile.photo)}
                              alt={selectedConnection.profile.fullName || ""}
                              fill
                              className="object-cover object-[center_12%]"
                              sizes="40px"
                            />
                          ) : (
                            <div className="flex h-full w-full items-center justify-center font-serif text-xs font-bold text-primary">
                              {selectedConnection.profile?.fullName?.[0] || "?"}
                            </div>
                          )}
                        </Link>
                        <div>
                          <div className="flex items-center gap-1.5">
                            <Link href={`/profiles/${selectedConnection.profileId || selectedConnection.id}`} className="font-serif text-base font-bold hover:underline">
                              {selectedConnection.profile?.fullName}, {selectedConnection.profile?.age}
                            </Link>
                            <Badge variant="outline" className="border-emerald-200 bg-emerald-50 text-[10px] font-semibold text-emerald-800">
                              <ShieldCheck className="mr-0.5 h-3 w-3 text-emerald-600" /> Connected
                            </Badge>
                          </div>
                          <p className="text-xs text-muted-foreground">
                            {[selectedConnection.profile?.city, selectedConnection.profile?.profession].filter(Boolean).join(" · ")}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">

                        <Link href={`/profiles/${selectedConnection.profileId || selectedConnection.id}`}>
                          <Button variant="outline" size="sm" className="h-8 text-xs">
                            View Profile
                          </Button>
                        </Link>
                      </div>
                    </div>

                    {/* Chat Messages Body */}
                    <div className="flex-1 space-y-3 p-4 overflow-y-auto max-h-[340px]">
                      <div className="my-2 rounded-xl bg-secondary/10 p-3 text-center text-xs text-secondary">
                        <Sparkles className="mx-auto mb-1 h-4 w-4" />
                        <p className="font-semibold">Chat unlocked!</p>
                        <p className="text-[11px] text-muted-foreground">
                          You and {selectedConnection.profile?.fullName} are connected. Start your conversation with a respectful greeting.
                        </p>
                      </div>

                      {/* Quick Icebreakers */}
                      {threadMessages.length === 0 && (
                        <div className="space-y-1.5 pt-2">
                          <p className="text-[11px] font-semibold text-muted-foreground uppercase">Suggested icebreakers:</p>
                          <div className="flex flex-wrap gap-1.5">
                            {[
                              "Namaste! Glad to connect with you.",
                              "Hello! We liked your profile and would love to know more.",
                              "Hi! When is a good time for our families to talk?",
                            ].map((icebreaker) => (
                              <button
                                key={icebreaker}
                                type="button"
                                onClick={() => setInputMessage(icebreaker)}
                                className="rounded-lg border border-border bg-background px-2.5 py-1 text-xs text-foreground transition-colors hover:border-primary hover:bg-primary/5"
                              >
                                {icebreaker}
                              </button>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Message Bubbles */}
                      {threadMessages.map((msg: any) => (
                        <div
                          key={msg.id}
                          className={cn("flex flex-col", msg.isSelf ? "items-end" : "items-start")}
                        >
                          <div
                            className={cn(
                              "max-w-[75%] rounded-2xl px-3.5 py-2 text-sm leading-relaxed",
                              msg.isSelf
                                ? "bg-primary text-primary-foreground rounded-br-none shadow-sm"
                                : "bg-muted text-foreground rounded-bl-none border border-border/60"
                            )}
                          >
                            {msg.text}
                          </div>
                          <span className="mt-0.5 text-[10px] text-muted-foreground px-1">{msg.time}</span>
                        </div>
                      ))}
                    </div>

                    {/* Chat Input Bar */}
                    <form
                      onSubmit={(e) => {
                        e.preventDefault()
                        handleSendMessage(selectedConnection.profile?.id || selectedConnection.profileId || selectedConnection.id)

                      }}
                      className="flex items-center gap-2 border-t border-border/80 bg-background p-3"
                    >
                      <input
                        type="text"
                        value={inputMessage}
                        onChange={(e) => setInputMessage(e.target.value)}
                        placeholder={`Message ${selectedConnection.profile?.fullName || "match"}...`}
                        className="flex-1 rounded-xl border border-input bg-card px-3.5 py-2 text-sm outline-none transition focus:border-primary focus:ring-1 focus:ring-primary"
                      />
                      <Button
                        type="submit"
                        size="sm"
                        disabled={!inputMessage.trim() || sendMessageMutation.isPending}
                        className="h-9 px-3.5 gap-1 shadow-sm"
                      >
                        {sendMessageMutation.isPending ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <>
                            <Send className="h-3.5 w-3.5" /> Send
                          </>
                        )}
                      </Button>
                    </form>
                  </>
                ) : (
                  <div className="flex flex-1 flex-col items-center justify-center p-8 text-center text-muted-foreground">
                    <MessageCircle className="h-10 w-10 text-muted-foreground/50 mb-2" />
                    <p className="font-serif text-lg font-bold text-foreground">Select a conversation</p>
                    <p className="mt-1 max-w-xs text-xs">
                      Choose a connected match from the list on the left to start or continue chatting.
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}


        </>
      )}
    </main>
  )
}
