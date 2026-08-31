"use client"

import * as React from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { usePaidQuery, useProfileQuery, useSaveSettingsMutation, useSettingsQuery } from "@/hooks/queries"
import { ArrowLeft, Lock, LogOut, MapPin, UserX, X } from "lucide-react"
import { cn } from "@/lib/utils"

type UserSettings = any;

export default function SettingsPage() {
  const router = useRouter()
  const { data: settings } = useSettingsQuery()
  const { data: profile } = useProfileQuery()
  const { data: paid = false } = usePaidQuery()
  const saveMutation = useSaveSettingsMutation()
  const phone = profile?.phone || ""
  const [hideUserInput, setHideUserInput] = React.useState("")
  const [hideCityInput, setHideCityInput] = React.useState("")

  const update = (partial: Partial<UserSettings>) => {
    if (!settings) return
    saveMutation.mutate({ ...settings, ...partial })
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
          <p className="text-sm text-muted-foreground">Privacy, visibility, and account</p>
        </div>
      </div>

      {/* Profile visibility */}
      <section className="space-y-4 rounded-2xl border border-border bg-card p-5 shadow-sm">
        <h2 className="font-serif text-lg font-bold">Profile visibility</h2>
        <div className="space-y-2">
          <Label className="text-sm font-medium">Who can see your profile</Label>
          <div className="flex flex-wrap gap-2">
            {(
              [
                ["all", "Visible to all"],
                ["premium", "Premium members only"],
                ["hidden", "Hidden (pause)"],
              ] as const
            ).map(([value, label]) => (
              <button
                key={value}
                type="button"
                onClick={() => update({ profileVisibility: value })}
                className={cn(
                  "h-9 rounded-full px-3.5 text-sm font-semibold",
                  settings.profileVisibility === value
                    ? "bg-primary text-primary-foreground"
                    : "border border-border bg-muted/40 text-muted-foreground"
                )}
              >
                {label}
              </button>
            ))}
          </div>
          {settings.profileVisibility === "hidden" && (
            <p className="text-xs text-amber-600">Your profile is paused  it won't appear in any search results.</p>
          )}
        </div>
      </section>

      {/* Photo blur control */}
      <section className="space-y-4 rounded-2xl border border-border bg-card p-5 shadow-sm">
        <h2 className="font-serif text-lg font-bold">Photo blur control</h2>
        <p className="text-sm text-muted-foreground">Applies globally to all your photos.</p>
        <div className="space-y-2">
          <Label className="text-sm font-medium">Photo visibility</Label>
          <Select value={settings.photoBlur} onValueChange={(v) => update({ photoBlur: v as UserSettings["photoBlur"] })}>
            <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="always">Always blurred</SelectItem>
              <SelectItem value="accepted">Unblur after mutual interest</SelectItem>
              <SelectItem value="never">Always visible</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </section>

      {/* Hide from specific user (paid) */}
      <section className="space-y-4 rounded-2xl border border-border bg-card p-5 shadow-sm">
        <div className="flex items-center gap-2">
          <UserX className="h-4 w-4 text-primary" />
          <h2 className="font-serif text-lg font-bold">Hide from specific user</h2>
          {!paid && <Lock className="h-3.5 w-3.5 text-muted-foreground" />}
        </div>
        {!paid && (
          <p className="text-xs text-muted-foreground">Premium feature  enter a profile ID to hide your profile from that person.</p>
        )}
        {paid ? (
          <div className="space-y-3">
            <div className="flex gap-2">
              <Input
                value={hideUserInput}
                onChange={(e) => setHideUserInput(e.target.value)}
                placeholder="e.g. ps-26-chennai"
                className="flex-1"
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={!hideUserInput.trim()}
                onClick={() => {
                  if (!hideUserInput.trim() || settings.hideFromUsers.includes(hideUserInput.trim())) return
                  update({ hideFromUsers: [...settings.hideFromUsers, hideUserInput.trim()] })
                  setHideUserInput("")
                }}
              >
                Add
              </Button>
            </div>
            {settings.hideFromUsers.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {settings.hideFromUsers.map((id: any) => (
                  <span key={id} className="inline-flex items-center gap-1 rounded-full bg-muted px-2.5 py-1 text-xs font-medium">
                    {id}
                    <button
                      type="button"
                      onClick={() => update({ hideFromUsers: settings.hideFromUsers.filter((u: any) => u !== id) })}
                      className="text-muted-foreground hover:text-destructive"
                      aria-label={`Remove ${id}`}
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>
        ) : (
          <Link href="/plans">
            <Button variant="soft" size="sm">Upgrade to unlock</Button>
          </Link>
        )}
      </section>

      {/* Hide from city (paid) */}
      <section className="space-y-4 rounded-2xl border border-border bg-card p-5 shadow-sm">
        <div className="flex items-center gap-2">
          <MapPin className="h-4 w-4 text-primary" />
          <h2 className="font-serif text-lg font-bold">Hide from city</h2>
          {!paid && <Lock className="h-3.5 w-3.5 text-muted-foreground" />}
        </div>
        {!paid && (
          <p className="text-xs text-muted-foreground">Premium feature  hide your profile from members in a specific city.</p>
        )}
        {paid ? (
          <div className="space-y-3">
            <div className="flex gap-2">
              <Input
                value={hideCityInput}
                onChange={(e) => setHideCityInput(e.target.value)}
                placeholder="e.g. Bengaluru"
                className="flex-1"
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={!hideCityInput.trim()}
                onClick={() => {
                  if (!hideCityInput.trim() || settings.hideFromCities.includes(hideCityInput.trim())) return
                  update({ hideFromCities: [...settings.hideFromCities, hideCityInput.trim()] })
                  setHideCityInput("")
                }}
              >
                Add
              </Button>
            </div>
            {settings.hideFromCities.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {settings.hideFromCities.map((city: any) => (
                  <span key={city} className="inline-flex items-center gap-1 rounded-full bg-muted px-2.5 py-1 text-xs font-medium">
                    {city}
                    <button
                      type="button"
                      onClick={() => update({ hideFromCities: settings.hideFromCities.filter((c: any) => c !== city) })}
                      className="text-muted-foreground hover:text-destructive"
                      aria-label={`Remove ${city}`}
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>
        ) : (
          <Link href="/plans">
            <Button variant="soft" size="sm">Upgrade to unlock</Button>
          </Link>
        )}
      </section>

      {/* Show last seen */}
      <section className="space-y-4 rounded-2xl border border-border bg-card p-5 shadow-sm">
        <h2 className="font-serif text-lg font-bold">Activity</h2>
        <Toggle
          label="Show last seen"
          hint="Show your last active time to matches"
          checked={settings.showLastSeen}
          onChange={(v) => update({ showLastSeen: v })}
        />
      </section>

      {/* Notifications */}
      <section className="space-y-4 rounded-2xl border border-border bg-card p-5 shadow-sm">
        <h2 className="font-serif text-lg font-bold">Notifications</h2>
        <Toggle label="Email alerts" checked={settings.notifyEmail} onChange={(v) => update({ notifyEmail: v })} />
        <Toggle label="SMS alerts" checked={settings.notifySms} onChange={(v) => update({ notifySms: v })} />
        <Toggle label="Push notifications" checked={settings.notifyPush} onChange={(v) => update({ notifyPush: v })} />
      </section>

      {/* Account */}
      <section className="space-y-4 rounded-2xl border border-border bg-card p-5 shadow-sm">
        <h2 className="font-serif text-lg font-bold">Account</h2>
        <div>
          <p className="text-sm text-muted-foreground">Phone</p>
          <p className="font-medium mb-4">{phone ? `+91 ${phone}` : "Not set"}</p>
          <Toggle label="Hide my phone number" hint="Don't show my phone number to other users" checked={settings.hidePhone} onChange={(v) => update({ hidePhone: v })} />
        </div>
        <Button
          variant="outline"
          className="w-full"
          onClick={async () => {
            sessionStorage.clear()
            localStorage.clear()
            
            // Clear backend cookies
            try {
              const { apiClient } = await import("@/lib/api-client")
              await apiClient.auth.logout()
            } catch (err) {}

            // Hard reload to destroy React Query cache and application state
            window.location.href = "/login"
          }}
        >
          <LogOut className="mr-2 h-4 w-4" /> Log out (demo)
        </Button>
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
  hint,
  checked,
  onChange,
}: {
  label: string
  hint?: string
  checked: boolean
  onChange: (v: boolean) => void
}) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className="flex w-full items-center justify-between gap-4 rounded-xl bg-muted/50 px-3 py-3 text-left"
    >
      <div>
        <span className="text-sm font-medium">{label}</span>
        {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
      </div>
      <span
        className={cn(
          "relative h-6 w-11 shrink-0 rounded-full transition-colors",
          checked ? "bg-primary" : "bg-border"
        )}
      >
        <span
          className={cn(
            "absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform",
            checked ? "translate-x-5" : "translate-x-0.5"
          )}
        />
      </span>
    </button>
  )
}
