"use client"

import Link from "next/link"
import { getNotifications } from "@/lib/user-activity"
import { Bell, ChevronRight, Heart, Search, ShieldCheck, Sparkles } from "lucide-react"

const icons = {
  view: Search,
  interest: Heart,
  verification: ShieldCheck,
  system: Sparkles,
}

export default function NotificationsPage() {
  const items = getNotifications()

  return (
    <main className="mx-auto max-w-3xl space-y-4 px-3 py-5 sm:px-4 md:py-8">
      <div className="flex items-center gap-3">
        <span className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary">
          <Bell className="h-5 w-5" />
        </span>
        <div>
          <h1 className="font-serif text-3xl font-bold">Notifications</h1>
          <p className="text-sm text-muted-foreground">Views, interests, and account updates</p>
        </div>
      </div>

      <ul className="space-y-2">
        {items.map((item) => {
          const Icon = icons[item.type]
          const content = (
            <li className="flex items-center gap-3 rounded-2xl border border-border bg-card px-3 py-3 shadow-sm">
              <span className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 text-primary">
                <Icon className="h-4 w-4" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{item.title}</p>
                <p className="text-xs text-muted-foreground">{item.time}</p>
              </div>
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            </li>
          )
          return item.href ? (
            <Link key={item.id} href={item.href}>
              {content}
            </Link>
          ) : (
            <div key={item.id}>{content}</div>
          )
        })}
      </ul>
    </main>
  )
}
