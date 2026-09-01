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
import { CommunityFields } from "@/components/profile/community-fields"
import {
  emptySignupData,
  type SignupData,
  COMPLEXIONS,
  DIETS,
  MARITAL_STATUSES,
  RELIGIONS,
  MOTHER_TONGUES,
  FAMILY_TYPES,
  FAMILY_STATUS,
  RELOCATE_OPTIONS,
  MANGLIK_OPTIONS,
  PHOTO_PRIVACY,
  INCOME_BANDS,
  STARS,
  RASHIS,
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

const ABOUT_MAX = 300
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
  children,
}: {
  label: string
  required?: boolean
  missing?: boolean
  error?: string
  children: React.ReactNode
}) {
  return (
    <div className="space-y-1.5">
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
  caste: "#community",
  subcaste: "#community",
  gotra: "#community",
  religion: "#community",
  motherTongue: "#community",
  educationId: "#career",
  occupationId: "#career",
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

  const form = useForm({
    resolver: zodResolver(profileEditSchema),
    values: profileQuery.data ?? emptySignupData(),
  })
  const data = form.watch() as SignupData
  const { errors } = form.formState
  const completenessStats = React.useMemo(() => getProfileCompletenessStats(data), [data])
  const missingIds = React.useMemo(() => getMissingRequiredFieldIds(data), [data])
  const isMissing = React.useCallback((id: string) => missingIds.has(id), [missingIds])
  const invalidCls = REQUIRED_FIELD_INVALID_CLASS
  const [saved, setSaved] = React.useState(false)
  const [dragIndex, setDragIndex] = React.useState<number | null>(null)
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
      const dirtyFields = form.formState.dirtyFields
      const delta: Record<string, unknown> = {}
      for (const key of Object.keys(dirtyFields)) {
        if (key !== "photos" && key !== "photoS3Keys" && key !== "photoObjects") {
          delta[key] = (values as Record<string, unknown>)[key]
        }
      }

      if (Object.keys(delta).length === 0) {
        alert("No changes to save.")
        return
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
        const { s3Key } = await apiClient.media.uploadMediaFile(file, "profile_photo")
        await addPhotoMutation.mutateAsync(s3Key)
      } catch (err) {
        console.error("[Media] Upload failed:", err)
        alert("Failed to upload photo. Please try again.")
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
              onValueChange={(v) => update({ maritalStatus: v })}
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
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Complexion">
            <SearchableSelect
              value={data.complexion || undefined}
              onValueChange={(v) => update({ complexion: v })}
              options={COMPLEXIONS}
              placeholder="Select complexion"
              searchPlaceholder="Search…"
            />
          </Field>
          <Field label="Diet">
            <SearchableSelect
              value={data.diet || undefined}
              onValueChange={(v) => update({ diet: v })}
              options={DIETS}
              placeholder="Select diet"
              searchPlaceholder="Search…"
            />
          </Field>
        </div>
        <Field label="Disability (optional)">
          <Input value={data.disability} onChange={(e) => update({ disability: e.target.value })} placeholder="Leave blank if none" />
        </Field>
      </EditSection>

      <EditSection id="community" title="Community details">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Religion" required missing={isMissing("religion")} error={fieldError(errors, "religion")}>
            <SearchableSelect
              value={data.religion || undefined}
              onValueChange={(v) => update({ religion: v })}
              options={RELIGIONS}
              placeholder="Select religion"
              searchPlaceholder="Search religion…"
              className={cn(isMissing("religion") && invalidCls)}
            />
          </Field>
          <Field label="Caste / community" required missing={isMissing("caste")} error={fieldError(errors, "caste")}>
            <CommunityFields
              religion={data.religion}
              caste={data.caste}
              subcaste={data.subcaste}
              gotra={data.gotra}
              onChange={(value) => update(value)}
              casteMissing={isMissing("caste")}
              casteClassName={cn(isMissing("caste") && invalidCls)}
            />
          </Field>
        </div>
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
      </EditSection>

      <EditSection id="career" title="Education & career">
        <EducationFields
          educationId={data.educationId}
          specializationId={data.specializationId}
          otherEducation={data.otherEducation || (!data.educationId ? data.education || data.degree || "" : "")}
          educationStream={data.educationStream}
          educationMissing={isMissing("education")}
          educationError={fieldError(errors, "educationId") || fieldError(errors, "education")}
          educationClassName={cn(isMissing("education") && invalidCls)}
          onEducationChange={(value) =>
            update({
              educationId: value.educationId,
              education: value.otherEducation || value.education,
              degree: value.otherEducation || value.education,
              specializationId: value.specializationId,
              educationStream: value.educationStream,
              otherEducation: value.otherEducation,
            })
          }
        />
        <Field label="Occupation" required missing={isMissing("occupation")} error={fieldError(errors, "occupationId") || fieldError(errors, "occupation")}>
          <OccupationSelect
            occupationId={data.occupationId}
            className={cn(isMissing("occupation") && invalidCls)}
            onOccupationChange={(value) =>
              update({
                occupationId: value.occupationId,
                occupation: value.occupation,
                profession: value.profession,
                otherOccupation: "",
              })
            }
          />
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Employer name (optional)">
            <Input
              value={data.companyName}
              onChange={(e) => update({ companyName: e.target.value, companyId: null })}
              placeholder="e.g. Deloitte, Infosys, Self-employed"
            />
          </Field>
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
        </div>
      </EditSection>

      <EditSection id="family" title="Family details">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Family type">
            <SearchableSelect
              value={data.familyType || undefined}
              onValueChange={(v) => update({ familyType: v })}
              options={FAMILY_TYPES}
              placeholder="Select family type"
            />
          </Field>
          <Field label="Family status">
            <SearchableSelect
              value={data.familyStatus || undefined}
              onValueChange={(v) => update({ familyStatus: v })}
              options={FAMILY_STATUS}
              placeholder="Select family status"
            />
          </Field>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Father's occupation">
            <Input value={data.fatherOccupation} onChange={(e) => update({ fatherOccupation: e.target.value })} placeholder="e.g. Retired banker" />
          </Field>
          <Field label="Mother's occupation">
            <Input value={data.motherOccupation} onChange={(e) => update({ motherOccupation: e.target.value })} placeholder="e.g. Homemaker" />
          </Field>
        </div>
        <Field label="Number of siblings">
          <Input value={data.siblings} onChange={(e) => update({ siblings: e.target.value })} placeholder="e.g. 1 brother, 1 sister" />
        </Field>
      </EditSection>

      <EditSection id="location" title="Location">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Current city" required missing={isMissing("city")} error={fieldError(errors, "city")}>
            <CityAutocomplete
              city={data.city}
              state={data.state}
              onCityChange={({ city, state }) => update({ city, state })}
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
        <Field label="Preferred religions" required error={fieldError(errors, "prefReligion")}>
          <MultiSelect
            values={data.prefReligion}
            onValuesChange={(values) => update({ prefReligion: values })}
            options={RELIGIONS}
            placeholder="Select religions"
            searchPlaceholder="Search religions…"
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
                <Image src={getMediaUrl(photo.url)} alt={`Photo ${i + 1}`} fill className="object-cover" sizes="120px" unoptimized />
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
        {data.horoscopeName ? (
          <div className="rounded-xl border border-border bg-muted/30 p-4">
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                <FileText className="h-5 w-5" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate font-semibold">{data.horoscopeName}</p>
                <p className="text-xs text-muted-foreground">
                  {data.horoscopeSize ? `${(data.horoscopeSize / 1024 / 1024).toFixed(1)} MB · PDF` : "PDF uploaded"}
                </p>
              </div>
            </div>
            {pdfPreviewUrl && (
              <div className="mt-4 flex flex-wrap gap-2">
                <Dialog>
                  <DialogTrigger asChild>
                    <Button type="button" variant="soft" size="sm">
                      <Eye className="mr-1.5 h-4 w-4" />
                      Preview PDF
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
                <Link
                  href={pdfPreviewUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex h-9 items-center rounded-full border-2 border-border bg-card px-4 text-xs font-semibold hover:border-primary/30 hover:text-primary"
                >
                  <ExternalLink className="mr-1.5 h-4 w-4" />
                  Open in new tab
                </Link>
              </div>
            )}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">No horoscope PDF yet.</p>
        )}

        <input
          ref={horoscopeRef}
          type="file"
          accept="application/pdf"
          className="hidden"
          onChange={(e) => onHoroscopeFile(e.target.files)}
        />

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
        <Button type="button" variant="outline" onClick={() => horoscopeRef.current?.click()}>
          <Upload className="mr-1.5 h-4 w-4" />
          {data.horoscopeName ? "Replace horoscope PDF (optional)" : "Upload horoscope PDF (optional)"}
        </Button>
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
