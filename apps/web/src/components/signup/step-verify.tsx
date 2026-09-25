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
import { StepHeading } from "@/components/signup/shared"
import { cn, getMediaUrl } from "@/lib/utils"
import type { SignupData } from "@/lib/profile-store"
import { VERIFICATION_SLA_HOURS } from "@/lib/profile-store"
import { apiClient } from "@/lib/api-client"
import { hashFile } from "@/lib/file-hash"
import {
  HOROSCOPE_ACCEPT,
  MAX_HOROSCOPE_MB,
  validateHoroscopeFile,
} from "@/lib/horoscope-file"

const MAX_PHOTOS = 6
const MAX_IMAGE_MB = 5
const MAX_DOC_MB = 15
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

function validateDocument(file: File) {
  if (file.size > MAX_DOC_MB * 1024 * 1024) {
    return `The file must be under ${MAX_DOC_MB} MB.`
  }
  return null
}

async function uploadOwnedFile(file: File, purpose: "selfie" | "govt_id" | "horoscope") {
  if (!apiClient.getToken()) {
    throw new Error("Verify your phone before uploading. The file was not saved.")
  }
  const { s3Key } = await apiClient.media.uploadMediaFile(file, purpose)
  if (!s3Key) throw new Error("Upload did not return a file location.")
  return s3Key
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

function isLocalImagePreview(value: string) {
  return value.startsWith("blob:") || value.startsWith("data:image/")
}

function isImagePreview(value: string) {
  return isLocalImagePreview(value) || value.startsWith("http://") || value.startsWith("https://")
}

function resolveProfilePhotoSrc(photo: string | undefined, s3Key: string | undefined) {
  if (photo && isImagePreview(photo)) return photo
  const key = s3Key || (photo && !isImagePreview(photo) ? photo : "")
  return key ? getMediaUrl(key) : ""
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
  const [busy, setBusy] = React.useState<null | "photos" | "selfie" | "id" | "horoscope">(null)
  const [selfiePreview, setSelfiePreview] = React.useState("")
  const [idPreview, setIdPreview] = React.useState("")
  const videoRef = React.useRef<HTMLVideoElement>(null)
  const streamRef = React.useRef<MediaStream | null>(null)
  const photoInputRef = React.useRef<HTMLInputElement>(null)
  const idInputRef = React.useRef<HTMLInputElement>(null)
  const horoscopeInputRef = React.useRef<HTMLInputElement>(null)
  const photoHashesRef = React.useRef<string[]>([])

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
      setCameraError("Camera is not supported on this browser. A live selfie is still required, so try another device or browser.")
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
          ? "Camera permission was denied. Allow camera access in your browser settings, then retry. A live selfie is required along with your government ID."
          : "Could not start the camera. Check the camera connection and try again. A live selfie is required along with your government ID."
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

    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob((next) => resolve(next), "image/jpeg", 0.92)
    )
    if (!blob) {
      setError("Unable to capture image from camera.")
      return
    }

    const selfiePhoto =
      typeof URL.createObjectURL === "function"
        ? URL.createObjectURL(blob)
        : canvas.toDataURL("image/jpeg", 0.92)

    setBusy("selfie")
    setError("")
    try {
      const file = new File([blob], "selfie.jpg", { type: "image/jpeg" })
      const key = await uploadOwnedFile(file, "selfie")

      stopCamera()
      setSelfiePreview(selfiePhoto)

      updateData({
        selfiePhoto,
        selfieS3Key: key,
        verificationMethod: "selfie",
      })
    } catch (err: any) {
      if (selfiePhoto.startsWith("blob:")) URL.revokeObjectURL(selfiePhoto)
      setError(err.message || "Failed to capture selfie. Please try again.")
    } finally {
      setBusy(null)
    }
  }

  const addPhotos = async (files: FileList | null) => {
    if (!files?.length) return
    setError("")
    setBusy("photos")
    const remaining = MAX_PHOTOS - data.photos.length
    const nextPhotos = [...data.photos]
    const nextKeys = [...(data.photoS3Keys || [])]
    const nextHashes = [...(data.photoContentHashes || [])]

    try {
      for (const file of Array.from(files).slice(0, remaining)) {
        const invalid = validateImage(file)
        if (invalid) {
          setError(invalid)
          continue
        }
        const hash = await hashFile(file)
        if (photoHashesRef.current.includes(hash) || nextHashes.includes(hash)) {
          setError("This photo is already on your profile.")
          continue
        }
        const previewUrl = await readFileAsDataUrl(file)
        let key = `profiles/${Date.now()}_${file.name.replace(/[^a-zA-Z0-9.-]/g, "_")}`
        let storedHash = hash

          try {
            const { s3Key, contentHash } = await apiClient.media.uploadMediaFile(file, "profile_photo")
            key = s3Key
            storedHash = contentHash || hash
            photoHashesRef.current.push(storedHash)
          } catch (uploadErr) {
            console.warn("[Media] Upload fallback to mock key:", uploadErr)
            photoHashesRef.current.push(hash)
          }

        nextPhotos.push(previewUrl)
        nextKeys.push(key)
        nextHashes.push(storedHash)
      }
      updateData({
        photos: nextPhotos,
        photoS3Keys: nextKeys,
        photoContentHashes: nextHashes,
      })
    } catch (err: any) {
      setError(err.message || "Failed to upload photo. Please try again.")
    } finally {
      setBusy(null)
    }
  }

  const addGovtId = async (file: File | undefined) => {
    if (!file) return
    const invalid = validateDocument(file)
    if (invalid) {
      setError(invalid)
      return
    }
    setError("")
    setBusy("id")
    try {
      const previewUrl = file.type.startsWith("image/") ? await readFileAsDataUrl(file) : ""
      const key = await uploadOwnedFile(file, "govt_id")
      if (previewUrl) setIdPreview(previewUrl)

      updateData({
        govtIdPhoto: previewUrl,
        govtIdS3Key: key,
        govtIdFileName: file.name,
      })
    } catch (err: any) {
      setError(err.message || "Failed to upload government ID. Please try again.")
    } finally {
      setBusy(null)
    }
  }

  const addHoroscope = async (file: File | undefined) => {
    if (!file) return
    const invalid = validateHoroscopeFile(file)
    if (invalid) {
      setError(invalid)
      return
    }
    setError("")
    setBusy("horoscope")
    try {
      const key = await uploadOwnedFile(file, "horoscope")

      updateData({
        horoscopeName: file.name,
        horoscopeSize: file.size,
        horoscopeS3Key: key,
      })
    } catch (err: any) {
      setError(err.message || "Failed to upload horoscope file.")
    } finally {
      setBusy(null)
    }
  }

  const removePhoto = (index: number) => {
    const nextPhotos = data.photos.filter((_, i) => i !== index)
    const nextKeys = (data.photoS3Keys || []).filter((_, i) => i !== index)
    const nextHashes = (data.photoContentHashes || []).filter((_, i) => i !== index)
    photoHashesRef.current = photoHashesRef.current.filter((_, i) => i !== index)
    updateData({
      photos: nextPhotos,
      photoS3Keys: nextKeys,
      photoContentHashes: nextHashes,
    })
  }

  const shownSelfie = selfiePreview || (isLocalImagePreview(data.selfiePhoto) ? data.selfiePhoto : "")
  const shownId = idPreview || (isLocalImagePreview(data.govtIdPhoto) ? data.govtIdPhoto : "")

  React.useEffect(() => {
    if (!data.selfieS3Key) {
      setSelfiePreview("")
      return
    }
    if (isLocalImagePreview(data.selfiePhoto)) return
    let cancelled = false
    void apiClient.media.previewVerification("selfie", data.selfieS3Key).then(
      ({ url }) => {
        if (!cancelled && url) setSelfiePreview(url)
      },
      () => {
        /* keep the captured label even if the private preview cannot be signed */
      },
    )
    return () => {
      cancelled = true
    }
  }, [data.selfieS3Key, data.selfiePhoto])

  React.useEffect(() => {
    if (!data.govtIdS3Key) {
      setIdPreview("")
      return
    }
    if (isLocalImagePreview(data.govtIdPhoto)) return
    const name = (data.govtIdFileName || data.govtIdS3Key).toLowerCase()
    const looksLikeImage = /\.(jpe?g|png|webp|gif|heic)$/.test(name)
    if (!looksLikeImage && data.govtIdFileName) return
    let cancelled = false
    void apiClient.media.previewVerification("govt_id", data.govtIdS3Key).then(
      ({ url }) => {
        if (!cancelled && url && looksLikeImage) setIdPreview(url)
      },
      () => {},
    )
    return () => {
      cancelled = true
    }
  }, [data.govtIdS3Key, data.govtIdPhoto, data.govtIdFileName])

  const identityReady =
    Boolean(data.selfieS3Key) && Boolean(data.govtIdType) && Boolean(data.govtIdS3Key)

  const canSubmit = data.photos.length >= 1 && identityReady && !busy && !isSubmitting

  return (
    <div className="flex flex-col flex-1 min-h-[calc(100vh-140px)] md:min-h-0 space-y-8 pb-8">
      <StepHeading
        title="Photos & verification"
        subtitle="Add clear photos, then a live selfie and a government ID. Both are required. A horoscope PDF or JPG is optional. Photos stay hidden until our team approves them, usually within 12 hours."
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
            const photoKey = data.photoS3Keys?.[index]
            const photoSrc = resolveProfilePhotoSrc(photo, photoKey)
            return (
              <div
                key={index}
                className={cn(
                  "relative aspect-[3/4] overflow-hidden rounded-2xl border-2 border-dashed",
                  photo ? "border-transparent" : "border-border bg-muted/60"
                )}
              >
                {photoSrc ? (
                  <>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={photoSrc} alt={`Profile photo ${index + 1}`} className="h-full w-full object-cover" />
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
                    disabled={busy === "photos"}
                    className="flex h-full w-full flex-col items-center justify-center gap-1 text-muted-foreground hover:text-primary transition-colors disabled:opacity-50"
                    onClick={() => photoInputRef.current?.click()}
                  >
                    {busy === "photos" ? <Loader2 className="h-5 w-5 animate-spin" /> : <Upload className="h-5 w-5" />}
                    <span className="text-[11px] font-medium">{busy === "photos" ? "Uploading…" : "Add"}</span>
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

      {/* Verification — selfie and government ID are both required */}
      <section className="space-y-4">
        <div>
          <h2 className="text-sm font-semibold">Verify it&apos;s you</h2>
          <p className="text-xs text-muted-foreground">
            Take a live selfie and upload a government ID. Both are saved securely and reviewed together.
          </p>
        </div>

        <div className="space-y-3 rounded-2xl border border-border bg-card p-3">
          <div className="flex items-center gap-2 text-sm font-semibold">
            <Camera className="h-4 w-4" />
            Live selfie
            <span className="text-xs font-medium text-muted-foreground">Required</span>
          </div>
          {cameraError && (
            <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900 space-y-2">
              <p>{cameraError}</p>
              <Button type="button" size="sm" variant="outline" onClick={() => void startCamera()} className="h-7 text-xs">
                Retry camera
              </Button>
            </div>
          )}
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
                    disabled={!cameraReady || busy === "selfie"}
                    className="shadow-lg"
                  >
                    {busy === "selfie" ? (
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
            ) : shownSelfie || data.selfieS3Key ? (
              <div className="flex items-center gap-3">
                {shownSelfie ? (
                  /* eslint-disable-next-line @next/next/no-img-element */
                  <img src={shownSelfie} alt="Selfie preview" className="h-24 w-20 rounded-xl object-cover border border-border bg-muted" />
                ) : (
                  <div className="flex h-24 w-20 items-center justify-center rounded-xl border border-border bg-muted">
                    <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                  </div>
                )}
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

          <div className="space-y-4 rounded-2xl border border-border bg-card p-4">
            <div className="flex items-center gap-2 text-sm font-semibold">
              <IdCard className="h-4 w-4" />
              Government ID
              <span className="text-xs font-medium text-muted-foreground">Required</span>
            </div>
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
            {data.govtIdS3Key ? (
              <div className="flex items-center gap-3">
                {shownId ? (
                  /* eslint-disable-next-line @next/next/no-img-element */
                  <img src={shownId} alt="Government ID preview" className="h-24 w-36 rounded-xl object-cover" />
                ) : (
                  <div className="flex h-24 w-36 items-center justify-center rounded-xl border border-border bg-muted/40 text-muted-foreground">
                    <FileText className="h-6 w-6" />
                  </div>
                )}
                <div className="min-w-0 flex-1 text-sm">
                  <div className="flex items-center gap-1.5 font-semibold text-emerald-700">
                    <CheckCircle2 className="h-4 w-4" /> ID uploaded
                  </div>
                  <p className="mt-0.5 truncate text-xs text-muted-foreground">
                    {data.govtIdFileName || "Saved to secure storage"}
                  </p>
                  <button
                    type="button"
                    className="mt-2 text-xs font-semibold text-primary hover:underline"
                    onClick={() => idInputRef.current?.click()}
                  >
                    Replace document
                  </button>
                </div>
              </div>
            ) : (
              <button
                type="button"
                disabled={busy === "id"}
                className="flex w-full flex-col items-center gap-2 rounded-2xl border border-dashed border-border py-8 text-sm text-muted-foreground hover:text-primary transition-colors disabled:opacity-50"
                onClick={() => idInputRef.current?.click()}
              >
                {busy === "id" ? <Loader2 className="h-5 w-5 animate-spin" /> : <Upload className="h-5 w-5" />}
                {busy === "id" ? "Uploading ID…" : "Upload your ID (image, PDF, or other file)"}
              </button>
            )}
            <input
              ref={idInputRef}
              type="file"
              className="hidden"
              onChange={(e) => {
                void addGovtId(e.target.files?.[0])
                e.target.value = ""
              }}
            />
          </div>
      </section>

      {/* Horoscope PDF */}
      <section className="space-y-3">
        <div>
          <h2 className="text-sm font-semibold">Horoscope / Kundli</h2>
          <p className="text-xs text-muted-foreground">Optional, but recommended. Upload a PDF or JPG (max {MAX_HOROSCOPE_MB} MB).</p>
        </div>
        <button
          type="button"
          disabled={busy === "horoscope"}
          className="flex w-full items-center gap-3 rounded-2xl border border-dashed border-border bg-card p-4 text-left hover:border-primary/50 transition-colors"
          onClick={() => horoscopeInputRef.current?.click()}
        >
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
            {busy === "horoscope" ? <Loader2 className="h-5 w-5 animate-spin" /> : <FileText className="h-5 w-5" />}
          </div>
          <div className="min-w-0 flex-1">
            {data.horoscopeName ? (
              <>
                <p className="truncate text-sm font-semibold">{data.horoscopeName}</p>
                <p className="text-xs text-muted-foreground">
                  {(data.horoscopeSize / 1024 / 1024).toFixed(1)} MB · Uploaded to secure storage
                </p>
              </>
            ) : (
              <>
                <p className="text-sm font-semibold">Upload horoscope PDF or JPG</p>
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
          accept={HOROSCOPE_ACCEPT}
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
            "Create profile"
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
        <h1 className="font-serif text-2xl font-bold">Profile created</h1>
        <p className="text-sm text-muted-foreground">
          Finish any remaining required details, then submit for verification. You can browse matches as a preview;
          send interest unlocks after admin approval (usually within {VERIFICATION_SLA_HOURS} hours).
        </p>
      </div>
      <Button size="lg" className="w-full" onClick={onContinue}>
        Continue to Home
      </Button>
    </div>
  )
}
