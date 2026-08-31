"use client"

import { CheckCheck } from "lucide-react"
import { cn } from "@/lib/utils"
import { formatChatMessageTime, type ChatMessage } from "@/lib/chat-utils"

export function ChatMessageBubble({
  message,
  showTimestamp,
}: {
  message: ChatMessage
  showTimestamp: boolean
}) {
  const isSelf = Boolean(message.isSelf)
  const timeLabel = formatChatMessageTime(message.createdAt)

  return (
    <div className={cn("flex flex-col", isSelf ? "items-end" : "items-start")}>
      <div
        className={cn(
          "max-w-[80%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed shadow-sm sm:max-w-[70%]",
          isSelf
            ? "rounded-br-none bg-primary text-primary-foreground"
            : "rounded-bl-none border border-border/60 bg-muted text-foreground"
        )}
      >
        {message.text}
      </div>
      {showTimestamp && timeLabel ? (
        <div className="mt-1 flex items-center gap-1 px-1 text-[10px] text-muted-foreground">
          <span>{timeLabel}</span>
          {isSelf ? (
            <CheckCheck
              className={cn("h-3 w-3", message.isRead ? "text-sky-500" : "text-muted-foreground")}
            />
          ) : null}
        </div>
      ) : null}
    </div>
  )
}
