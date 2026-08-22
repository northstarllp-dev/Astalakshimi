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
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
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
  useReorderPhotosMutation
} from "@/hooks/queries"
import { profileEditSchema } from "@/lib/validation"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { ArrowLeft, Camera, Check, GripVertical, Star, Trash2, Upload, X } from "lucide-react"
import { cn } from "@/lib/utils"

const ABOUT_MAX = 300
const MAX_PHOTOS = 10

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">{label}</Label>
      {children}
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
  const [saved, setSaved] = React.useState(false)
  const [dragIndex, setDragIndex] = React.useState<number | null>(null)
  const fileRef = React.useRef<HTMLInputElement>(null)

  const update = (fields: Partial<SignupData>) => {
    for (const [key, value] of Object.entries(fields)) {
      form.setValue(key as keyof SignupData, value as never, { shouldDirty: true })
    }
  }

  const onSave = form.handleSubmit((values) => {
    const dirtyFields = form.formState.dirtyFields;
    const delta: any = {};
    for (const key of Object.keys(dirtyFields)) {
      if (key !== 'photos' && key !== 'photoS3Keys' && key !== 'photoObjects') {
        delta[key] = (values as any)[key];
      }
    }
    // Also include custom controlled fields if needed, but RHF sets them as dirty anyway.

    updateMutation.mutate(delta, {
      onSuccess: () => {
        setSaved(true)
        window.setTimeout(() => router.push("/profile"), 600)
      },
    })
  })

  const onFiles = async (files: FileList | null) => {
    if (!files) return
    const remaining = MAX_PHOTOS - (data.photoObjects?.length || 0)
    const filesToUpload = Array.from(files).slice(0, remaining);
    
    for (const file of filesToUpload) {
       try {
         const { uploadUrl, s3Key } = await apiClient.media.getUploadUrl({
           purpose: "profile_photo",
           contentType: file.type || "image/jpeg",
           fileSize: file.size,
         })
         
         await apiClient.media.uploadFileToS3(uploadUrl, file, file.type || "image/jpeg")
         await addPhotoMutation.mutateAsync(s3Key)
       } catch (err) {
         console.error("[Media] S3 upload failed:", err)
         alert("Failed to upload photo. Please check your AWS credentials or network.")
       }
    }
  }

  const setPrimary = async (index: number) => {
    await reorder(index, 0);
  }

  const deletePhoto = async (index: number) => {
    const photoId = data.photoObjects?.[index]?.id;
    if (photoId) {
      await deletePhotoMutation.mutateAsync(photoId);
    }
  }

  const reorder = async (from: number, to: number) => {
    if (from === to) return
    const next = [...(data.photoObjects || [])]
    const [moved] = next.splice(from, 1)
    next.splice(to, 0, moved)
    
    const photoIds = next.map(p => p.id);
    await reorderPhotosMutation.mutateAsync(photoIds);
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
          <p className="text-sm text-muted-foreground">Changes save on this device for now</p>
        </div>
      </div>

      <EditSection id="basics" title="Basic info">
        <Field label="Full name">
          <Input value={data.fullName} onChange={(e) => update({ fullName: e.target.value })} />
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Gender">
            <Select value={data.gender || undefined} onValueChange={(v) => update({ gender: v })}>
              <SelectTrigger className="w-full"><SelectValue placeholder="Select gender" /></SelectTrigger>
              <SelectContent>
                {["Male", "Female", "Other"].map((g) => (
                  <SelectItem key={g} value={g}>{g}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <Field label="Marital status">
            <Select value={data.maritalStatus || undefined} onValueChange={(v) => update({ maritalStatus: v })}>
              <SelectTrigger className="w-full"><SelectValue placeholder="Select marital status" /></SelectTrigger>
              <SelectContent>
                {MARITAL_STATUSES.map((s: any) => (
                  <SelectItem key={s} value={s}>{s}</SelectItem>
                ))}
              </SelectContent>
            </Select>
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
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Height">
            <Input value={data.height} onChange={(e) => update({ height: e.target.value })} placeholder="e.g. 5'4&quot;" />
          </Field>
          <Field label="Weight">
            <Input value={data.weight} onChange={(e) => update({ weight: e.target.value })} placeholder="e.g. 58 kg" />
          </Field>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Complexion">
            <Select value={data.complexion || undefined} onValueChange={(v) => update({ complexion: v })}>
              <SelectTrigger className="w-full"><SelectValue placeholder="Select complexion" /></SelectTrigger>
              <SelectContent>
                {COMPLEXIONS.map((c: any) => (
                  <SelectItem key={c} value={c}>{c}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <Field label="Diet">
            <Select value={data.diet || undefined} onValueChange={(v) => update({ diet: v })}>
              <SelectTrigger className="w-full"><SelectValue placeholder="Select diet" /></SelectTrigger>
              <SelectContent>
                {DIETS.map((d) => (
                  <SelectItem key={d} value={d}>{d}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
        </div>
        <Field label="Disability (optional)">
          <Input value={data.disability} onChange={(e) => update({ disability: e.target.value })} placeholder="Leave blank if none" />
        </Field>
      </EditSection>

      <EditSection id="community" title="Community details">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Religion">
            <Select value={data.religion || undefined} onValueChange={(v) => update({ religion: v })}>
              <SelectTrigger className="w-full"><SelectValue placeholder="Select religion" /></SelectTrigger>
              <SelectContent>
                {RELIGIONS.map((r) => (
                  <SelectItem key={r} value={r}>{r}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <Field label="Caste / community">
            <Input value={data.caste} onChange={(e) => update({ caste: e.target.value })} placeholder="e.g. Iyer" />
          </Field>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Subcaste">
            <Input value={data.subcaste} onChange={(e) => update({ subcaste: e.target.value })} placeholder="e.g. Vadama" />
          </Field>
          <Field label="Gotra">
            <Input value={data.gotra} onChange={(e) => update({ gotra: e.target.value })} placeholder="e.g. Bharadwaja" />
          </Field>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Star / nakshatra">
            <Select value={data.star || undefined} onValueChange={(v) => update({ star: v })}>
              <SelectTrigger className="w-full"><SelectValue placeholder="Select star" /></SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  <SelectLabel>27 Nakshatras</SelectLabel>
                  {STARS.map((s: any) => (
                    <SelectItem key={s} value={s}>{s}</SelectItem>
                  ))}
                </SelectGroup>
              </SelectContent>
            </Select>
          </Field>
          <Field label="Rashi">
            <Select value={data.rashi || undefined} onValueChange={(v) => update({ rashi: v })}>
              <SelectTrigger className="w-full"><SelectValue placeholder="Select rashi" /></SelectTrigger>
              <SelectContent>
                {RASHIS.map((r) => (
                  <SelectItem key={r} value={r}>{r}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
        </div>
        <Field label="Manglik status">
          <Select value={data.manglik || undefined} onValueChange={(v) => update({ manglik: v })}>
            <SelectTrigger className="w-full"><SelectValue placeholder="Select Manglik status" /></SelectTrigger>
            <SelectContent>
              {MANGLIK_OPTIONS.map((m: any) => (
                <SelectItem key={m} value={m}>{m}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
        <Field label="Mother tongue">
          <Select value={data.motherTongue || undefined} onValueChange={(v) => update({ motherTongue: v })}>
            <SelectTrigger className="w-full"><SelectValue placeholder="Select language" /></SelectTrigger>
            <SelectContent>
              {MOTHER_TONGUES.map((t) => (
                <SelectItem key={t} value={t}>{t}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
      </EditSection>

      <EditSection id="career" title="Education & career">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Highest education">
            <Input
              value={data.otherEducation || data.education}
              onChange={(e) => update({ education: e.target.value, otherEducation: "" })}
              placeholder="e.g. B.Tech"
            />
          </Field>
          <Field label="Specialization (optional)">
            <Input
              value={data.educationStream || ""}
              onChange={(e) => update({ educationStream: e.target.value })}
              placeholder="e.g. Computer Science"
            />
          </Field>
        </div>
        <Field label="Occupation">
          <Input
            value={data.otherOccupation || data.occupation}
            onChange={(e) => update({ occupation: e.target.value, otherOccupation: "" })}
            placeholder="e.g. Software Engineer"
          />
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Employer name (optional)">
            <Input value={data.companyName} onChange={(e) => update({ companyName: e.target.value })} placeholder="e.g. Infosys" />
          </Field>
          <Field label="Annual income">
            <Select value={data.annualIncome || undefined} onValueChange={(v) => update({ annualIncome: v })}>
              <SelectTrigger className="w-full"><SelectValue placeholder="Select income band" /></SelectTrigger>
              <SelectContent>
                {INCOME_BANDS.map((band) => (
                  <SelectItem key={band} value={band}>{band}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
        </div>
      </EditSection>

      <EditSection id="family" title="Family details">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Family type">
            <Select value={data.familyType || undefined} onValueChange={(v) => update({ familyType: v })}>
              <SelectTrigger className="w-full"><SelectValue placeholder="Select family type" /></SelectTrigger>
              <SelectContent>
                {FAMILY_TYPES.map((t) => (
                  <SelectItem key={t} value={t}>{t}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <Field label="Family status">
            <Select value={data.familyStatus || undefined} onValueChange={(v) => update({ familyStatus: v })}>
              <SelectTrigger className="w-full"><SelectValue placeholder="Select family status" /></SelectTrigger>
              <SelectContent>
                {FAMILY_STATUS.map((s: any) => (
                  <SelectItem key={s} value={s}>{s}</SelectItem>
                ))}
              </SelectContent>
            </Select>
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
          <Field label="Current city">
            <Input value={data.city} onChange={(e) => update({ city: e.target.value })} placeholder="e.g. Chennai" />
          </Field>
          <Field label="State">
            <Input value={data.state} onChange={(e) => update({ state: e.target.value })} placeholder="e.g. Tamil Nadu" />
          </Field>
        </div>
        <Field label="Willing to relocate">
          <Select value={data.willingToRelocate || undefined} onValueChange={(v) => update({ willingToRelocate: v })}>
            <SelectTrigger className="w-full"><SelectValue placeholder="Select option" /></SelectTrigger>
            <SelectContent>
              {RELOCATE_OPTIONS.map((r) => (
                <SelectItem key={r} value={r}>{r}</SelectItem>
              ))}
            </SelectContent>
          </Select>
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
        <Field label="Preferred religions (comma separated)">
          <Input
            value={data.prefReligion.join(", ")}
            onChange={(e) => update({ prefReligion: e.target.value.split(",").map((s: any) => s.trim()).filter(Boolean) })}
          />
        </Field>
      </EditSection>

      <section id="photos" className="space-y-3 rounded-2xl border border-border bg-card p-5 shadow-sm">
        <div className="flex items-center justify-between">
          <h2 className="font-serif text-lg font-bold">Photos</h2>
          <span className="text-xs font-semibold text-muted-foreground">{(profileQuery.data?.photoObjects?.length || 0)} / {MAX_PHOTOS}</span>
        </div>
        <p className="text-sm text-muted-foreground">
          First photo is your primary. Drag to reorder. Primary photo is reviewed by admin within 24 hours.
        </p>

        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          onChange={(e) => onFiles(e.target.files)}
        />

        {!(profileQuery.data?.photoObjects?.length) ? (
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            className="flex w-full flex-col items-center gap-2 rounded-2xl border border-dashed border-border py-10 text-sm text-muted-foreground hover:border-primary/40 hover:text-primary"
          >
            <Camera className="h-8 w-8" />
            Upload primary photo
          </button>
        ) : (
          <div className="grid grid-cols-3 gap-3 sm:grid-cols-4">
            {profileQuery.data.photoObjects.map((photo: any, i: number) => (
              <div
                key={photo.id || i}
                draggable
                onDragStart={() => setDragIndex(i)}
                onDragOver={(e) => e.preventDefault()}
                onDrop={() => {
                  if (dragIndex !== null) reorder(dragIndex, i)
                  setDragIndex(null)
                }}
                className="group relative aspect-[3/4] overflow-hidden rounded-xl border-2 border-border bg-muted"
              >
                <Image src={getMediaUrl(photo.url || photo.s3Key)} alt={`Photo ${i + 1}`} fill className="object-cover" sizes="120px" />
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
                <span className="absolute bottom-1 left-1 cursor-grab rounded bg-black/40 px-1 text-white opacity-0 group-hover:opacity-100">
                  <GripVertical className="h-3 w-3" />
                </span>
              </div>
            ))}
            {profileQuery.data.photoObjects.length < MAX_PHOTOS && (
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
        <p className="text-sm text-muted-foreground">
          {data.horoscopeName ? `Uploaded: ${data.horoscopeName}` : "No horoscope PDF yet."}
        </p>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Birth time">
            <Input value={data.birthTime} onChange={(e) => update({ birthTime: e.target.value })} placeholder="e.g. 08:30 AM" />
          </Field>
          <Field label="Birth place">
            <Input value={data.birthPlace} onChange={(e) => update({ birthPlace: e.target.value })} placeholder="e.g. Chennai, TN" />
          </Field>
        </div>
        <Field label="Horoscope PDF file name (demo)">
          <Input
            value={data.horoscopeName}
            onChange={(e) => update({ horoscopeName: e.target.value, horoscopeSize: e.target.value ? 120000 : 0 })}
            placeholder="my-jathagam.pdf"
          />
        </Field>
      </EditSection>

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
