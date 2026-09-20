import { describe, it, expect } from "vitest"
import {
  formatChatMessageTime,
  shouldShowMessageTimestamp,
  type ChatMessage,
} from "./chat-utils"

describe("formatChatMessageTime", () => {
  it("returns empty for undefined/null", () => {
    expect(formatChatMessageTime(undefined)).toBe("")
    expect(formatChatMessageTime(null)).toBe("")
  })
  it("returns empty for invalid date", () => {
    expect(formatChatMessageTime("not-a-date")).toBe("")
  })
  it("accepts Date and ISO string", () => {
    const d = new Date("2026-01-15T10:30:00")
    expect(typeof formatChatMessageTime(d)).toBe("string")
    expect(typeof formatChatMessageTime(d.toISOString())).toBe("string")
    expect(formatChatMessageTime(d)).toMatch(/\d/)
  })
})

describe("shouldShowMessageTimestamp", () => {
  const t = (s: string) => new Date(s)
  it("shows timestamp on last message", () => {
    const msgs: ChatMessage[] = [{ id: "1", text: "hi", createdAt: t("2026-01-01T10:00:00") }]
    expect(shouldShowMessageTimestamp(msgs, 0)).toBe(true)
  })
  it("hides timestamp when same sender same minute", () => {
    const msgs: ChatMessage[] = [
      { id: "1", text: "a", isSelf: true, createdAt: t("2026-01-01T10:00:00") },
      { id: "2", text: "b", isSelf: true, createdAt: t("2026-01-01T10:00:30") },
    ]
    expect(shouldShowMessageTimestamp(msgs, 0)).toBe(false)
    expect(shouldShowMessageTimestamp(msgs, 1)).toBe(true)
  })
  it("shows timestamp when sender changes", () => {
    const msgs: ChatMessage[] = [
      { id: "1", text: "a", isSelf: true, createdAt: t("2026-01-01T10:00:00") },
      { id: "2", text: "b", isSelf: false, createdAt: t("2026-01-01T10:00:30") },
    ]
    expect(shouldShowMessageTimestamp(msgs, 0)).toBe(true)
  })
  it("shows timestamp when minute changes", () => {
    const msgs: ChatMessage[] = [
      { id: "1", text: "a", isSelf: true, createdAt: t("2026-01-01T10:00:00") },
      { id: "2", text: "b", isSelf: true, createdAt: t("2026-01-01T10:01:00") },
    ]
    expect(shouldShowMessageTimestamp(msgs, 0)).toBe(true)
  })
  it("hides timestamp when both messages lack createdAt (same sender, same empty key)", () => {
    const msgs: ChatMessage[] = [{ id: "1", text: "a" }, { id: "2", text: "b" }]
    expect(shouldShowMessageTimestamp(msgs, 0)).toBe(false)
    expect(shouldShowMessageTimestamp(msgs, 1)).toBe(true)
  })
})
