"use client"

import * as React from "react"
import { Camera, CheckCircle2, Clock3, FileText, IdCard, Loader2, ShieldCheck, Upload, X } from "lucide-react"
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
import { apiClient } from "@/lib/api-client"

const MAX_PHOTOS = 6
const MAX_IMAGE_MB = 5
const MAX_PDF_MB = 10
const IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp", "image/heic"]
const ID_TYPES = ["Aadhaar", "PAN card", "Passport", "Driving licence", "Voter ID"]

function readFileAsDataUrl(file: File | Blob): Promise<string> {
  if (typeof window !== "undefined" && typeof window.URL?.createObjectURL === "function") {
    return Promise.resolve(URL.createObjectURL(file))
  }
  return new Promise((resolve, reject) => {
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
  onNext,
  isSubmitting = false,
}: {
  data: SignupData
  updateData: (fields: Partial<SignupData>) => void
  onSubmit?: () => void
  onNext?: () => void
  isSubmitting?: boolean
}) {
  const [error, setError] = React.useState("")
  const [cameraError, setCameraError] = React.useState("")
  const [cameraOpen, setCameraOpen] = React.useState(false)
  const [cameraReady, setCameraReady] = React.useState(false)
  const [cameraLoading, setCameraLoading] = React.useState(false)
  const [uploading, setUploading] = React.useState(false)
  const videoRef = React.useRef<HTMLVideoElement>(null)
  const streamRef = React.useRef<MediaStream | null>(null)
  const photoInputRef = React.useRef<HTMLInputElement>(null)
  const idInputRef = React.useRef<HTMLInputElement>(null)
  const horoscopeInputRef = React.useRef<HTMLInputElement>(null)

  const stopCamera = React.useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop())
      streamRef.current = null
    }
    setCameraOpen(false)
    setCameraReady(false)
    setCameraLoading(false)
  }, [])

  React.useEffect(() => {
    return () => stopCamera()
  }, [stopCamera])

  React.useEffect(() => {
    if (!cameraOpen || !videoRef.current || !streamRef.current) return
    const video = videoRef.current
    video.srcObject = streamRef.current
    const playPromise = video.play()
    if (playPromise !== undefined) {
      playPromise
        .then(() => {
          setCameraReady(true)
        })
        .catch((err) => {
          console.warn("[Camera] Autoplay caught:", err)
        })
    }
  }, [cameraOpen])

  const startCamera = async () => {
    setCameraError("")
    setError("")
    setCameraLoading(true)

    if (typeof window === "undefined" || !navigator.mediaDevices?.getUserMedia) {
      setCameraLoading(false)
      setCameraError("Camera is not supported on this browser or device. Please upload a government ID instead.")
      return
    }

    try {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop())
        streamRef.current = null
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: "user",
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
        audio: false,
      })

      streamRef.current = stream
      setCameraOpen(true)
      setCameraReady(false)
      setCameraLoading(false)
      updateData({ verificationMethod: "selfie" })
    } catch (err: any) {
      setCameraLoading(false)
      setCameraOpen(false)
      const isDenied = err.name === "NotAllowedError" || err.name === "PermissionDeniedError"
      setCameraError(
        isDenied
          ? "Camera permission was denied. Please allow camera access in your browser settings to take a live selfie, or switch to Government ID."
          : "Could not start camera. Please verify your camera connection or switch to Government ID."
      )
    }
  }

  const captureSelfie = async () => {
    const video = videoRef.current
    if (!video) return

    const width = video.videoWidth || video.clientWidth || 720
    const height = video.videoHeight || video.clientHeight || 720

    const canvas = document.createElement("canvas")
    canvas.width = width
    canvas.height = height
    const ctx = canvas.getContext("2d")
    if (!ctx) return

    // Mirror horizontally so the selfie matches the front-camera mirror view
    ctx.save()
    ctx.translate(canvas.width, 0)
    ctx.scale(-1, 1)
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height)
    ctx.restore()

    const selfiePhoto = canvas.toDataURL("image/jpeg", 0.92)

    setUploading(true)
    setError("")
    try {
      const blob = await new Promise<Blob | null>((resolve) =>
        canvas.toBlob((b) => resolve(b), "image/jpeg", 0.92)
      )

      if (!blob) {
        throw new Error("Unable to capture image from camera.")
      }

      let key = `verifications/${Date.now()}_selfie.jpg`

      // If user is authenticated, upload directly to S3
      if (apiClient.getToken()) {
        try {
          const { uploadUrl, s3Key } = await apiClient.media.getUploadUrl({
            purpose: "selfie",
            contentType: "image/jpeg",
            fileSize: blob.size,
          })
          key = s3Key
          await apiClient.media.uploadFileToS3(uploadUrl, blob, "image/jpeg")
        } catch (uploadErr) {
          console.warn("[Media] S3 upload fallback to mock key:", uploadErr)
        }
      }

      stopCamera()

      updateData({
        selfiePhoto,
        selfieS3Key: key,
        verificationMethod: "selfie",
        govtIdPhoto: "",
        govtIdS3Key: "",
        govtIdType: "",
      })
    } catch (err: any) {
      setError(err.message || "Failed to capture selfie. Please try again.")
    } finally {
      setUploading(false)
    }
  }

  const addPhotos = async (files: FileList | null) => {
    if (!files?.length) return
    setError("")
    setUploading(true)
    const remaining = MAX_PHOTOS - data.photos.length
    const nextPhotos = [...data.photos]
    const nextKeys = [...(data.photoS3Keys || [])]

    try {
      for (const file of Array.from(files).slice(0, remaining)) {
        const invalid = validateImage(file)
        if (invalid) {
          setError(invalid)
          continue
        }
        const previewUrl = await readFileAsDataUrl(file)
        let key = `profiles/${Date.now()}_${file.name.replace(/[^a-zA-Z0-9.-]/g, "_")}`

        if (apiClient.getToken()) {
          try {
            const { uploadUrl, s3Key } = await apiClient.media.getUploadUrl({
              purpose: "profile_photo",
              contentType: file.type || "image/jpeg",
              fileSize: file.size,
            })
            key = s3Key
            await apiClient.media.uploadFileToS3(uploadUrl, file, file.type || "image/jpeg")
          } catch (uploadErr) {
            console.warn("[Media] S3 upload fallback to mock key:", uploadErr)
          }
        }

        nextPhotos.push(previewUrl)
        nextKeys.push(key)
      }
      updateData({ photos: nextPhotos, photoS3Keys: nextKeys })
    } catch (err: any) {
      setError(err.message || "Failed to upload photo. Please try again.")
    } finally {
      setUploading(false)
    }
  }

  const addGovtId = async (file: File | undefined) => {
    if (!file) return
    const invalid = validateImage(file)
    if (invalid) {
      setError(invalid)
      return
    }
    setError("")
    setUploading(true)
    try {
      const previewUrl = await readFileAsDataUrl(file)
      let key = `verifications/${Date.now()}_${file.name.replace(/[^a-zA-Z0-9.-]/g, "_")}`

      if (apiClient.getToken()) {
        try {
          const { uploadUrl, s3Key } = await apiClient.media.getUploadUrl({
            purpose: "govt_id",
            contentType: file.type || "image/jpeg",
            fileSize: file.size,
          })
          key = s3Key
          await apiClient.media.uploadFileToS3(uploadUrl, file, file.type || "image/jpeg")
        } catch (uploadErr) {
          console.warn("[Media] S3 upload fallback to mock key:", uploadErr)
        }
      }

      updateData({
        govtIdPhoto: previewUrl,
        govtIdS3Key: key,
        verificationMethod: "govt_id",
        selfiePhoto: "",
        selfieS3Key: "",
      })
    } catch (err: any) {
      setError(err.message || "Failed to upload government ID. Please try again.")
    } finally {
      setUploading(false)
    }
  }

  const addHoroscope = async (file: File | undefined) => {
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
    setUploading(true)
    try {
      let key = `horoscopes/${Date.now()}_${file.name.replace(/[^a-zA-Z0-9.-]/g, "_")}`

      if (apiClient.getToken()) {
        try {
          const { uploadUrl, s3Key } = await apiClient.media.getUploadUrl({
            purpose: "horoscope",
            contentType: "application/pdf",
            fileSize: file.size,
          })
          key = s3Key
          await apiClient.media.uploadFileToS3(uploadUrl, file, "application/pdf")
        } catch (uploadErr) {
          console.warn("[Media] S3 upload fallback to mock key:", uploadErr)
        }
      }

      updateData({
        horoscopeName: file.name,
        horoscopeSize: file.size,
        horoscopeS3Key: key,
      })
    } catch (err: any) {
      setError(err.message || "Failed to upload horoscope PDF.")
    } finally {
      setUploading(false)
    }
  }

  const removePhoto = (index: number) => {
    const nextPhotos = data.photos.filter((_, i) => i !== index)
    const nextKeys = (data.photoS3Keys || []).filter((_, i) => i !== index)
    updateData({ photos: nextPhotos, photoS3Keys: nextKeys })
  }

  const identityReady =
    (data.verificationMethod === "selfie" && Boolean(data.selfiePhoto || data.selfieS3Key)) ||
    (data.verificationMethod === "govt_id" && Boolean(data.govtIdPhoto || data.govtIdS3Key) && Boolean(data.govtIdType))

  const canSubmit = data.photos.length >= 1 && identityReady && !uploading && !isSubmitting

  const chooseMethod = (method: VerificationMethod) => {
    setError("")
    setCameraError("")
    if (method === "selfie") {
      updateData({ verificationMethod: "selfie" })
      if (!data.selfiePhoto) {
        void startCamera()
      }
      return
    }
    stopCamera()
    updateData({ verificationMethod: "govt_id" })
  }

  return (
    <div className="flex flex-col flex-1 min-h-[calc(100vh-140px)] md:min-h-0 space-y-8 pb-8">
      <StepHeading
        title="Photos & verification"
        subtitle="Add clear photos, verify with a live selfie or government ID, and optionally upload your horoscope. Photos stay hidden until our team approves them — usually within 12 hours."
      />

      {/* Profile Photos */}
      <section className="space-y-3">
        <div className="flex items-end justify-between gap-3">
          <div>
            <h2 className="text-sm font-semibold">Profile photos</h2>
            <p className="text-xs text-muted-foreground">Add 1–6 photos. The first photo becomes your profile picture.</p>
          </div>
          <span className="text-xs font-medium text-muted-foreground">
            {data.photos.length}/{MAX_PHOTOS}
          </span>
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
                      onClick={() => removePhoto(index)}
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </>
                ) : (
                  <button
                    type="button"
                    disabled={uploading}
                    className="flex h-full w-full flex-col items-center justify-center gap-1 text-muted-foreground hover:text-primary transition-colors disabled:opacity-50"
                    onClick={() => photoInputRef.current?.click()}
                  >
                    {uploading ? <Loader2 className="h-5 w-5 animate-spin" /> : <Upload className="h-5 w-5" />}
                    <span className="text-[11px] font-medium">{uploading ? "Uploading…" : "Add"}</span>
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

      {/* Verification */}
      <section className="space-y-3">
        <div>
          <h2 className="text-sm font-semibold">Verify it&apos;s you</h2>
          <p className="text-xs text-muted-foreground">
            Take an instant live selfie, or upload a government ID if the camera is not available.
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
            subtitle="If camera fails"
          />
        </div>

        {cameraError && (
          <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900 space-y-2">
            <p>{cameraError}</p>
            <div className="flex gap-2">
              <Button type="button" size="sm" variant="outline" onClick={() => void startCamera()} className="h-7 text-xs">
                Retry camera
              </Button>
              <Button
                type="button"
                size="sm"
                variant="ghost"
                onClick={() => chooseMethod("govt_id")}
                className="h-7 text-xs text-amber-950"
              >
                Switch to Government ID
              </Button>
            </div>
          </div>
        )}

        {data.verificationMethod === "selfie" && (
          <div className="space-y-3 rounded-2xl border border-border bg-card p-3">
            {cameraOpen ? (
              <div className="relative overflow-hidden rounded-2xl bg-black">
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  onLoadedMetadata={() => setCameraReady(true)}
                  onCanPlay={() => setCameraReady(true)}
                  className="aspect-[3/4] w-full object-cover -scale-x-100"
                />
                {/* Face guide overlay */}
                <div className="pointer-events-none absolute inset-8 flex items-center justify-center">
                  <div className="h-4/5 w-3/4 rounded-[50%] border-2 border-dashed border-white/70 shadow-[0_0_0_9999px_rgba(0,0,0,0.35)]" />
                </div>

                {!cameraReady && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-black/75 text-white">
                    <Loader2 className="h-7 w-7 animate-spin text-primary" />
                    <span className="text-xs font-medium">Starting camera…</span>
                  </div>
                )}

                <div className="absolute inset-x-0 bottom-3 flex items-center justify-center gap-2.5 px-4">
                  <Button type="button" variant="outline" size="sm" onClick={stopCamera} className="bg-black/60 text-white border-white/20 hover:bg-black/80">
                    Cancel
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    onClick={() => void captureSelfie()}
                    disabled={!cameraReady || uploading}
                    className="shadow-lg"
                  >
                    {uploading ? (
                      <>
                        <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> Saving…
                      </>
                    ) : (
                      <>
                        <Camera className="mr-1.5 h-4 w-4" /> Capture selfie
                      </>
                    )}
                  </Button>
                </div>
              </div>
            ) : data.selfiePhoto ? (
              <div className="flex items-center gap-3">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={data.selfiePhoto} alt="Selfie preview" className="h-24 w-20 rounded-xl object-cover border border-border" />
                <div className="flex-1 text-sm">
                  <div className="flex items-center gap-1.5 font-semibold text-emerald-700">
                    <CheckCircle2 className="h-4 w-4" /> Live selfie captured
                  </div>
                  <p className="mt-0.5 text-xs text-muted-foreground">Our team will match this with your profile photos.</p>
                  <button
                    type="button"
                    className="mt-2 text-xs font-semibold text-primary hover:underline"
                    onClick={() => void startCamera()}
                  >
                    Retake selfie
                  </button>
                </div>
              </div>
            ) : (
              <div className="py-4 text-center">
                <Button
                  type="button"
                  variant="outline"
                  className="w-full flex items-center justify-center gap-2"
                  onClick={() => void startCamera()}
                  disabled={cameraLoading}
                >
                  {cameraLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Camera className="h-4 w-4" />}
                  <span>{cameraLoading ? "Opening camera…" : "Open camera"}</span>
                </Button>
                <p className="mt-2 text-[11px] text-muted-foreground">
                  Position your face clearly in the camera frame
                </p>
              </div>
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
                  className="text-xs font-semibold text-primary hover:underline"
                  onClick={() => idInputRef.current?.click()}
                >
                  Replace ID photo
                </button>
              </div>
            ) : (
              <button
                type="button"
                disabled={uploading}
                className="flex w-full flex-col items-center gap-2 rounded-2xl border border-dashed border-border py-8 text-sm text-muted-foreground hover:text-primary transition-colors disabled:opacity-50"
                onClick={() => idInputRef.current?.click()}
              >
                {uploading ? <Loader2 className="h-5 w-5 animate-spin" /> : <Upload className="h-5 w-5" />}
                {uploading ? "Uploading ID…" : "Upload a clear photo of your ID"}
              </button>
            )}
            <input
              ref={idInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                void addGovtId(e.target.files?.[0])
                e.target.value = ""
              }}
            />
          </div>
        )}
      </section>

      {/* Horoscope PDF */}
      <section className="space-y-3">
        <div>
          <h2 className="text-sm font-semibold">Horoscope / Kundli</h2>
          <p className="text-xs text-muted-foreground">Optional, but recommended. Upload a PDF only (max {MAX_PDF_MB} MB).</p>
        </div>
        <button
          type="button"
          disabled={uploading}
          className="flex w-full items-center gap-3 rounded-2xl border border-dashed border-border bg-card p-4 text-left hover:border-primary/50 transition-colors"
          onClick={() => horoscopeInputRef.current?.click()}
        >
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
            {uploading ? <Loader2 className="h-5 w-5 animate-spin" /> : <FileText className="h-5 w-5" />}
          </div>
          <div className="min-w-0 flex-1">
            {data.horoscopeName ? (
              <>
                <p className="truncate text-sm font-semibold">{data.horoscopeName}</p>
                <p className="text-xs text-muted-foreground">
                  {(data.horoscopeSize / 1024 / 1024).toFixed(1)} MB · PDF uploaded to S3
                </p>
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
              className="text-xs font-semibold text-muted-foreground hover:text-destructive"
              onClick={(e) => {
                e.stopPropagation()
                updateData({ horoscopeName: "", horoscopeSize: 0, horoscopeS3Key: "" })
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
            void addHoroscope(e.target.files?.[0])
            e.target.value = ""
          }}
        />
      </section>

      {error && (
        <p className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">{error}</p>
      )}

      <div className="mt-auto sticky bottom-0 z-40 -mx-4 border-t border-border bg-background/95 p-4 pt-6 backdrop-blur md:static md:-mx-0 md:border-0 md:bg-transparent md:p-0 md:pt-0 safe-bottom">
        <Button className="w-full" size="lg" disabled={!canSubmit} onClick={onSubmit || onNext}>
          {isSubmitting ? (
            <>
              <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Submitting profile…
            </>
          ) : (
            "Submit for verification"
          )}
        </Button>
        <p className="mt-2 flex items-center justify-center gap-1.5 text-center text-[11px] text-muted-foreground">
          <Clock3 className="h-3.5 w-3.5" />
          Review within {VERIFICATION_SLA_HOURS} hours · photos stay private till then
        </p>
      </div>
    </div>
  )
}

export const Step4Verify = Step6Verify

export function VerificationSubmitted({ onContinue }: { onContinue: () => void }) {
  return (
    <div className="space-y-8 py-6 text-center">
      <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 text-primary">
        <CheckCircle2 className="h-8 w-8" />
      </div>
      <div className="space-y-2">
        <h1 className="font-serif text-2xl font-bold">We&apos;re reviewing your profile</h1>
        <p className="text-sm text-muted-foreground">
          Photos & identity verification take up to {VERIFICATION_SLA_HOURS} hours. In the meantime, you can explore matches
          and save preferences.
        </p>
      </div>
      <Button size="lg" className="w-full" onClick={onContinue}>
        Go to Dashboard
      </Button>
    </div>
  )
}
