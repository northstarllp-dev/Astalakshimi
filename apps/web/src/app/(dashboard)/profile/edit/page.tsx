"use client"

import * as React from "react"
import Image from "next/image"
import Link from "next/link"
import { getMediaUrl } from "@/lib/utils"
import { apiClient } from "@/lib/api-client"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { DateOfBirthPicker } from "@/components/profile/date-of-birth-picker"
import { BirthTimeInput, HeightInput, WeightInput } from "@/components/profile/input-with-unit"
import { EducationFields } from "@/components/profile/education-fields"
import { OccupationSelect } from "@/components/profile/occupation-select"
import { MultiSelect } from "@/components/profile/multi-select"
import { SearchableSelect } from "@/components/profile/searchable-select"
import { CityAutocomplete } from "@/components/profile/city-autocomplete"
import { ChildrenFields } from "@/components/profile/children-fields"
import { getCommunityLabelsForReligion, findCommunityByLabel, getCommunities } from "@/lib/community-data"
import {
  emptySignupData,
  type SignupData,
  COMPLEXIONS,
  DIETS,
  HABIT_FREQUENCY,
  INTERESTS,
  MARITAL_STATUSES,
  PROFILE_FOR_OPTIONS,
  RELIGIONS,
  MOTHER_TONGUES,
  EDUCATION_LEVELS,
  FAMILY_TYPES,
  FAMILY_STATUS,
  FAMILY_VALUES,
  PARENT_OCCUPATIONS,
  RELOCATE_OPTIONS,
  MANGLIK_OPTIONS,
  PHOTO_PRIVACY,
  INCOME_BANDS,
  COMPANY_SECTORS,
  STARS,
  RASHIS,
  formatSiblings,
  SIBLING_COUNTS,
} from "@/lib/profile-store"
import {
  useProfileQuery,
  useUpdateProfileMutation,
  useAddPhotoMutation,
  useDeletePhotoMutation,
  useReorderPhotosMutation,
} from "@/hooks/queries"
import { profileEditSchema } from "@/lib/validation"
import { isProfileComplete } from "@/lib/portal-access"
import {
  getMissingRequiredFieldIds,
  getProfileCompletenessStats,
  REQUIRED_FIELD_INVALID_CLASS,
} from "@/lib/profile-completeness"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { ArrowLeft, Camera, Check, ExternalLink, Eye, FileText, GripVertical, Star, Trash2, Upload } from "lucide-react"
import { cn } from "@/lib/utils"
import { hashFile } from "@/lib/file-hash"

const ABOUT_MAX = 1000
const MAX_PHOTOS = 10

type PhotoItem = {
  id: string
  url: string
  canReorder: boolean
}

function Field({
  label,
  required,
  missing,
  error,
  className,
  children,
}: {
  label: string
  required?: boolean
  missing?: boolean
  error?: string
  className?: string
  children: React.ReactNode
}) {
  return (
    <div className={cn("space-y-1.5", className)}>
      <Label
        className={cn(
          "text-xs font-semibold tracking-wide uppercase",
          missing ? "text-destructive" : "text-muted-foreground"
        )}
      >
        {label}
        {required && <span className="ml-0.5 text-destructive">*</span>}
      </Label>
      {children}
      {missing && !error && <p className="text-xs text-destructive">Required to unlock Discover</p>}
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  )
}

function EditSection({ id, title, children }: { id: string; title: string; children: React.ReactNode }) {
  return (
    <section id={id} className="space-y-4 rounded-2xl border border-border bg-card p-5 shadow-sm">
      <h2 className="font-serif text-lg font-bold">{title}</h2>
      {children}
    </section>
  )
}

function fieldError(errors: Record<string, unknown>, key: string): string | undefined {
  const err = errors[key] as { message?: string } | undefined
  return err?.message
}

function firstValidationError(errors: Record<string, unknown>): string | undefined {
  for (const value of Object.values(errors)) {
    if (!value || typeof value !== "object") continue
    if ("message" in value && typeof (value as { message?: string }).message === "string") {
      return (value as { message: string }).message
    }
    const nested = firstValidationError(value as Record<string, unknown>)
    if (nested) return nested
  }
  return undefined
}

const SAVE_FIELD_SECTION: Record<string, string> = {
  profileFor: "#basics",
  fullName: "#basics",
  height: "#basics",
  hasChildren: "#basics",
  childrenCount: "#basics",
  childrenLivingWithMe: "#basics",
  caste: "#community",
  subcaste: "#community",
  gotra: "#community",
  religion: "#community",
  motherTongue: "#community",
  diet: "#lifestyle",
  smoking: "#lifestyle",
  alcohol: "#lifestyle",
  interests: "#lifestyle",
  educationLevel: "#career",
  degree: "#career",
  employmentStatus: "#career",
  profession: "#career",
  annualIncome: "#career",
  birthTime: "#horoscope",
  birthPlace: "#horoscope",
  star: "#horoscope",
  rashi: "#horoscope",
  manglik: "#horoscope",
  prefReligion: "#preferences",
}

export default function ProfileEditPage() {
  const router = useRouter()
  const profileQuery = useProfileQuery()
  const updateMutation = useUpdateProfileMutation()
  const addPhotoMutation = useAddPhotoMutation()
  const deletePhotoMutation = useDeletePhotoMutation()
  const reorderPhotosMutation = useReorderPhotosMutation()

  const form = useForm<SignupData>({
    resolver: zodResolver(profileEditSchema) as any,
    values: profileQuery.data ?? emptySignupData(),
  })
  const data = form.watch() as SignupData
  const { errors } = form.formState
  const completenessStats = React.useMemo(() => getProfileCompletenessStats(data), [data])
  const missingIds = React.useMemo(() => getMissingRequiredFieldIds(data), [data])
  const communityOptions = React.useMemo(() => {
    try {
      const list = Array.from(new Set(getCommunities().map((c) => c.label))).sort((a, b) =>
        a.localeCompare(b),
      )
      return list
    } catch {
      return []
    }
  }, [])
  const isMissing = React.useCallback((id: string) => missingIds.has(id), [missingIds])
  const invalidCls = REQUIRED_FIELD_INVALID_CLASS
  const [saved, setSaved] = React.useState(false)
  const [dragIndex, setDragIndex] = React.useState<number | null>(null)
  const photoHashesRef = React.useRef(new Set<string>())
  const fileRef = React.useRef<HTMLInputElement>(null)
  const horoscopeRef = React.useRef<HTMLInputElement>(null)

  const photoItems = React.useMemo<PhotoItem[]>(() => {
    if (data.photoObjects?.length) {
      return data.photoObjects.map((photo: { id?: string; url?: string; s3Key?: string }, index: number) => ({
        id: photo.id || `obj-${index}`,
        url: photo.url || photo.s3Key || "",
        canReorder: Boolean(photo.id),
      }))
    }
    if (data.photos?.length) {
      return data.photos
        .filter(Boolean)
        .map((url: string, index: number) => ({
          id: `local-${index}`,
          url,
          canReorder: false,
        }))
    }
    return []
  }, [data.photoObjects, data.photos])

  const pdfPreviewUrl = data.horoscopeS3Key ? getMediaUrl(data.horoscopeS3Key) : null

  React.useEffect(() => {
    const hash = window.location.hash
    if (!hash) return
    const el = document.querySelector(hash)
    if (el) el.scrollIntoView({ behavior: "smooth", block: "start" })
  }, [profileQuery.isPending])

  const update = (fields: Partial<SignupData>) => {
    for (const [key, value] of Object.entries(fields)) {
      form.setValue(key as keyof SignupData, value as never, {
        shouldDirty: true,
        shouldTouch: true,
        shouldValidate: true,
      })
    }
  }

  const onSave = form.handleSubmit(
    (values) => {
      const delta: Record<string, unknown> = {}
      const excludeKeys = new Set(["photos", "photoS3Keys", "photoObjects", "selfiePhoto", "govtIdPhoto"])
      for (const key of Object.keys(values)) {
        if (!excludeKeys.has(key)) {
          delta[key] = (values as Record<string, unknown>)[key]
        }
      }

      const nextProfile = { ...data, ...(values as SignupData) }
      const unlockingDiscover =
        !isProfileComplete(profileQuery.data ?? null) && isProfileComplete(nextProfile)

      updateMutation.mutate(delta, {
        onSuccess: (saved) => {
          form.reset(saved)
          setSaved(true)
          window.setTimeout(() => router.push(unlockingDiscover ? "/dashboard" : "/profile"), 600)
        },
        onError: (err) => {
          alert(err instanceof Error ? err.message : "Failed to save profile. Please try again.")
        },
      })
    },
    (invalidErrors) => {
      const message =
        firstValidationError(invalidErrors as Record<string, unknown>) ||
        "Please fix the highlighted fields before saving."
      alert(message)
      const firstKey = Object.keys(invalidErrors)[0]
      const hash = firstKey ? SAVE_FIELD_SECTION[firstKey] : undefined
      if (hash) {
        const el = document.querySelector(hash)
        el?.scrollIntoView({ behavior: "smooth", block: "start" })
      }
    },
  )

  const onFiles = async (files: FileList | null) => {
    if (!files) return
    const remaining = MAX_PHOTOS - photoItems.length
    const filesToUpload = Array.from(files).slice(0, remaining)

    for (const file of filesToUpload) {
      try {
        const hash = await hashFile(file)
        if (photoHashesRef.current.has(hash)) {
          alert("This photo is already on your profile.")
          continue
        }
        const { s3Key, contentHash } = await apiClient.media.uploadMediaFile(file, "profile_photo")
        const storedHash = contentHash || hash
        photoHashesRef.current.add(storedHash)
        await addPhotoMutation.mutateAsync({ s3Key, contentHash: storedHash })
      } catch (err) {
        console.error("[Media] Upload failed:", err)
        const message = err instanceof Error ? err.message : "Failed to upload photo. Please try again."
        alert(message)
      }
    }
  }

  const onHoroscopeFile = async (files: FileList | null) => {
    const file = files?.[0]
    if (!file) return
    if (file.type !== "application/pdf") {
      alert("Please upload a PDF file.")
      return
    }
    try {
      const { s3Key } = await apiClient.media.uploadMediaFile(file, "horoscope")
      update({
        horoscopeName: file.name,
        horoscopeSize: file.size,
        horoscopeS3Key: s3Key,
      })
    } catch (err) {
      console.error("[Media] Horoscope upload failed:", err)
      alert("Failed to upload horoscope PDF.")
    }
  }

  const setPrimary = async (index: number) => {
    await reorder(index, 0)
  }

  const deletePhoto = async (index: number) => {
    const photo = photoItems[index]
    if (photo?.canReorder && !photo.id.startsWith("local-")) {
      await deletePhotoMutation.mutateAsync(photo.id)
      return
    }
    const nextPhotos = data.photos.filter((_, i) => i !== index)
    const nextKeys = data.photoS3Keys.filter((_, i) => i !== index)
    update({ photos: nextPhotos, photoS3Keys: nextKeys })
  }

  const reorder = async (from: number, to: number) => {
    if (from === to) return
    const next = [...photoItems]
    const [moved] = next.splice(from, 1)
    next.splice(to, 0, moved)

    const serverIds = next.map((p) => p.id).filter((id) => !id.startsWith("local-") && !id.startsWith("obj-"))
    if (serverIds.length === next.length && serverIds.length > 0) {
      await reorderPhotosMutation.mutateAsync(serverIds)
    }
  }

  if (profileQuery.isPending) {
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
          <p className="text-sm text-muted-foreground">Fields marked * are required</p>
        </div>
      </div>

      {!completenessStats.requiredComplete && completenessStats.missingRequired.length > 0 && (
        <div className="rounded-xl border border-destructive/30 bg-destructive/5 px-4 py-3">
          <p className="text-sm font-semibold text-destructive">Complete required fields to unlock Discover</p>
          <p className="mt-1 text-xs text-destructive/90">
            Still needed: {completenessStats.missingRequired.map((field) => field.label).join(", ")}
          </p>
        </div>
      )}

      <EditSection id="basics" title="Basic info">
        <Field label="Profile for" required missing={isMissing("profileFor")} error={fieldError(errors, "profileFor")}>
          <SearchableSelect
            value={data.profileFor || undefined}
            onValueChange={(v) => update({ profileFor: v })}
            options={[...PROFILE_FOR_OPTIONS]}
            placeholder="Who is this profile for?"
            searchPlaceholder="Search…"
            className={cn(isMissing("profileFor") && invalidCls)}
          />
        </Field>
        <Field label="Full name" required missing={isMissing("fullName")} error={fieldError(errors, "fullName")}>
          <Input
            value={data.fullName}
            onChange={(e) => update({ fullName: e.target.value })}
            className={cn(isMissing("fullName") && invalidCls)}
          />
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Gender" required missing={isMissing("gender")} error={fieldError(errors, "gender")}>
            <SearchableSelect
              value={data.gender || undefined}
              onValueChange={(v) => update({ gender: v })}
              options={["Male", "Female", "Other"]}
              placeholder="Select gender"
              searchPlaceholder="Search gender…"
              className={cn(isMissing("gender") && invalidCls)}
            />
          </Field>
          <Field label="Marital status" required missing={isMissing("maritalStatus")} error={fieldError(errors, "maritalStatus")}>
            <SearchableSelect
              value={data.maritalStatus || undefined}
              onValueChange={(v) =>
                update({
                  maritalStatus: v,
                  ...(v === "Divorced" || v === "Widowed"
                    ? {}
                    : { hasChildren: false, childrenCount: 0, childrenLivingWithMe: null }),
                })
              }
              options={MARITAL_STATUSES}
              placeholder="Select marital status"
              searchPlaceholder="Search status…"
              className={cn(isMissing("maritalStatus") && invalidCls)}
            />
          </Field>
        </div>
        <Field
          label="Date of birth"
          required
          missing={isMissing("dob")}
          error={fieldError(errors, "dobYear") || fieldError(errors, "dobDay")}
        >
          <DateOfBirthPicker
            dobDay={data.dobDay}
            dobMonth={data.dobMonth}
            dobYear={data.dobYear}
            onChange={(parts) => update(parts)}
            className={cn(isMissing("dob") && invalidCls)}
          />
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Height">
            <HeightInput value={data.height} onChange={(height) => update({ height })} />
          </Field>
          <Field label="Weight">
            <WeightInput value={data.weight} onChange={(weight) => update({ weight })} />
          </Field>
        </div>
        <Field label="Complexion">
          <SearchableSelect
            value={data.complexion || undefined}
            onValueChange={(v) => update({ complexion: v })}
            options={COMPLEXIONS}
            placeholder="Select complexion"
            searchPlaceholder="Search…"
          />
        </Field>
        <Field label="Disability (optional)">
          <Input value={data.disability} onChange={(e) => update({ disability: e.target.value })} placeholder="Leave blank if none" />
        </Field>
        <ChildrenFields
          maritalStatus={data.maritalStatus}
          hasChildren={data.hasChildren}
          childrenCount={data.childrenCount}
          childrenLivingWithMe={data.childrenLivingWithMe}
          errors={{
            hasChildren: fieldError(errors, "hasChildren"),
            childrenCount: fieldError(errors, "childrenCount"),
            childrenLivingWithMe: fieldError(errors, "childrenLivingWithMe"),
          }}
          onChange={(next) => update(next)}
        />
      </EditSection>

      <EditSection id="community" title="Community details">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Religion" required missing={isMissing("religion")} error={fieldError(errors, "religion")}>
            <SearchableSelect
              value={data.religion || undefined}
              onValueChange={(v) =>
                update({
                  religion: v,
                  caste: "",
                  communitySlug: "",
                  subcaste: "",
                  gotra: "",
                })
              }
              options={RELIGIONS}
              placeholder="Select religion"
              searchPlaceholder="Search religion…"
              className={cn(isMissing("religion") && invalidCls)}
            />
          </Field>

          <Field label="Mother tongue" required missing={isMissing("motherTongue")} error={fieldError(errors, "motherTongue")}>
            <SearchableSelect
              value={data.motherTongue || undefined}
              onValueChange={(v) => update({ motherTongue: v })}
              options={MOTHER_TONGUES}
              placeholder="Select language"
              searchPlaceholder="Search language…"
              className={cn(isMissing("motherTongue") && invalidCls)}
            />
          </Field>

          <Field label="Caste / community" required missing={isMissing("caste")} error={fieldError(errors, "caste")}>
            <SearchableSelect
              value={data.caste || undefined}
              onValueChange={(next) => {
                const match = findCommunityByLabel(next, data.religion)
                update({
                  caste: next,
                  communitySlug: match?.slug ?? "",
                  subcaste: next === data.caste ? data.subcaste : "",
                })
              }}
              options={getCommunityLabelsForReligion(data.religion)}
              placeholder={data.religion ? "Select caste / community…" : "Select religion first"}
              searchPlaceholder="Search caste…"
              emptyText="No matching community found."
              disabled={!data.religion}
              className={cn(isMissing("caste") && invalidCls)}
              allowCustom={false}
            />
          </Field>

          <Field label="Subcaste (optional)">
            <Input
              value={data.subcaste}
              onChange={(e) => update({ subcaste: e.target.value })}
              placeholder="Type subcaste if applicable"
              maxLength={100}
            />
          </Field>

          {(data.religion === "Hindu" || data.religion === "Jain") && (
            <Field label="Gotra (optional)" className="sm:col-span-2">
              <Input
                value={data.gotra}
                onChange={(e) => update({ gotra: e.target.value })}
                placeholder="Type gotra if applicable"
                maxLength={100}
              />
            </Field>
          )}
        </div>
      </EditSection>

      <EditSection id="career" title="Education & career">
        <EducationFields
          educationLevel={data.educationLevel}
          degree={data.degree}
          educationMissing={isMissing("education")}
          educationError={fieldError(errors, "educationLevel") || fieldError(errors, "education")}
          educationClassName={cn(isMissing("education") && invalidCls)}
          degreeClassName={cn(isMissing("education") && invalidCls)}
          onEducationChange={(value) =>
            update({
              educationLevel: value.educationLevel,
              degree: value.degree,
            })
          }
        />
        <Field label="College / university (optional)">
          <Input
            value={data.collegeName}
            onChange={(e) => update({ collegeName: e.target.value })}
            placeholder="e.g. Anna University, IIT Madras"
          />
        </Field>
        <Field label="Occupation" required missing={isMissing("occupation")} error={fieldError(errors, "employmentStatus") || fieldError(errors, "occupation")}>
          <OccupationSelect
            employmentStatus={data.employmentStatus}
            profession={data.profession}
            className={cn(isMissing("occupation") && invalidCls)}
            missing={isMissing("occupation")}
            onOccupationChange={(value) =>
              update({
                employmentStatus: value.employmentStatus,
                profession: value.profession,
              })
            }
          />
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Employer name (optional)">
            <Input
              value={data.companyName}
              onChange={(e) => update({ companyName: e.target.value })}
              placeholder="e.g. Deloitte, Infosys, Self-employed"
            />
          </Field>
          <Field label="Company sector (optional)">
            <SearchableSelect
              value={data.companySector || undefined}
              onValueChange={(v) => update({ companySector: v })}
              options={[...COMPANY_SECTORS]}
              placeholder="Select sector"
              searchPlaceholder="Search sector…"
            />
          </Field>
        </div>
        <Field label="Annual income" required missing={isMissing("annualIncome")} error={fieldError(errors, "annualIncome")}>
          <SearchableSelect
            value={data.annualIncome || undefined}
            onValueChange={(v) => update({ annualIncome: v })}
            options={INCOME_BANDS}
            placeholder="Select income band"
            searchPlaceholder="Search income…"
            className={cn(isMissing("annualIncome") && invalidCls)}
          />
        </Field>
      </EditSection>

      <EditSection id="family" title="Family details">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Family type">
            <SearchableSelect
              value={data.familyType || undefined}
              onValueChange={(v) => update({ familyType: v })}
              options={[...FAMILY_TYPES]}
              placeholder="Select family type"
            />
          </Field>
          <Field label="Family status">
            <SearchableSelect
              value={data.familyStatus || undefined}
              onValueChange={(v) => update({ familyStatus: v })}
              options={[...FAMILY_STATUS]}
              placeholder="Select family status"
            />
          </Field>
        </div>
        <Field label="Family values">
          <SearchableSelect
            value={data.familyValues || undefined}
            onValueChange={(v) => update({ familyValues: v })}
            options={[...FAMILY_VALUES]}
            placeholder="Select family values"
          />
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Father's occupation">
            <SearchableSelect
              value={data.fatherOccupation || undefined}
              onValueChange={(v) => update({ fatherOccupation: v })}
              options={[...PARENT_OCCUPATIONS]}
              placeholder="Select father's occupation"
            />
          </Field>
          <Field label="Mother's occupation">
            <SearchableSelect
              value={data.motherOccupation || undefined}
              onValueChange={(v) => update({ motherOccupation: v })}
              options={[...PARENT_OCCUPATIONS]}
              placeholder="Select mother's occupation"
            />
          </Field>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Brothers">
            <SearchableSelect
              value={String(data.brothersCount)}
              onValueChange={(v) =>
                update({
                  brothersCount: Number(v),
                  siblings: formatSiblings(Number(v), data.sistersCount),
                })
              }
              options={SIBLING_COUNTS.map((n) => ({
                value: String(n),
                label: n === 5 ? "5+" : String(n),
              }))}
              placeholder="Brothers"
            />
          </Field>
          <Field label="Sisters">
            <SearchableSelect
              value={String(data.sistersCount)}
              onValueChange={(v) =>
                update({
                  sistersCount: Number(v),
                  siblings: formatSiblings(data.brothersCount, Number(v)),
                })
              }
              options={SIBLING_COUNTS.map((n) => ({
                value: String(n),
                label: n === 5 ? "5+" : String(n),
              }))}
              placeholder="Sisters"
            />
          </Field>
        </div>
        <p className="text-xs text-muted-foreground">
          {formatSiblings(data.brothersCount, data.sistersCount)}
        </p>
      </EditSection>

      <EditSection id="location" title="Location">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Current city" required missing={isMissing("city")} error={fieldError(errors, "city")}>
            <CityAutocomplete
              city={data.city}
              state={data.state}
              citySlug={data.citySlug}
              onCityChange={({ city, state, citySlug }) =>
                update({ city, state, citySlug: citySlug ?? "" })
              }
              placeholder="Search city…"
              className={cn(isMissing("city") && invalidCls)}
            />
          </Field>
          <Field label="State">
            <Input value={data.state} readOnly placeholder="Auto-filled from city" />
          </Field>
        </div>
        <Field label="Willing to relocate">
          <SearchableSelect
            value={data.willingToRelocate || undefined}
            onValueChange={(v) => update({ willingToRelocate: v })}
            options={RELOCATE_OPTIONS}
            placeholder="Select option"
          />
        </Field>
      </EditSection>

      <EditSection id="about" title="About me">
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">Shown on your profile card.</p>
          <span className={cn("text-xs font-semibold", data.aboutMe.length > ABOUT_MAX - 30 ? "text-destructive" : "text-muted-foreground")}>
            {data.aboutMe.length} / {ABOUT_MAX}
          </span>
        </div>
        <textarea
          value={data.aboutMe}
          onChange={(e) => update({ aboutMe: e.target.value.slice(0, ABOUT_MAX) })}
          rows={4}
          maxLength={ABOUT_MAX}
          placeholder="Write a short bio. Mention your values, interests, and what you're looking for in a partner."
          className="w-full resize-none rounded-xl border-[1.5px] border-input bg-card px-4 py-3 text-sm transition-all placeholder:text-muted-foreground/60 focus-visible:border-primary focus-visible:outline-none focus-visible:shadow-[0_0_0_3px_rgba(124,21,53,0.10)]"
        />
      </EditSection>

      <EditSection id="lifestyle" title="Lifestyle">
        <p className="text-sm text-muted-foreground">Diet, habits, and interests shown on your profile.</p>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Diet" required missing={isMissing("diet")} error={fieldError(errors, "diet")}>
            <>
              <SearchableSelect
                value={data.diet || undefined}
                onValueChange={(v) => update({ diet: v })}
                options={DIETS}
                placeholder="Select diet"
                searchPlaceholder="Search…"
                allowCustom={false}
                className={cn(isMissing("diet") && invalidCls)}
              />
              {data.diet && (
                <button type="button" className="text-xs text-muted-foreground hover:text-primary" onClick={() => update({ diet: "" })}>
                  Clear
                </button>
              )}
            </>
          </Field>
          <Field label="Smoking">
            <>
              <SearchableSelect
                value={data.smoking || undefined}
                onValueChange={(v) => update({ smoking: v })}
                options={[...HABIT_FREQUENCY]}
                placeholder="Select"
                searchPlaceholder="Search…"
                allowCustom={false}
              />
              {data.smoking && (
                <button type="button" className="text-xs text-muted-foreground hover:text-primary" onClick={() => update({ smoking: "" })}>
                  Clear
                </button>
              )}
            </>
          </Field>
        </div>
        <Field label="Drinking">
          <>
            <SearchableSelect
              value={data.alcohol || undefined}
              onValueChange={(v) => update({ alcohol: v })}
              options={[...HABIT_FREQUENCY]}
              placeholder="Select"
              searchPlaceholder="Search…"
              allowCustom={false}
            />
            {data.alcohol && (
              <button type="button" className="text-xs text-muted-foreground hover:text-primary" onClick={() => update({ alcohol: "" })}>
                Clear
              </button>
            )}
          </>
        </Field>
        <Field label="Interests" error={fieldError(errors, "interests")}>
          <MultiSelect
            values={data.interests || []}
            onValuesChange={(values) => update({ interests: values })}
            options={[...INTERESTS]}
            placeholder="Pick up to 7"
            searchPlaceholder="Search interests…"
          />
        </Field>
      </EditSection>

      <EditSection id="preferences" title="Partner preferences">
        <p className="text-sm text-muted-foreground">Changes affect your daily match results immediately.</p>
        <div className="grid grid-cols-2 gap-4">
          <Field label="Min age">
            <Input type="number" value={data.prefAgeMin} onChange={(e) => update({ prefAgeMin: Number(e.target.value) || 18 })} />
          </Field>
          <Field label="Max age">
            <Input type="number" value={data.prefAgeMax} onChange={(e) => update({ prefAgeMax: Number(e.target.value) || 40 })} />
          </Field>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <Field label="Min height (cm)">
            <Input
              type="number"
              value={data.prefHeightMinCm ?? ""}
              onChange={(e) =>
                update({ prefHeightMinCm: e.target.value === "" ? undefined : Number(e.target.value) })
              }
              placeholder="e.g. 150"
            />
          </Field>
          <Field label="Max height (cm)">
            <Input
              type="number"
              value={data.prefHeightMaxCm ?? ""}
              onChange={(e) =>
                update({ prefHeightMaxCm: e.target.value === "" ? undefined : Number(e.target.value) })
              }
              placeholder="e.g. 185"
            />
          </Field>
        </div>
        <Field label="Preferred religions" required error={fieldError(errors, "prefReligion")}>
          <MultiSelect
            values={data.prefReligion || []}
            onValuesChange={(values) => update({ prefReligion: values })}
            options={RELIGIONS}
            placeholder="Select religions"
            searchPlaceholder="Search religions…"
          />
        </Field>
        <Field label="Preferred marital status">
          <MultiSelect
            values={data.prefMaritalStatuses || []}
            onValuesChange={(values) => update({ prefMaritalStatuses: values })}
            options={[...MARITAL_STATUSES]}
            placeholder="Any marital status"
            searchPlaceholder="Search…"
          />
        </Field>
        <Field label="Preferred communities">
          <MultiSelect
            values={data.prefCastes || []}
            onValuesChange={(values) => update({ prefCastes: values })}
            options={communityOptions}
            placeholder="Any community"
            searchPlaceholder="Search communities…"
          />
        </Field>
        <Field label="Preferred mother tongues">
          <MultiSelect
            values={data.prefMotherTongues || []}
            onValuesChange={(values) => update({ prefMotherTongues: values })}
            options={MOTHER_TONGUES}
            placeholder="Any mother tongue"
            searchPlaceholder="Search languages…"
          />
        </Field>
        <Field label="Minimum education">
          <SearchableSelect
            value={data.prefMinEducation || undefined}
            onValueChange={(v) => update({ prefMinEducation: v })}
            options={[...EDUCATION_LEVELS]}
            placeholder="No preference"
            searchPlaceholder="Search education…"
          />
        </Field>
        <Field label="Preferred locations">
          <Input
            value={(data.prefLocations || []).join(", ")}
            onChange={(e) =>
              update({
                prefLocations: e.target.value
                  .split(",")
                  .map((s) => s.trim())
                  .filter(Boolean),
              })
            }
            placeholder="e.g. Chennai, Bengaluru"
          />
        </Field>
      </EditSection>

      <section
        id="photos"
        className={cn(
          "space-y-3 rounded-2xl border bg-card p-5 shadow-sm",
          isMissing("photos") ? "border-destructive ring-1 ring-destructive/30" : "border-border"
        )}
      >
        <div className="flex items-center justify-between">
          <h2 className={cn("font-serif text-lg font-bold", isMissing("photos") && "text-destructive")}>
            Photos <span className="text-destructive">*</span>
          </h2>
          <span className="text-xs font-semibold text-muted-foreground">{photoItems.length} / {MAX_PHOTOS}</span>
        </div>
        <p className={cn("text-sm", isMissing("photos") ? "text-destructive" : "text-muted-foreground")}>
          {isMissing("photos")
            ? "At least one profile photo is required to unlock Discover."
            : "First photo is your primary. Drag to reorder. Primary photo is reviewed by admin within 24 hours."}
        </p>

        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          onChange={(e) => onFiles(e.target.files)}
        />

        {photoItems.length === 0 ? (
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            className={cn(
              "flex w-full flex-col items-center gap-2 rounded-2xl border border-dashed py-10 text-sm hover:border-primary/40 hover:text-primary",
              isMissing("photos")
                ? "border-destructive/60 bg-destructive/5 text-destructive"
                : "border-border text-muted-foreground"
            )}
          >
            <Camera className="h-8 w-8" />
            Upload primary photo
          </button>
        ) : (
          <div className="grid grid-cols-3 gap-3 sm:grid-cols-4">
            {photoItems.map((photo, i) => (
              <div
                key={photo.id}
                draggable={photo.canReorder}
                onDragStart={() => setDragIndex(i)}
                onDragOver={(e) => e.preventDefault()}
                onDrop={() => {
                  if (dragIndex !== null) reorder(dragIndex, i)
                  setDragIndex(null)
                }}
                className="group relative aspect-[3/4] overflow-hidden rounded-xl border-2 border-border bg-muted"
              >
                <Image src={getMediaUrl(photo.url)} alt={`Photo ${i + 1}`} fill className="object-cover" sizes="120px" />
                {i === 0 && (
                  <span className="absolute left-1 top-1 rounded-full bg-secondary px-1.5 py-0.5 text-[9px] font-bold text-secondary-foreground">
                    <Star className="mr-0.5 inline h-2.5 w-2.5 fill-current" />Primary
                  </span>
                )}
                <div className="absolute inset-0 flex flex-col justify-between bg-black/0 opacity-0 transition-opacity group-hover:bg-black/40 group-hover:opacity-100">
                  <div className="flex justify-end p-1">
                    <button
                      type="button"
                      onClick={() => deletePhoto(i)}
                      className="rounded-full bg-black/60 p-1 text-white"
                      aria-label="Delete photo"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                  {i !== 0 && (
                    <div className="flex justify-center p-1">
                      <button
                        type="button"
                        onClick={() => setPrimary(i)}
                        className="rounded-full bg-primary px-2 py-1 text-[10px] font-semibold text-primary-foreground"
                      >
                        Set primary
                      </button>
                    </div>
                  )}
                </div>
                {photo.canReorder && (
                  <span className="absolute bottom-1 left-1 cursor-grab rounded bg-black/40 px-1 text-white opacity-0 group-hover:opacity-100">
                    <GripVertical className="h-3 w-3" />
                  </span>
                )}
              </div>
            ))}
            {photoItems.length < MAX_PHOTOS && (
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                className="flex aspect-[3/4] items-center justify-center rounded-xl border border-dashed border-border text-muted-foreground hover:border-primary/40 hover:text-primary"
              >
                <Upload className="h-6 w-6" />
                <span className="sr-only">Add photo</span>
              </button>
            )}
          </div>
        )}

        <Field label="Photo privacy setting">
          <Select value={data.photoPrivacy} onValueChange={(v) => update({ photoPrivacy: v })}>
            <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
            <SelectContent>
              {PHOTO_PRIVACY.map((p) => (
                <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
      </section>

      <EditSection id="horoscope" title="Horoscope details">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Star / nakshatra" required missing={isMissing("star")} error={fieldError(errors, "star")}>
            <SearchableSelect
              value={data.star || undefined}
              onValueChange={(v) => update({ star: v })}
              options={STARS}
              placeholder="Select star"
              searchPlaceholder="Search nakshatra…"
              className={cn(isMissing("star") && invalidCls)}
            />
          </Field>
          <Field label="Rashi" required missing={isMissing("rashi")} error={fieldError(errors, "rashi")}>
            <SearchableSelect
              value={data.rashi || undefined}
              onValueChange={(v) => update({ rashi: v })}
              options={RASHIS.map((r) => ({ value: r.value, label: r.label }))}
              placeholder="Select rashi"
              searchPlaceholder="Search rashi…"
              className={cn(isMissing("rashi") && invalidCls)}
            />
          </Field>
        </div>
        <Field label="Manglik status" required missing={isMissing("manglik")} error={fieldError(errors, "manglik")}>
          <SearchableSelect
            value={data.manglik || undefined}
            onValueChange={(v) => update({ manglik: v })}
            options={MANGLIK_OPTIONS}
            placeholder="Select Manglik status"
            searchPlaceholder="Search…"
            className={cn(isMissing("manglik") && invalidCls)}
          />
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Birth time" required missing={isMissing("birthTime")} error={fieldError(errors, "birthTime")}>
            <BirthTimeInput
              value={data.birthTime}
              onChange={(birthTime) => update({ birthTime })}
              className={cn(isMissing("birthTime") && invalidCls)}
            />
          </Field>
          <Field label="Birth place" required missing={isMissing("birthPlace")} error={fieldError(errors, "birthPlace")}>
            <Input
              value={data.birthPlace}
              onChange={(e) => update({ birthPlace: e.target.value })}
              placeholder="e.g. Chennai, TN"
              className={cn(isMissing("birthPlace") && invalidCls)}
            />
          </Field>
        </div>

        <input
          ref={horoscopeRef}
          type="file"
          accept="application/pdf"
          className="hidden"
          onChange={(e) => onHoroscopeFile(e.target.files)}
        />
        <div className="rounded-2xl border border-dashed border-border bg-muted/20 p-4">
          <div className="flex items-center gap-2">
            <FileText className="h-4 w-4 text-muted-foreground" />
            <span className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
              Horoscope PDF · optional
            </span>
          </div>
          {data.horoscopeName ? (
            <div className="mt-3 space-y-3">
              <div className="flex min-w-0 items-center gap-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                  <FileText className="h-4 w-4" />
                </div>
                <p className="min-w-0 flex-1 truncate text-sm font-medium" title={data.horoscopeName}>
                  {data.horoscopeName}
                </p>
                {data.horoscopeSize ? (
                  <span className="shrink-0 text-xs text-muted-foreground">
                    {(data.horoscopeSize / 1024 / 1024).toFixed(1)} MB
                  </span>
                ) : null}
              </div>
              {pdfPreviewUrl && (
                <div className="flex flex-wrap gap-2">
                  <Dialog>
                    <DialogTrigger asChild>
                      <Button type="button" variant="soft" size="sm">
                        <Eye className="mr-1.5 h-4 w-4" />
                        Preview
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="max-h-[90vh] w-[min(96vw,720px)] max-w-none p-0">
                      <DialogHeader className="border-b border-border px-4 py-3">
                        <DialogTitle>{data.horoscopeName}</DialogTitle>
                      </DialogHeader>
                      <iframe
                        src={pdfPreviewUrl}
                        title={data.horoscopeName}
                        className="h-[min(70vh,640px)] w-full border-0"
                      />
                    </DialogContent>
                  </Dialog>
                  <Button asChild variant="outline" size="sm">
                    <Link href={pdfPreviewUrl} target="_blank" rel="noopener noreferrer">
                      <ExternalLink className="mr-1.5 h-4 w-4" />
                      Open
                    </Link>
                  </Button>
                  <Button type="button" variant="ghost" size="sm" onClick={() => horoscopeRef.current?.click()}>
                    <Upload className="mr-1.5 h-4 w-4" />
                    Replace
                  </Button>
                </div>
              )}
            </div>
          ) : (
            <button
              type="button"
              onClick={() => horoscopeRef.current?.click()}
              className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-border py-5 text-sm text-muted-foreground transition-colors hover:border-primary/40 hover:text-primary"
            >
              <Upload className="h-4 w-4" />
              Upload horoscope PDF
            </button>
          )}
        </div>
      </EditSection>

      <div className="sticky bottom-20 z-20 flex gap-3 bg-background/90 py-3 backdrop-blur md:static md:bottom-auto md:bg-transparent md:py-0">
        <Button variant="outline" className="flex-1" onClick={() => router.push("/profile")}>
          Cancel
        </Button>
        <Button className="flex-[1.4]" onClick={onSave} disabled={updateMutation.isPending}>
          {saved ? (
            <>
              <Check className="mr-1.5 h-4 w-4" /> Saved
            </>
          ) : updateMutation.isPending ? (
            "Saving…"
          ) : (
            "Save changes"
          )}
        </Button>
      </div>
    </main>
  )
}
