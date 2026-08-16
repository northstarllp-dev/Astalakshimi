"use client"

import * as React from "react"
import { Camera, CheckCircle2, Clock3, FileText, IdCard, ShieldCheck, Upload, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { StepHeading, TapCard } from "@/components/signup/shared"
import { cn } from "@/lib/utils"
import type { SignupData, VerificationMethod } from "@/lib/profile-store"
import { VERIFICATION_SLA_HOURS } from "@/lib/profile-store"

const MAX_PHOTOS = 6
const MAX_IMAGE_MB = 5
const MAX_PDF_MB = 10
const IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp", "image/heic"]
const ID_TYPES = ["Aadhaar", "PAN card", "Passport", "Driving licence", "Voter ID"]

function readFileAsDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result))
    reader.onerror = () => reject(new Error("Could not read file"))
    reader.readAsDataURL(file)
  })
}

function validateImage(file: File) {
  if (!IMAGE_TYPES.includes(file.type) && !file.type.startsWith("image/")) {
    return "Please choose a JPG, PNG, or WEBP photo."
  }
  if (file.size > MAX_IMAGE_MB * 1024 * 1024) {
    return `Each photo must be under ${MAX_IMAGE_MB} MB.`
  }
  return null
}

export function Step6Verify({
  data,
  updateData,
  onSubmit,
}: {
  data: SignupData
  updateData: (fields: Partial<SignupData>) => void
  onSubmit: () => void
}) {
  const [error, setError] = React.useState("")
  const [cameraError, setCameraError] = React.useState("")
  const [cameraOpen, setCameraOpen] = React.useState(false)
  const videoRef = React.useRef<HTMLVideoElement>(null)
  const streamRef = React.useRef<MediaStream | null>(null)
  const photoInputRef = React.useRef<HTMLInputElement>(null)
  const idInputRef = React.useRef<HTMLInputElement>(null)
  const horoscopeInputRef = React.useRef<HTMLInputElement>(null)

  const stopCamera = React.useCallback(() => {
    streamRef.current?.getTracks().forEach((track) => track.stop())
    streamRef.current = null
    setCameraOpen(false)
  }, [])

  React.useEffect(() => {
    return () => stopCamera()
  }, [stopCamera])

  React.useEffect(() => {
    if (!cameraOpen || !videoRef.current || !streamRef.current) return
    videoRef.current.srcObject = streamRef.current
  }, [cameraOpen])

  const startCamera = async () => {
    setCameraError("")
    setError("")
    if (!navigator.mediaDevices?.getUserMedia) {
      setCameraError("Camera is not available on this device. Please upload a government ID instead.")
      updateData({ verificationMethod: "govt_id" })
      return
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user", width: { ideal: 720 }, height: { ideal: 720 } },
        audio: false,
      })
      streamRef.current = stream
      setCameraOpen(true)
      updateData({ verificationMethod: "selfie" })
    } catch {
      setCameraError("Camera access was denied. Upload a government ID to continue.")
      updateData({ verificationMethod: "govt_id" })
    }
  }

  const captureSelfie = () => {
    const video = videoRef.current
    if (!video) return
    const canvas = document.createElement("canvas")
    canvas.width = video.videoWidth || 720
    canvas.height = video.videoHeight || 720
    const ctx = canvas.getContext("2d")
    if (!ctx) return
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height)
    const selfiePhoto = canvas.toDataURL("image/jpeg", 0.9)
    updateData({ selfiePhoto, verificationMethod: "selfie", govtIdPhoto: "", govtIdType: "" })
    stopCamera()
  }

  const addPhotos = async (files: FileList | null) => {
    if (!files?.length) return
    setError("")
    const remaining = MAX_PHOTOS - data.photos.length
    const next = [...data.photos]
    for (const file of Array.from(files).slice(0, remaining)) {
      const invalid = validateImage(file)
      if (invalid) {
        setError(invalid)
        continue
      }
      next.push(await readFileAsDataUrl(file))
    }
    updateData({ photos: next })
  }

  const addGovtId = async (file: File | undefined) => {
    if (!file) return
    const invalid = validateImage(file)
    if (invalid) {
      setError(invalid)
      return
    }
    setError("")
    updateData({
      govtIdPhoto: await readFileAsDataUrl(file),
      verificationMethod: "govt_id",
      selfiePhoto: "",
    })
  }

  const addHoroscope = (file: File | undefined) => {
    if (!file) return
    if (file.type !== "application/pdf") {
      setError("Horoscope must be a PDF file.")
      return
    }
    if (file.size > MAX_PDF_MB * 1024 * 1024) {
      setError(`Horoscope PDF must be under ${MAX_PDF_MB} MB.`)
      return
    }
    setError("")
    updateData({ horoscopeName: file.name, horoscopeSize: file.size })
  }

  const identityReady =
    (data.verificationMethod === "selfie" && Boolean(data.selfiePhoto)) ||
    (data.verificationMethod === "govt_id" && Boolean(data.govtIdPhoto) && Boolean(data.govtIdType))

  const canSubmit = data.photos.length >= 1 && identityReady

  const chooseMethod = (method: VerificationMethod) => {
    setError("")
    setCameraError("")
    if (method === "selfie") {
      updateData({ verificationMethod: "selfie" })
      void startCamera()
      return
    }
    stopCamera()
    updateData({ verificationMethod: "govt_id" })
  }

  return (
    <div className="flex flex-col flex-1 min-h-[calc(100vh-140px)] md:min-h-0 space-y-8 pb-8">
      <StepHeading
        title="Photos & verification"
        subtitle="Add clear photos, verify with a selfie or government ID, and optionally upload your horoscope. Photos stay hidden until our team approves them  usually within 12 hours."
      />

      <section className="space-y-3">
        <div className="flex items-end justify-between gap-3">
          <div>
            <h2 className="text-sm font-semibold">Profile photos</h2>
            <p className="text-xs text-muted-foreground">Add 1–6 photos. The first photo becomes your profile picture.</p>
          </div>
          <span className="text-xs font-medium text-muted-foreground">{data.photos.length}/{MAX_PHOTOS}</span>
        </div>
        <div className="grid grid-cols-3 gap-2 sm:gap-3">
          {Array.from({ length: MAX_PHOTOS }).map((_, index) => {
            const photo = data.photos[index]
            return (
              <div
                key={index}
                className={cn(
                  "relative aspect-[3/4] overflow-hidden rounded-2xl border-2 border-dashed",
                  photo ? "border-transparent" : "border-border bg-muted/60"
                )}
              >
                {photo ? (
                  <>
                    {/* blob / data URLs from the camera — not remote assets */}
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={photo} alt={`Profile photo ${index + 1}`} className="h-full w-full object-cover" />
                    {index === 0 && (
                      <span className="absolute left-2 top-2 rounded-full bg-black/70 px-2 py-0.5 text-[10px] font-semibold text-white">
                        Profile
                      </span>
                    )}
                    <button
                      type="button"
                      aria-label={`Remove photo ${index + 1}`}
                      className="absolute right-1.5 top-1.5 flex h-7 w-7 items-center justify-center rounded-full bg-black/70 text-white"
                      onClick={() => updateData({ photos: data.photos.filter((_, i) => i !== index) })}
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </>
                ) : (
                  <button
                    type="button"
                    className="flex h-full w-full flex-col items-center justify-center gap-1 text-muted-foreground"
                    onClick={() => photoInputRef.current?.click()}
                  >
                    <Upload className="h-5 w-5" />
                    <span className="text-[11px] font-medium">Add</span>
                  </button>
                )}
              </div>
            )
          })}
        </div>
        <input
          ref={photoInputRef}
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          onChange={(e) => {
            void addPhotos(e.target.files)
            e.target.value = ""
          }}
        />
        <p className="flex items-start gap-2 rounded-xl bg-primary/5 px-3 py-2 text-xs text-primary">
          <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0" />
          Photos are not shown to other members until verification is complete.
        </p>
      </section>

      <section className="space-y-3">
        <div>
          <h2 className="text-sm font-semibold">Verify it&apos;s you</h2>
          <p className="text-xs text-muted-foreground">
            Take a live selfie, or upload a government ID if the camera is not available.
          </p>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <TapCard
            selected={data.verificationMethod === "selfie"}
            onClick={() => chooseMethod("selfie")}
            icon={<Camera className="h-5 w-5" />}
            title="Take a selfie"
            subtitle="Preferred"
          />
          <TapCard
            selected={data.verificationMethod === "govt_id"}
            onClick={() => chooseMethod("govt_id")}
            icon={<IdCard className="h-5 w-5" />}
            title="Government ID"
            subtitle="If selfie fails"
          />
        </div>

        {cameraError && (
          <p className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900">
            {cameraError}
          </p>
        )}

        {data.verificationMethod === "selfie" && (
          <div className="space-y-3 rounded-2xl border border-border bg-card p-3">
            {cameraOpen ? (
              <div className="relative overflow-hidden rounded-2xl bg-black">
                <video ref={videoRef} autoPlay playsInline muted className="aspect-[3/4] w-full object-cover" />
                <div className="pointer-events-none absolute inset-8 rounded-full border-2 border-white/70" />
                <div className="absolute inset-x-0 bottom-3 flex justify-center gap-2">
                  <Button type="button" variant="outline" onClick={stopCamera}>
                    Cancel
                  </Button>
                  <Button type="button" onClick={captureSelfie}>
                    Capture
                  </Button>
                </div>
              </div>
            ) : data.selfiePhoto ? (
              <div className="flex items-center gap-3">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={data.selfiePhoto} alt="Selfie preview" className="h-24 w-20 rounded-xl object-cover" />
                <div className="flex-1 text-sm">
                  <p className="font-semibold">Selfie captured</p>
                  <p className="text-xs text-muted-foreground">Our team will match this with your profile photos.</p>
                  <button type="button" className="mt-2 text-xs font-semibold text-primary" onClick={() => void startCamera()}>
                    Retake selfie
                  </button>
                </div>
              </div>
            ) : (
              <Button type="button" variant="outline" className="w-full" onClick={() => void startCamera()}>
                Open camera
              </Button>
            )}
          </div>
        )}

        {data.verificationMethod === "govt_id" && (
          <div className="space-y-4 rounded-2xl border border-border bg-card p-4">
            <div className="space-y-2">
              <Label htmlFor="govt-id-type">ID type</Label>
              <Select
                value={data.govtIdType || undefined}
                onValueChange={(govtIdType) => updateData({ govtIdType })}
              >
                <SelectTrigger id="govt-id-type" className="w-full">
                  <SelectValue placeholder="Select ID" />
                </SelectTrigger>
                <SelectContent>
                  {ID_TYPES.map((type) => (
                    <SelectItem key={type} value={type}>
                      {type}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {data.govtIdPhoto ? (
              <div className="flex items-center gap-3">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={data.govtIdPhoto} alt="Government ID preview" className="h-24 w-36 rounded-xl object-cover" />
                <button
                  type="button"
                  className="text-xs font-semibold text-primary"
                  onClick={() => idInputRef.current?.click()}
                >
                  Replace ID photo
                </button>
              </div>
            ) : (
              <button
                type="button"
                className="flex w-full flex-col items-center gap-2 rounded-2xl border border-dashed border-border py-8 text-sm text-muted-foreground"
                onClick={() => idInputRef.current?.click()}
              >
                <Upload className="h-5 w-5" />
                Upload a clear photo of your ID
              </button>
            )}
            <input
              ref={idInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              className="hidden"
              onChange={(e) => {
                void addGovtId(e.target.files?.[0])
                e.target.value = ""
              }}
            />
          </div>
        )}
      </section>

      <section className="space-y-3">
        <div>
          <h2 className="text-sm font-semibold">Horoscope / Kundli</h2>
          <p className="text-xs text-muted-foreground">Optional, but recommended. Upload a PDF only (max {MAX_PDF_MB} MB).</p>
        </div>
        <button
          type="button"
          className="flex w-full items-center gap-3 rounded-2xl border border-dashed border-border bg-card p-4 text-left"
          onClick={() => horoscopeInputRef.current?.click()}
        >
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <FileText className="h-5 w-5" />
          </div>
          <div className="min-w-0 flex-1">
            {data.horoscopeName ? (
              <>
                <p className="truncate text-sm font-semibold">{data.horoscopeName}</p>
                <p className="text-xs text-muted-foreground">{(data.horoscopeSize / 1024 / 1024).toFixed(1)} MB · PDF uploaded</p>
              </>
            ) : (
              <>
                <p className="text-sm font-semibold">Upload horoscope PDF</p>
                <p className="text-xs text-muted-foreground">Accepted by many families during matching</p>
              </>
            )}
          </div>
          {data.horoscopeName && (
            <span
              role="button"
              tabIndex={0}
              className="text-xs font-semibold text-muted-foreground"
              onClick={(e) => {
                e.stopPropagation()
                updateData({ horoscopeName: "", horoscopeSize: 0 })
              }}
            >
              Remove
            </span>
          )}
        </button>
        <input
          ref={horoscopeInputRef}
          type="file"
          accept="application/pdf"
          className="hidden"
          onChange={(e) => {
            addHoroscope(e.target.files?.[0])
            e.target.value = ""
          }}
        />
      </section>

      {error && (
        <p className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">{error}</p>
      )}

      <div className="mt-auto sticky bottom-0 z-40 -mx-4 border-t border-border bg-background/95 p-4 pt-6 backdrop-blur md:static md:-mx-0 md:border-0 md:bg-transparent md:p-0 md:pt-0 safe-bottom">
        <Button className="w-full" size="lg" disabled={!canSubmit} onClick={onSubmit}>
          Submit for verification
        </Button>
        <p className="mt-2 flex items-center justify-center gap-1.5 text-center text-[11px] text-muted-foreground">
          <Clock3 className="h-3.5 w-3.5" />
          Review within {VERIFICATION_SLA_HOURS} hours · photos stay private till then
        </p>
      </div>
    </div>
  )
}

export function VerificationSubmitted({ onContinue }: { onContinue: () => void }) {
  return (
    <div className="space-y-8 py-6 text-center">
      <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 text-primary">
        <CheckCircle2 className="h-8 w-8" />
      </div>
      <div className="space-y-2">
        <h1 className="font-serif text-2xl font-bold">We&apos;re reviewing your profile</h1>
        <p className="text-sm leading-relaxed text-muted-foreground">
          Our team verifies photos and identity within {VERIFICATION_SLA_HOURS} hours. Your photos will not be shown to other members until they are approved.
        </p>
      </div>
      <div className="rounded-2xl border border-border bg-card p-4 text-left text-sm">
        <div className="flex items-start gap-3">
          <Clock3 className="mt-0.5 h-5 w-5 text-primary" />
          <div>
            <p className="font-semibold">Typical wait: under {VERIFICATION_SLA_HOURS} hours</p>
            <p className="text-muted-foreground">You can browse matches now. Connect requests unlock after verification.</p>
          </div>
        </div>
      </div>
      <Button className="w-full" size="lg" onClick={onContinue}>
        Go to matches
      </Button>
    </div>
  )
}
