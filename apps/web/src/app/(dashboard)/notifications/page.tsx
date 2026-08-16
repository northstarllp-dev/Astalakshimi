"use client"

import * as React from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { isPaidMember } from "@/lib/plans"
import {
  clearAllNotifications,
  loadNotifications,
  markAllNotificationsRead,
  markNotificationRead,
  resolveNotificationHref,
  type NotificationCategory,
  type NotificationItem,
  type NotificationKind,
} from "@/lib/user-activity"
import { cn } from "@/lib/utils"
import {
  Bell,
  CheckCheck,
  ChevronRight,
  Clock3,
  Crown,
  Heart,
  Lock,
  MessageCircle,
  Search,
  ShieldCheck,
  Sparkles,
  Trash2,
  UserRound,
} from "lucide-react"

type FilterTab = "all" | NotificationCategory

const FILTERS: { id: FilterTab; label: string }[] = [
  { id: "all", label: "All" },
  { id: "interests", label: "Interests" },
  { id: "messages", label: "Messages" },
  { id: "profile", label: "Profile" },
  { id: "account", label: "Account" },
]

const kindIcon: Record<NotificationKind, React.ComponentType<{ className?: string }>> = {
  interest_received: Heart,
  interest_accepted: MessageCircle,
  new_match: Sparkles,
  profile_viewed: Search,
  shortlisted: Heart,
  profile_incomplete: UserRound,
  subscription_expiry: Crown,
  verification_reminder: ShieldCheck,
}

export default function NotificationsPage() {
  const router = useRouter()
  const [items, setItems] = React.useState<NotificationItem[]>([])
  const [filter, setFilter] = React.useState<FilterTab>("all")
  const [paid, setPaid] = React.useState(false)
  const [confirmClear, setConfirmClear] = React.useState(false)

  React.useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setItems(loadNotifications())
    setPaid(isPaidMember())
  }, [])

  const visible = React.useMemo(() => {
    const list = filter === "all" ? items : items.filter((n) => n.category === filter)
    return [...list].sort((a, b) => b.createdAt - a.createdAt)
  }, [items, filter])

  const unreadCount = items.filter((n) => n.unread).length

  const openItem = (item: NotificationItem) => {
    const href = resolveNotificationHref(item, paid)
    setItems(markNotificationRead(item.id))
    router.push(href)
  }

  return (
    <main className="mx-auto max-w-3xl space-y-4 px-3 py-5 sm:px-4 md:py-8">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary">
            <Bell className="h-5 w-5" />
          </span>
          <div>
            <h1 className="font-serif text-3xl font-bold">Notifications</h1>
            <p className="text-sm text-muted-foreground" role="status" aria-atomic="true">
              {unreadCount > 0 ? `${unreadCount} unread` : "You're all caught up"}
            </p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={unreadCount === 0}
            onClick={() => setItems(markAllNotificationsRead())}
          >
            <CheckCheck className="mr-1.5 h-3.5 w-3.5" /> Mark all read
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            disabled={items.length === 0}
            onClick={() => setConfirmClear(true)}
          >
            <Trash2 className="mr-1.5 h-3.5 w-3.5" /> Clear all
          </Button>
        </div>
      </div>

      <div className="flex gap-2 overflow-x-auto hide-scrollbar pb-1">
        {FILTERS.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setFilter(tab.id)}
            className={cn(
              "inline-flex shrink-0 whitespace-nowrap rounded-full px-3.5 py-2 text-sm font-semibold",
              filter === tab.id
                ? "bg-primary text-primary-foreground"
                : "border border-border bg-card text-muted-foreground hover:text-foreground"
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <ul className="space-y-2">
        {visible.map((item) => {
          const Icon = kindIcon[item.kind]
          const locked = Boolean(item.paidOnly) && !paid
          const displayTitle = locked
            ? item.kind === "profile_viewed"
              ? "Someone viewed your profile."
              : item.kind === "shortlisted"
                ? "Someone shortlisted your profile."
                : item.title
            : item.title

          return (
            <li key={item.id}>
              <button
                type="button"
                onClick={() => openItem(item)}
                className={cn(
                  "flex w-full items-start gap-3 rounded-2xl border bg-card px-3 py-3 text-left shadow-sm transition-colors hover:border-primary/30",
                  item.unread ? "border-primary/25 bg-primary/[0.03]" : "border-border"
                )}
              >
                <span className="relative mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                  <Icon className="h-4 w-4" aria-hidden="true" />
                  {item.unread && (
                    <span className="absolute -right-0.5 -top-0.5 h-2.5 w-2.5 rounded-full bg-sky-500 ring-2 ring-card" />
                  )}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-foreground">{displayTitle}</p>
                  {!locked && item.body && (
                    <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">{item.body}</p>
                  )}
                  {locked && (
                    <p className="mt-1 inline-flex items-center gap-1 text-xs font-semibold text-primary">
                      <Lock className="h-3 w-3" aria-hidden="true" /> Upgrade to see who · opens plans
                    </p>
                  )}
                  <p className="mt-1 flex items-center gap-1 text-[11px] text-muted-foreground">
                    <Clock3 className="h-3 w-3" aria-hidden="true" /> {item.time}
                  </p>
                </div>
                <ChevronRight className="mt-2 h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
              </button>
            </li>
          )
        })}
      </ul>

      {visible.length === 0 && (
        <div className="rounded-2xl border border-dashed border-border bg-card px-6 py-16 text-center">
          <Bell className="mx-auto h-8 w-8 text-muted-foreground" />
          <p className="mt-3 font-semibold">No notifications here</p>
          <p className="mt-1 text-sm text-muted-foreground">
            {filter === "all" ? "You're all clear." : `Nothing in ${filter} yet.`}
          </p>
          {filter === "all" && (
            <Link href="/dashboard" className="mt-4 inline-block">
              <Button size="sm">Go to Discover</Button>
            </Link>
          )}
        </div>
      )}

      {confirmClear && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 p-4"
          onClick={() => setConfirmClear(false)}
          role="dialog"
          aria-modal="true"
          aria-labelledby="clear-notifications-title"
        >
          <div
            className="w-full max-w-sm rounded-2xl border border-border bg-card p-5 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 id="clear-notifications-title" className="font-serif text-xl font-bold">
              Clear all notifications?
            </h2>
            <p className="mt-2 text-sm text-muted-foreground">
              This removes every alert from your list. You can’t undo this on this device.
            </p>
            <div className="mt-5 flex gap-2">
              <Button variant="outline" className="flex-1" onClick={() => setConfirmClear(false)}>
                Cancel
              </Button>
              <Button
                className="flex-1"
                onClick={() => {
                  setItems(clearAllNotifications())
                  setConfirmClear(false)
                }}
              >
                Clear all
              </Button>
            </div>
          </div>
        </div>
      )}
    </main>
  )
}
