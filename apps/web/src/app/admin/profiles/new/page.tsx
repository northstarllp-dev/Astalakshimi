"use client"

import * as React from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
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
import { useCreateAdminProfileMutation } from "@/hooks/admin-queries"
import {
  MARITAL_STATUSES,
  MOTHER_TONGUES,
  RELIGIONS,
  SIBLING_COUNTS,
} from "@/lib/profile-store"
import { adminCreateProfileSchema, type AdminCreateProfileValues } from "@/lib/validation"
import { ArrowLeft, Loader2, Upload, X } from "lucide-react"

const MAX_PHOTOS = 6
const MAX_IMAGE_MB = 5
const IMAGE_TYPES = ["image/jpeg", "image/jpg", "image/png", "image/webp"]

export default function AdminCreateProfilePage() {
  const router = useRouter()
  const createProfile = useCreateAdminProfileMutation()
  const [photos, setPhotos] = React.useState<File[]>([])
  const [previews, setPreviews] = React.useState<string[]>([])
  const [error, setError] = React.useState("")
  const photoInputRef = React.useRef<HTMLInputElement>(null)

  const form = useForm<AdminCreateProfileValues>({
    resolver: zodResolver(adminCreateProfileSchema),
    defaultValues: {
      profileFor: "Daughter",
      phone: "",
      fullName: "",
      gender: "Female",
      dobDay: "01",
      dobMonth: "01",
      dobYear: "1998",
      maritalStatus: "Never Married",
      city: "",
      religion: "Hindu",
      caste: "",
      motherTongue: "Tamil",
      brothersCount: 0,
      sistersCount: 0,
      planId: "free",
    },
  })

  React.useEffect(() => {
    return () => {
      previews.forEach((url) => {
        if (url.startsWith("blob:")) URL.revokeObjectURL(url)
      })
    }
  }, [previews])

  const addPhotos = (files: FileList | null) => {
    if (!files?.length) return
    setError("")
    const remaining = MAX_PHOTOS - photos.length
    const nextFiles = [...photos]
    const nextPreviews = [...previews]

    for (const file of Array.from(files).slice(0, remaining)) {
      if (!IMAGE_TYPES.includes(file.type) && !file.type.startsWith("image/")) {
        setError("Please choose a JPG, PNG, or WEBP photo.")
        continue
      }
      if (file.size > MAX_IMAGE_MB * 1024 * 1024) {
        setError(`Each photo must be under ${MAX_IMAGE_MB} MB.`)
        continue
      }
      nextFiles.push(file)
      nextPreviews.push(URL.createObjectURL(file))
    }

    setPhotos(nextFiles)
    setPreviews(nextPreviews)
  }

  const removePhoto = (index: number) => {
    const url = previews[index]
    if (url?.startsWith("blob:")) URL.revokeObjectURL(url)
    setPhotos((current) => current.filter((_, i) => i !== index))
    setPreviews((current) => current.filter((_, i) => i !== index))
  }

  const onSubmit = async (values: AdminCreateProfileValues) => {
    setError("")
    if (photos.length < 1) {
      setError("Add at least one profile photo.")
      return
    }

    try {
      const profile = await createProfile.mutateAsync({
        input: {
          profileFor: values.profileFor,
          phone: values.phone,
          fullName: values.fullName,
          gender: values.gender as "Male" | "Female" | "Other",
          dobDay: values.dobDay,
          dobMonth: values.dobMonth,
          dobYear: values.dobYear,
          maritalStatus: values.maritalStatus as
            | "Never Married"
            | "Divorced"
            | "Widowed"
            | "Awaiting Divorce",
          city: values.city,
          religion: values.religion,
          caste: values.caste,
          motherTongue: values.motherTongue,
          brothersCount: values.brothersCount,
          sistersCount: values.sistersCount,
          planId: values.planId,
        },
        photos,
      })
      router.push(`/admin/profiles/${profile.id}`)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not create profile.")
    }
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/admin/profiles">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="mr-1 h-4 w-4" /> Back
          </Button>
        </Link>
        <div>
          <p className="royal-label">Assisted registration</p>
          <h1 className="font-serif text-3xl font-bold">Create profile</h1>
        </div>
      </div>

      <form
        className="space-y-5 rounded-3xl border border-border bg-card p-5 shadow-sm md:p-6"
        onSubmit={form.handleSubmit(onSubmit)}
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Profile for" error={form.formState.errors.profileFor?.message}>
            <Select value={form.watch("profileFor")} onValueChange={(v) => form.setValue("profileFor", v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {["Myself", "Son", "Daughter", "Brother", "Sister", "Relative", "Friend"].map((v) => (
                  <SelectItem key={v} value={v}>{v}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <Field label="Mobile" error={form.formState.errors.phone?.message}>
            <Input {...form.register("phone")} placeholder="10-digit number" inputMode="numeric" />
          </Field>
          <Field label="Full name" error={form.formState.errors.fullName?.message}>
            <Input {...form.register("fullName")} />
          </Field>
          <Field label="Gender" error={form.formState.errors.gender?.message}>
            <Select value={form.watch("gender")} onValueChange={(v) => form.setValue("gender", v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="Female">Female</SelectItem>
                <SelectItem value="Male">Male</SelectItem>
              </SelectContent>
            </Select>
          </Field>
          <Field label="Date of birth (DD / MM / YYYY)" error={form.formState.errors.dobYear?.message}>
            <div className="grid grid-cols-3 gap-2">
              <Input {...form.register("dobDay")} placeholder="DD" />
              <Input {...form.register("dobMonth")} placeholder="MM" />
              <Input {...form.register("dobYear")} placeholder="YYYY" />
            </div>
          </Field>
          <Field label="Marital status">
            <Select value={form.watch("maritalStatus")} onValueChange={(v) => form.setValue("maritalStatus", v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {MARITAL_STATUSES.map((v) => (
                  <SelectItem key={v} value={v}>{v}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <Field label="City" error={form.formState.errors.city?.message}>
            <Input {...form.register("city")} />
          </Field>
          <Field label="Religion">
            <Select value={form.watch("religion")} onValueChange={(v) => form.setValue("religion", v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {RELIGIONS.map((v) => (
                  <SelectItem key={v} value={v}>{v}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <Field label="Caste / community" error={form.formState.errors.caste?.message}>
            <Input {...form.register("caste")} />
          </Field>
          <Field label="Mother tongue">
            <Select value={form.watch("motherTongue")} onValueChange={(v) => form.setValue("motherTongue", v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {MOTHER_TONGUES.map((v) => (
                  <SelectItem key={v} value={v}>{v}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <Field label="Brothers">
            <Select
              value={String(form.watch("brothersCount"))}
              onValueChange={(v) => form.setValue("brothersCount", Number(v))}
            >
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {SIBLING_COUNTS.map((v) => (
                  <SelectItem key={v} value={String(v)}>{v}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <Field label="Sisters">
            <Select
              value={String(form.watch("sistersCount"))}
              onValueChange={(v) => form.setValue("sistersCount", Number(v))}
            >
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {SIBLING_COUNTS.map((v) => (
                  <SelectItem key={v} value={String(v)}>{v}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <Field label="Plan">
            <Select value={form.watch("planId") || "free"} onValueChange={(v) => form.setValue("planId", v)}>
              <SelectTrigger><SelectValue placeholder="Select plan" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="free">Free</SelectItem>
                <SelectItem value="silver">Silver</SelectItem>
                <SelectItem value="gold">Gold</SelectItem>
                <SelectItem value="platinum">Platinum</SelectItem>
                <SelectItem value="diamond">Diamond</SelectItem>
              </SelectContent>
            </Select>
          </Field>
        </div>

        <div className="space-y-3">
          <div>
            <p className="text-sm font-semibold">Profile photos</p>
            <p className="text-xs text-muted-foreground">
              Add 1–6 photos. Admin-created profiles are verified automatically.
            </p>
          </div>
          <div className="grid grid-cols-3 gap-3 sm:grid-cols-4">
            {previews.map((src, index) => (
              <div key={src} className="relative aspect-square overflow-hidden rounded-2xl border border-border">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={src} alt={`Photo ${index + 1}`} className="h-full w-full object-cover" />
                <button
                  type="button"
                  onClick={() => removePhoto(index)}
                  className="absolute right-1.5 top-1.5 rounded-full bg-background/90 p-1 shadow-sm"
                  aria-label={`Remove photo ${index + 1}`}
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            ))}
            {photos.length < MAX_PHOTOS && (
              <button
                type="button"
                onClick={() => photoInputRef.current?.click()}
                className="flex aspect-square flex-col items-center justify-center gap-1 rounded-2xl border border-dashed border-border text-muted-foreground hover:border-primary/40 hover:text-primary"
              >
                <Upload className="h-5 w-5" />
                <span className="text-xs font-medium">Add photo</span>
              </button>
            )}
          </div>
          <input
            ref={photoInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            multiple
            className="hidden"
            onChange={(e) => {
              addPhotos(e.target.files)
              e.target.value = ""
            }}
          />
        </div>

        {error && <p className="text-sm text-destructive">{error}</p>}

        <p className="text-xs text-muted-foreground">
          This member can log in with the mobile number above using OTP.
        </p>

        <Button type="submit" className="w-full sm:w-auto" disabled={createProfile.isPending}>
          {createProfile.isPending ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Saving…
            </>
          ) : (
            "Create profile"
          )}
        </Button>
      </form>
    </div>
  )
}

function Field({
  label,
  error,
  children,
}: {
  label: string
  error?: string
  children: React.ReactNode
}) {
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      {children}
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  )
}
