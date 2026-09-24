"use client"

import * as React from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useForm, Controller } from "react-hook-form"
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
  DIETS,
  EDUCATION_LEVELS,
  EMPLOYMENT_STATUSES,
  INCOME_BANDS,
  STARS,
  RASHIS,
} from "@/lib/profile-store"
import { adminCreateProfileSchema, type AdminCreateProfileValues } from "@/lib/validation"
import { hashFile } from "@/lib/file-hash"
import { ArrowLeft, Loader2, Upload, X } from "lucide-react"
import { MultiSelect } from "@/components/profile/multi-select"
import { ChildrenFields } from "@/components/profile/children-fields"
import { maritalAsksChildren } from "@/lib/identity-fields"
import { CityAutocomplete } from "@/components/profile/city-autocomplete"
import { CommunityFields } from "@/components/profile/community-fields"
import { BirthTimeInput } from "@/components/profile/input-with-unit"

const MAX_PHOTOS = 6
const MAX_IMAGE_MB = 5
const IMAGE_TYPES = ["image/jpeg", "image/jpg", "image/png", "image/webp"]

export default function AdminCreateProfilePage() {
  const router = useRouter()
  const createProfile = useCreateAdminProfileMutation()
  const [photos, setPhotos] = React.useState<File[]>([])
  const [previews, setPreviews] = React.useState<string[]>([])
  const [photoHashes, setPhotoHashes] = React.useState<string[]>([])
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
      height: "160 cm",
      diet: "Vegetarian",
      city: "",
      religion: "Hindu",
      caste: "",
      motherTongue: "Tamil",
      educationLevel: "Bachelors",
      employmentStatus: "Employed",
      annualIncome: "Prefer not to say",
      nakshatra: "",
      rashi: "",
      manglik: "Don't Know",
      birthTime: "",
      birthPlace: "",
      brothersCount: 0,
      sistersCount: 0,
      planId: "free",
      prefAgeMin: 21,
      prefAgeMax: 35,
      prefHeightMinCm: undefined,
      prefHeightMaxCm: undefined,
      prefMaritalStatuses: [],
      prefReligions: [],
      prefCastes: [],
      prefMotherTongues: ["Tamil"],
      prefLocations: [],
      prefAcceptableIncomes: [],
    },
  })

  React.useEffect(() => {
    return () => {
      previews.forEach((url) => {
        if (url.startsWith("blob:")) URL.revokeObjectURL(url)
      })
    }
  }, [previews])

  const addPhotos = async (files: FileList | null) => {
    if (!files?.length) return
    setError("")
    const remaining = MAX_PHOTOS - photos.length
    const nextFiles = [...photos]
    const nextPreviews = [...previews]
    const nextHashes = [...photoHashes]

    for (const file of Array.from(files).slice(0, remaining)) {
      if (!IMAGE_TYPES.includes(file.type) && !file.type.startsWith("image/")) {
        setError("Please choose a JPG, PNG, or WEBP photo.")
        continue
      }
      if (file.size > MAX_IMAGE_MB * 1024 * 1024) {
        setError(`Each photo must be under ${MAX_IMAGE_MB} MB.`)
        continue
      }
      const hash = await hashFile(file)
      if (nextHashes.includes(hash)) {
        setError("This photo is already on the profile.")
        continue
      }
      nextFiles.push(file)
      nextPreviews.push(URL.createObjectURL(file))
      nextHashes.push(hash)
    }

    setPhotos(nextFiles)
    setPreviews(nextPreviews)
    setPhotoHashes(nextHashes)
  }

  const removePhoto = (index: number) => {
    const url = previews[index]
    if (url?.startsWith("blob:")) URL.revokeObjectURL(url)
    setPhotos((current) => current.filter((_, i) => i !== index))
    setPreviews((current) => current.filter((_, i) => i !== index))
    setPhotoHashes((current) => current.filter((_, i) => i !== index))
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
          hasChildren: values.hasChildren,
          childrenCount: values.childrenCount,
          childrenLivingWithMe: values.childrenLivingWithMe,
          height: values.height,
          diet: values.diet,
          city: values.city,
          religion: values.religion,
          caste: values.caste,
          motherTongue: values.motherTongue,
          educationLevel: values.educationLevel,
          employmentStatus: values.employmentStatus,
          annualIncome: values.annualIncome,
          nakshatra: values.nakshatra,
          rashi: values.rashi,
          manglik: values.manglik,
          birthTime: values.birthTime,
          birthPlace: values.birthPlace,
          brothersCount: values.brothersCount,
          sistersCount: values.sistersCount,
          planId: values.planId,
          prefAgeMin: values.prefAgeMin,
          prefAgeMax: values.prefAgeMax,
          prefHeightMinCm: values.prefHeightMinCm,
          prefHeightMaxCm: values.prefHeightMaxCm,
          prefMaritalStatuses: values.prefMaritalStatuses,
          prefReligions: values.prefReligions,
          prefCastes: values.prefCastes,
          prefMotherTongues: values.prefMotherTongues,
          prefLocations: values.prefLocations,
          prefAcceptableIncomes: values.prefAcceptableIncomes,
        },
        photos,
      })
      router.push(`/admin/profiles/${profile.id}`)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not create profile.")
    }
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6 pb-20">
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
        className="space-y-8 rounded-3xl border border-border bg-card p-5 shadow-sm md:p-6"
        onSubmit={form.handleSubmit(onSubmit)}
      >
        {/* Section 1: Basic & Personal Info */}
        <div className="space-y-4">
          <h2 className="font-serif text-xl font-bold">Basic Information</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Profile for" error={form.formState.errors.profileFor?.message}>
              <Select value={form.watch("profileFor")} onValueChange={(v) => form.setValue("profileFor", v as AdminCreateProfileValues["profileFor"])}>
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
              <Select value={form.watch("gender")} onValueChange={(v) => form.setValue("gender", v as AdminCreateProfileValues["gender"])}>
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
            <Field label="Marital status" error={form.formState.errors.maritalStatus?.message}>
              <Select value={form.watch("maritalStatus")} onValueChange={(v) => form.setValue("maritalStatus", v as AdminCreateProfileValues["maritalStatus"])}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {MARITAL_STATUSES.map((v) => (
                    <SelectItem key={v} value={v}>{v}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
          </div>

          {maritalAsksChildren(form.watch("maritalStatus")) && (
            <div className="mt-4">
              <Controller
                control={form.control}
                name="hasChildren"
                render={({ field }) => (
                  <ChildrenFields
                    maritalStatus={form.watch("maritalStatus")}
                    hasChildren={field.value}
                    childrenCount={form.watch("childrenCount")}
                    childrenLivingWithMe={form.watch("childrenLivingWithMe")}
                    onChange={(vals) => {
                      if (vals.hasChildren !== undefined) form.setValue("hasChildren", vals.hasChildren)
                      if (vals.childrenCount !== undefined) form.setValue("childrenCount", vals.childrenCount)
                      if (vals.childrenLivingWithMe !== undefined) form.setValue("childrenLivingWithMe", vals.childrenLivingWithMe)
                    }}
                    errors={{
                      hasChildren: form.formState.errors.hasChildren?.message,
                      childrenCount: form.formState.errors.childrenCount?.message,
                      childrenLivingWithMe: form.formState.errors.childrenLivingWithMe?.message,
                    }}
                  />
                )}
              />
            </div>
          )}

          <div className="grid gap-4 sm:grid-cols-2 pt-2">
            <Field label="Height" error={form.formState.errors.height?.message}>
              <Input {...form.register("height")} placeholder="e.g. 5' 6&quot; or 168 cm" />
            </Field>
            <Field label="Diet" error={form.formState.errors.diet?.message}>
              <Select value={form.watch("diet")} onValueChange={(v) => form.setValue("diet", v as AdminCreateProfileValues["diet"])}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {DIETS.map((v) => (
                    <SelectItem key={v} value={v}>{v}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
          </div>
        </div>

        <div className="h-px bg-border" />

        {/* Section 2: Community & Location */}
        <div className="space-y-4">
          <h2 className="font-serif text-xl font-bold">Community & Location</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="City" error={form.formState.errors.city?.message}>
              <CityAutocomplete
                city={form.watch("city")}
                citySlug={""}
                onCityChange={({ city }) => {
                  form.setValue("city", city, { shouldValidate: true })
                }}
                placeholder="Search city…"
              />
            </Field>
            <Field label="Religion" error={form.formState.errors.religion?.message}>
              <Select value={form.watch("religion")} onValueChange={(v) => {
                form.setValue("religion", v)
                form.setValue("caste", "")
              }}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {RELIGIONS.map((v) => (
                    <SelectItem key={v} value={v}>{v}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <Field label="Caste / community" error={form.formState.errors.caste?.message}>
              <CommunityFields
                religion={form.watch("religion")}
                caste={form.watch("caste")}
                onChange={(value) => {
                  if (value.caste !== undefined) form.setValue("caste", value.caste, { shouldValidate: true })
                }}
              />
            </Field>
            <Field label="Mother tongue" error={form.formState.errors.motherTongue?.message}>
              <Select value={form.watch("motherTongue")} onValueChange={(v) => form.setValue("motherTongue", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {MOTHER_TONGUES.map((v) => (
                    <SelectItem key={v} value={v}>{v}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
          </div>
        </div>

        <div className="h-px bg-border" />

        {/* Section 3b: Horoscope (Layer-B required) */}
        <div className="space-y-4">
          <h2 className="font-serif text-xl font-bold">Horoscope</h2>
          <p className="text-sm text-muted-foreground">
            Required so the profile can appear in Discover and be auto-verified.
          </p>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Star / nakshatra" error={form.formState.errors.nakshatra?.message}>
              <Select value={form.watch("nakshatra") || undefined} onValueChange={(v) => form.setValue("nakshatra", v)}>
                <SelectTrigger><SelectValue placeholder="Select star" /></SelectTrigger>
                <SelectContent>
                  {STARS.map((v) => (
                    <SelectItem key={v} value={v}>{v}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <Field label="Rashi" error={form.formState.errors.rashi?.message}>
              <Select value={form.watch("rashi") || undefined} onValueChange={(v) => form.setValue("rashi", v)}>
                <SelectTrigger><SelectValue placeholder="Select rashi" /></SelectTrigger>
                <SelectContent>
                  {RASHIS.map((r) => (
                    <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <Field label="Manglik" error={form.formState.errors.manglik?.message}>
              <Select
                value={form.watch("manglik")}
                onValueChange={(v) => form.setValue("manglik", v as AdminCreateProfileValues["manglik"])}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {(["Yes", "No", "Don't Know"] as const).map((v) => (
                    <SelectItem key={v} value={v}>{v}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <Field label="Birth time" error={form.formState.errors.birthTime?.message}>
              <BirthTimeInput
                value={form.watch("birthTime")}
                onChange={(birthTime) => form.setValue("birthTime", birthTime, { shouldValidate: true })}
              />
            </Field>
            <Field label="Birth place" error={form.formState.errors.birthPlace?.message}>
              <CityAutocomplete
                city={form.watch("birthPlace")}
                citySlug={""}
                onCityChange={({ city }) => {
                  form.setValue("birthPlace", city, { shouldValidate: true })
                }}
                placeholder="City of birth"
              />
            </Field>
          </div>
        </div>

        <div className="h-px bg-border" />

        {/* Section 3: Professional & Family */}
        <div className="space-y-4">
          <h2 className="font-serif text-xl font-bold">Professional & Family</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Education" error={form.formState.errors.educationLevel?.message}>
              <Select value={form.watch("educationLevel")} onValueChange={(v) => form.setValue("educationLevel", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {EDUCATION_LEVELS.map((v) => (
                    <SelectItem key={v} value={v}>{v}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <Field label="Employment" error={form.formState.errors.employmentStatus?.message}>
              <Select value={form.watch("employmentStatus")} onValueChange={(v) => form.setValue("employmentStatus", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {EMPLOYMENT_STATUSES.map((v) => (
                    <SelectItem key={v} value={v}>{v}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <Field label="Annual Income" error={form.formState.errors.annualIncome?.message}>
              <Select value={form.watch("annualIncome")} onValueChange={(v) => form.setValue("annualIncome", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {INCOME_BANDS.map((v) => (
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
        </div>

        <div className="h-px bg-border" />

        {/* Section 4: Partner Preferences */}
        <div className="space-y-4">
          <h2 className="font-serif text-xl font-bold">Partner Preferences</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Min Age" required error={form.formState.errors.prefAgeMin?.message}>
              <Input type="number" {...form.register("prefAgeMin", { valueAsNumber: true })} />
            </Field>
            <Field label="Max Age" required error={form.formState.errors.prefAgeMax?.message}>
              <Input type="number" {...form.register("prefAgeMax", { valueAsNumber: true })} />
            </Field>

            <Field label="Min Height (cm)" error={form.formState.errors.prefHeightMinCm?.message}>
              <Input type="number" {...form.register("prefHeightMinCm", { valueAsNumber: true })} />
            </Field>
            <Field label="Max Height (cm)" error={form.formState.errors.prefHeightMaxCm?.message}>
              <Input type="number" {...form.register("prefHeightMaxCm", { valueAsNumber: true })} />
            </Field>

            <Field label="Preferred Marital Statuses" required error={form.formState.errors.prefMaritalStatuses?.message}>
              <Controller
                control={form.control}
                name="prefMaritalStatuses"
                render={({ field }) => (
                  <MultiSelect
                    values={field.value || []}
                    onValuesChange={field.onChange}
                    options={MARITAL_STATUSES}
                    placeholder="Select marital status"
                  />
                )}
              />
            </Field>
            <Field label="Preferred Religions" required error={form.formState.errors.prefReligions?.message}>
              <Controller
                control={form.control}
                name="prefReligions"
                render={({ field }) => (
                  <MultiSelect
                    values={field.value || []}
                    onValuesChange={field.onChange}
                    options={RELIGIONS}
                    placeholder="Select religion"
                  />
                )}
              />
            </Field>
            
            <Field label="Preferred Mother Tongues" error={form.formState.errors.prefMotherTongues?.message}>
              <Controller
                control={form.control}
                name="prefMotherTongues"
                render={({ field }) => (
                  <MultiSelect
                    values={field.value || []}
                    onValuesChange={field.onChange}
                    options={MOTHER_TONGUES}
                    placeholder="Select mother tongue"
                  />
                )}
              />
            </Field>
            
            <Field label="Preferred Incomes" error={form.formState.errors.prefAcceptableIncomes?.message}>
              <Controller
                control={form.control}
                name="prefAcceptableIncomes"
                render={({ field }) => (
                  <MultiSelect
                    values={field.value || []}
                    onValuesChange={field.onChange}
                    options={INCOME_BANDS}
                    placeholder="Select income"
                  />
                )}
              />
            </Field>
          </div>
        </div>

        <div className="h-px bg-border" />

        {/* Section 5: Photos */}
        <div className="space-y-3">
          <div>
            <p className="text-sm font-semibold">Profile photos</p>
            <p className="text-xs text-muted-foreground">
              Add 1–6 photos. Admin-created profiles are verified automatically.
            </p>
          </div>
          <div className="grid grid-cols-3 gap-3 sm:grid-cols-4">
            {Array.from({ length: MAX_PHOTOS }).map((_, index) => {
              const src = previews[index]
              if (src) {
                return (
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
                )
              }
              return (
                <button
                  key={`empty-${index}`}
                  type="button"
                  onClick={() => photoInputRef.current?.click()}
                  className="flex aspect-square flex-col items-center justify-center gap-1 rounded-2xl border border-dashed border-border text-muted-foreground hover:border-primary/40 hover:text-primary"
                >
                  <Upload className="h-5 w-5" />
                  <span className="text-xs font-medium">Add photo</span>
                </button>
              )
            })}
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
  required,
  children,
}: {
  label: string
  error?: string
  required?: boolean
  children: React.ReactNode
}) {
  return (
    <div className="space-y-2">
      <Label>
        {label}
        {required ? (
          <span className="ml-0.5 text-destructive" aria-hidden="true">
            *
          </span>
        ) : null}
      </Label>
      {children}
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  )
}
