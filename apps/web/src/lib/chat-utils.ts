export type ChatMessage = {
  id: string
  text: string
  isSelf?: boolean
  isRead?: boolean
  createdAt?: string | Date
  time?: string
}

/** Format message time in the viewer's local timezone (not server UTC). */
export function formatChatMessageTime(createdAt?: string | Date | null): string {
  if (!createdAt) return ""
  const date = createdAt instanceof Date ? createdAt : new Date(createdAt)
  if (Number.isNaN(date.getTime())) return ""

  return date.toLocaleTimeString(undefined, {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  })
}

function messageMinuteKey(createdAt?: string | Date | null): string {
  if (!createdAt) return ""
  const date = createdAt instanceof Date ? createdAt : new Date(createdAt)
  if (Number.isNaN(date.getTime())) return ""
  return `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}-${date.getHours()}-${date.getMinutes()}`
}

/** Show timestamp only at the end of a same-sender, same-minute cluster. */
export function shouldShowMessageTimestamp(messages: ChatMessage[], index: number): boolean {
  const current = messages[index]
  const next = messages[index + 1]
  if (!next) return true

  const sameSender = Boolean(current.isSelf) === Boolean(next.isSelf)
  if (!sameSender) return true

  return messageMinuteKey(current.createdAt) !== messageMinuteKey(next.createdAt)
}
