"use client"

import * as React from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  emptySignupData,
  loadProfile,
  saveProfile,
  type SignupData,
} from "@/lib/profile-store"
import { ArrowLeft, Check } from "lucide-react"

export default function ProfileEditPage() {
  const router = useRouter()
  const [data, setData] = React.useState<SignupData>(emptySignupData())
  const [saved, setSaved] = React.useState(false)
  const [loaded, setLoaded] = React.useState(false)

  React.useEffect(() => {
    /* eslint-disable react-hooks/set-state-in-effect -- sessionStorage is client-only */
    setData(loadProfile() ?? emptySignupData())
    setLoaded(true)
    /* eslint-enable react-hooks/set-state-in-effect */
  }, [])

  const update = (fields: Partial<SignupData>) => setData((prev) => ({ ...prev, ...fields }))

  const onSave = () => {
    saveProfile(data)
    setSaved(true)
    setTimeout(() => {
      router.push("/profile")
    }, 600)
  }

  if (!loaded) {
    return (
      <main className="mx-auto max-w-2xl px-4 py-10 text-center text-sm text-muted-foreground">
        Loading…
      </main>
    )
  }

  return (
    <main className="mx-auto max-w-2xl space-y-6 px-3 py-5 sm:px-4 md:py-8">
      <div className="flex items-center gap-3">
        <Link
          href="/profile"
          className="tap-target inline-flex items-center justify-center rounded-full border border-border bg-card"
          aria-label="Back"
        >
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <div>
          <h1 className="font-serif text-2xl font-bold">Edit profile</h1>
          <p className="text-sm text-muted-foreground">Changes save on this device for now</p>
        </div>
      </div>

      <section className="space-y-4 rounded-2xl border border-border bg-card p-5 shadow-sm">
        <h2 className="font-serif text-lg font-bold">Basics</h2>
        <Field label="Full name">
          <Input value={data.fullName} onChange={(e) => update({ fullName: e.target.value })} />
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Gender">
            <Input value={data.gender} onChange={(e) => update({ gender: e.target.value })} />
          </Field>
          <Field label="Marital status">
            <Input value={data.maritalStatus} onChange={(e) => update({ maritalStatus: e.target.value })} />
          </Field>
        </div>
        <div className="grid grid-cols-3 gap-3">
          <Field label="Day">
            <Input value={data.dobDay} onChange={(e) => update({ dobDay: e.target.value })} placeholder="DD" />
          </Field>
          <Field label="Month">
            <Input value={data.dobMonth} onChange={(e) => update({ dobMonth: e.target.value })} placeholder="MM" />
          </Field>
          <Field label="Year">
            <Input value={data.dobYear} onChange={(e) => update({ dobYear: e.target.value })} placeholder="YYYY" />
          </Field>
        </div>
      </section>

      <section className="space-y-4 rounded-2xl border border-border bg-card p-5 shadow-sm">
        <h2 className="font-serif text-lg font-bold">Community</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Religion">
            <Input value={data.religion} onChange={(e) => update({ religion: e.target.value })} />
          </Field>
          <Field label="Caste / community">
            <Input value={data.caste} onChange={(e) => update({ caste: e.target.value })} />
          </Field>
          <Field label="Mother tongue">
            <Input value={data.motherTongue} onChange={(e) => update({ motherTongue: e.target.value })} />
          </Field>
          <Field label="City">
            <Input value={data.city} onChange={(e) => update({ city: e.target.value })} />
          </Field>
        </div>
      </section>

      <section className="space-y-4 rounded-2xl border border-border bg-card p-5 shadow-sm">
        <h2 className="font-serif text-lg font-bold">Education & career</h2>
        <Field label="Education">
          <Input value={data.education} onChange={(e) => update({ education: e.target.value })} />
        </Field>
        <Field label="Occupation">
          <Input value={data.occupation} onChange={(e) => update({ occupation: e.target.value })} />
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Company">
            <Input value={data.companyName} onChange={(e) => update({ companyName: e.target.value })} />
          </Field>
          <Field label="Annual income">
            <Input value={data.annualIncome} onChange={(e) => update({ annualIncome: e.target.value })} />
          </Field>
        </div>
      </section>

      <section id="preferences" className="space-y-4 rounded-2xl border border-border bg-card p-5 shadow-sm">
        <h2 className="font-serif text-lg font-bold">Partner preferences</h2>
        <div className="grid grid-cols-2 gap-4">
          <Field label="Min age">
            <Input
              type="number"
              value={data.prefAgeMin}
              onChange={(e) => update({ prefAgeMin: Number(e.target.value) || 18 })}
            />
          </Field>
          <Field label="Max age">
            <Input
              type="number"
              value={data.prefAgeMax}
              onChange={(e) => update({ prefAgeMax: Number(e.target.value) || 40 })}
            />
          </Field>
        </div>
        <Field label="Preferred religions (comma separated)">
          <Input
            value={data.prefReligion.join(", ")}
            onChange={(e) =>
              update({
                prefReligion: e.target.value
                  .split(",")
                  .map((s) => s.trim())
                  .filter(Boolean),
              })
            }
          />
        </Field>
      </section>

      <section id="photos" className="space-y-3 rounded-2xl border border-border bg-card p-5 shadow-sm">
        <h2 className="font-serif text-lg font-bold">Photos</h2>
        <p className="text-sm text-muted-foreground">
          {data.photos.length} photo{data.photos.length === 1 ? "" : "s"} on file. Re-upload from registration
          verification for now.
        </p>
        <Link href="/register">
          <Button variant="outline" size="sm">
            Manage via register flow
          </Button>
        </Link>
      </section>

      <section id="horoscope" className="space-y-3 rounded-2xl border border-border bg-card p-5 shadow-sm">
        <h2 className="font-serif text-lg font-bold">Horoscope</h2>
        <p className="text-sm text-muted-foreground">
          {data.horoscopeName ? `Uploaded: ${data.horoscopeName}` : "No horoscope PDF yet."}
        </p>
        <Field label="File name (demo)">
          <Input
            value={data.horoscopeName}
            onChange={(e) => update({ horoscopeName: e.target.value, horoscopeSize: e.target.value ? 120000 : 0 })}
            placeholder="my-jathagam.pdf"
          />
        </Field>
      </section>

      <div className="sticky bottom-20 z-20 flex gap-3 bg-background/90 py-3 backdrop-blur md:static md:bottom-auto md:bg-transparent md:py-0">
        <Button variant="outline" className="flex-1" onClick={() => router.push("/profile")}>
          Cancel
        </Button>
        <Button className="flex-[1.4]" onClick={onSave}>
          {saved ? (
            <>
              <Check className="mr-1.5 h-4 w-4" /> Saved
            </>
          ) : (
            "Save changes"
          )}
        </Button>
      </div>
    </main>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">{label}</Label>
      {children}
    </div>
  )
}
