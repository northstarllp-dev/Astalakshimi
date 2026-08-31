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
import { Step4Verify } from "@/components/signup/step-verify"
import { useAdminSessionQuery, useCreateAdminProfileMutation } from "@/hooks/admin-queries"
import {
  emptySignupData,
  FAMILY_TYPES,
  MARITAL_STATUSES,
  MOTHER_TONGUES,
  RELIGIONS,
  SIBLING_COUNTS,
  type SignupData,
} from "@/lib/profile-store"
import { adminCreateProfileSchema, type AdminCreateProfileValues } from "@/lib/validation"
import { ArrowLeft, Loader2 } from "lucide-react"

export default function AdminCreateProfilePage() {
  const router = useRouter()
  const { data: session } = useAdminSessionQuery()
  const createProfile = useCreateAdminProfileMutation()
  const [step, setStep] = React.useState(1)
  const [verifyData, setVerifyData] = React.useState<SignupData>(emptySignupData())
  const [error, setError] = React.useState("")

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
      markVerified: false,
    },
  })

  const updateVerify = (fields: Partial<SignupData>) => {
    setVerifyData((prev) => ({ ...prev, ...fields }))
  }

  const onSubmitBasics = async (values: AdminCreateProfileValues) => {
    setError("")
    if (step === 1) {
      setStep(2)
      return
    }
    if (!session) return
    if (verifyData.photos.length < 1) {
      setError("Add at least one profile photo.")
      setStep(2)
      return
    }

    try {
      const profile = await createProfile.mutateAsync({
        staff: session,
        input: {
          phone: values.phone,
          profileFor: values.profileFor,
          fullName: values.fullName,
          gender: values.gender,
          city: values.city,
          state: "Tamil Nadu",
          religion: values.religion,
          caste: values.caste,
          motherTongue: values.motherTongue,
          dobDay: values.dobDay,
          dobMonth: values.dobMonth,
          dobYear: values.dobYear,
          maritalStatus: values.maritalStatus,
          brothersCount: values.brothersCount,
          sistersCount: values.sistersCount,
          aboutMe: verifyData.aboutMe || "Profile created by staff on behalf of the family.",
          verificationMethod: verifyData.verificationMethod || "selfie",
          verificationStatus: values.markVerified ? "verified" : "pending",
          selfiePhoto: verifyData.selfiePhoto,
          govtIdType: verifyData.govtIdType,
          govtIdPhoto: verifyData.govtIdPhoto,
          horoscopeName: verifyData.horoscopeName,
          birthTime: verifyData.birthTime,
          birthPlace: verifyData.birthPlace,
          rashi: verifyData.rashi,
          star: verifyData.star,
          manglik: verifyData.manglik,
          photos: verifyData.photos.map((url, i) => ({
            id: `ph-new-${i}`,
            url,
            status: values.markVerified ? ("approved" as const) : ("pending" as const),
            isPrimary: i === 0,
          })),
          createdBy: "staff",
          accountStatus: "active",
          activeSubscription: false,
          markVerified: values.markVerified,
        },
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

      <div className="flex gap-2">
        {[1, 2].map((s) => (
          <span
            key={s}
            className={`h-1.5 flex-1 rounded-full ${step >= s ? "bg-primary" : "bg-muted"}`}
          />
        ))}
      </div>

      {step === 1 ? (
        <form
          className="space-y-5 rounded-3xl border border-border bg-card p-5 shadow-sm md:p-6"
          onSubmit={form.handleSubmit(onSubmitBasics)}
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
              <Input {...form.register("phone")} placeholder="10-digit number" />
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
          </div>

          <label className="flex cursor-pointer items-start gap-3 rounded-2xl border border-border bg-muted/30 p-4">
            <input type="checkbox" className="mt-1" {...form.register("markVerified")} />
            <span>
              <span className="block text-sm font-semibold">Mark verified after create</span>
              <span className="text-xs text-muted-foreground">For walk-in KYC when documents are checked in person.</span>
            </span>
          </label>

          <Button type="submit" className="w-full sm:w-auto">
            Continue to photos & verification
          </Button>
        </form>
      ) : (
        <div className="rounded-3xl border border-border bg-card p-5 shadow-sm md:p-6">
          <Step4Verify
            data={{
              ...verifyData,
              profileFor: form.getValues("profileFor"),
              fullName: form.getValues("fullName"),
            }}
            updateData={updateVerify}
            onNext={() => void form.handleSubmit(onSubmitBasics)()}
          />
          {error && <p className="mt-4 text-sm text-destructive">{error}</p>}
          <div className="mt-4 flex flex-wrap gap-2">
            <Button variant="outline" onClick={() => setStep(1)}>Back</Button>
            <Button onClick={() => void form.handleSubmit(onSubmitBasics)()} disabled={createProfile.isPending}>
              {createProfile.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Saving…
                </>
              ) : (
                "Create profile"
              )}
            </Button>
          </div>
        </div>
      )}
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
