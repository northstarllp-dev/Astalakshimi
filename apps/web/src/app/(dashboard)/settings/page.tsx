"use client"

import * as React from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { loadProfile } from "@/lib/profile-store"
import { loadSettings, saveSettings, type UserSettings } from "@/lib/user-activity"
import { ArrowLeft, LogOut } from "lucide-react"
import { cn } from "@/lib/utils"

export default function SettingsPage() {
  const router = useRouter()
  const [settings, setSettings] = React.useState<UserSettings | null>(null)
  const [phone, setPhone] = React.useState("")

  React.useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSettings(loadSettings())
    setPhone(loadProfile()?.phone || "")
  }, [])

  const update = (partial: Partial<UserSettings>) => {
    setSettings((prev) => {
      if (!prev) return prev
      const next = { ...prev, ...partial }
      saveSettings(next)
      return next
    })
  }

  if (!settings) {
    return <main className="px-4 py-10 text-center text-sm text-muted-foreground">Loading…</main>
  }

  return (
    <main className="mx-auto max-w-2xl space-y-5 px-3 py-5 sm:px-4 md:py-8">
      <div className="flex items-center gap-3">
        <Link
          href="/profile"
          className="tap-target inline-flex items-center justify-center rounded-full border border-border bg-card"
          aria-label="Back"
        >
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <div>
          <h1 className="font-serif text-2xl font-bold">Settings</h1>
          <p className="text-sm text-muted-foreground">Privacy, alerts, and account</p>
        </div>
      </div>

      <section className="rounded-2xl border border-border bg-card p-5 shadow-sm">
        <h2 className="font-serif text-lg font-bold">Account</h2>
        <p className="mt-3 text-sm text-muted-foreground">Phone</p>
        <p className="font-medium">{phone ? `+91 ${phone}` : "Not set"}</p>
        <Button
          variant="outline"
          className="mt-4"
          onClick={() => {
            sessionStorage.clear()
            router.push("/login")
          }}
        >
          <LogOut className="mr-2 h-4 w-4" /> Log out (demo)
        </Button>
      </section>

      <section className="space-y-4 rounded-2xl border border-border bg-card p-5 shadow-sm">
        <h2 className="font-serif text-lg font-bold">Privacy</h2>
        <Toggle
          label="Hide my profile from search"
          checked={settings.hideProfile}
          onChange={(v) => update({ hideProfile: v })}
        />
        <div className="space-y-2">
          <Label className="text-sm font-medium">Who can see my photos</Label>
          <div className="flex flex-wrap gap-2">
            {(
              [
                ["all", "Everyone"],
                ["accepted", "Accepted only"],
                ["premium", "Premium members"],
              ] as const
            ).map(([value, label]) => (
              <button
                key={value}
                type="button"
                onClick={() => update({ photoVisibility: value })}
                className={cn(
                  "h-9 rounded-full px-3.5 text-sm font-semibold",
                  settings.photoVisibility === value
                    ? "bg-primary text-primary-foreground"
                    : "border border-border bg-muted/40 text-muted-foreground"
                )}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      </section>

      <section className="space-y-4 rounded-2xl border border-border bg-card p-5 shadow-sm">
        <h2 className="font-serif text-lg font-bold">Notifications</h2>
        <Toggle label="Email alerts" checked={settings.notifyEmail} onChange={(v) => update({ notifyEmail: v })} />
        <Toggle label="SMS alerts" checked={settings.notifySms} onChange={(v) => update({ notifySms: v })} />
        <Toggle label="Push notifications" checked={settings.notifyPush} onChange={(v) => update({ notifyPush: v })} />
      </section>

      <Link href="/profile/edit#preferences" className="block">
        <Button variant="outline" className="w-full">
          Edit partner preferences
        </Button>
      </Link>
    </main>
  )
}

function Toggle({
  label,
  checked,
  onChange,
}: {
  label: string
  checked: boolean
  onChange: (v: boolean) => void
}) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className="flex w-full items-center justify-between gap-4 rounded-xl bg-muted/50 px-3 py-3 text-left"
    >
      <span className="text-sm font-medium">{label}</span>
      <span
        className={cn(
          "relative h-6 w-11 rounded-full transition-colors",
          checked ? "bg-primary" : "bg-border"
        )}
      >
        <span
          className={cn(
            "absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform",
            checked ? "left-5" : "left-0.5"
          )}
        />
      </span>
    </button>
  )
}
