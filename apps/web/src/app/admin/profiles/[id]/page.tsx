"use client"

import * as React from "react"
import Link from "next/link"
import Image from "next/image"
import { useParams, useRouter } from "next/navigation"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  useAdminProfileQuery,
  useAdminSessionQuery,
  useApproveProfileMutation,
  useRejectProfileMutation,
} from "@/hooks/admin-queries"
import { formatAdminDate, isSlaBreached } from "@/lib/admin-store"
import { adminRejectSchema, type AdminRejectValues } from "@/lib/validation"
import { cn } from "@/lib/utils"
import {
  AlertTriangle,
  ArrowLeft,
  Check,
  FileText,
  IdCard,
  Loader2,
  X,
} from "lucide-react"

export default function AdminProfileReviewPage() {
  const params = useParams()
  const router = useRouter()
  const id = String(params.id)
  const { data: profile, isLoading } = useAdminProfileQuery(id)
  const { data: session } = useAdminSessionQuery()
  const approve = useApproveProfileMutation()
  const reject = useRejectProfileMutation()
  const [showReject, setShowReject] = React.useState(false)

  const rejectForm = useForm<AdminRejectValues>({
    resolver: zodResolver(adminRejectSchema),
    defaultValues: { rejectionReason: "" },
  })

  if (isLoading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  if (!profile) {
    return (
      <div className="mx-auto max-w-lg text-center">
        <p className="text-muted-foreground">Profile not found.</p>
        <Link href="/admin/profiles" className="mt-4 inline-block">
          <Button variant="outline">Back to profiles</Button>
        </Link>
      </div>
    )
  }

  const handleApprove = async () => {
    if (!session) return
    await approve.mutateAsync({ profileId: profile.id, staff: session })
    router.push("/admin/profiles?tab=review")
  }

  const handleReject = async (values: AdminRejectValues) => {
    if (!session) return
    await reject.mutateAsync({
      profileId: profile.id,
      staff: session,
      rejectionReason: values.rejectionReason,
    })
    router.push("/admin/profiles?tab=review")
  }

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <Link href="/admin/profiles">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="mr-1 h-4 w-4" /> Back
            </Button>
          </Link>
          <div>
            <p className="royal-label">Profile review</p>
            <h1 className="font-serif text-3xl font-bold">{profile.fullName}</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              {profile.city} · +91 {profile.phone} · Submitted {formatAdminDate(profile.submittedAt)}
            </p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Badge className="border-transparent capitalize bg-muted">{profile.verificationStatus}</Badge>
          {profile.verificationStatus === "pending" && isSlaBreached(profile.submittedAt) && (
            <Badge className="border-transparent bg-destructive/10 text-destructive">
              <AlertTriangle className="mr-1 h-3 w-3" /> SLA breach
            </Badge>
          )}
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <ReviewPane title="Photos" icon={Check}>
          <div className="grid grid-cols-2 gap-2">
            {profile.photos.map((photo: { id: string; url: string; status: string }) => (
              <div key={photo.id} className="relative aspect-[3/4] overflow-hidden rounded-xl border border-border">
                <Image src={photo.url} alt="" fill className="object-cover" sizes="200px" />
                <span
                  className={cn(
                    "absolute bottom-2 left-2 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase",
                    photo.status === "approved" && "bg-emerald-600 text-white",
                    photo.status === "pending" && "bg-amber-500 text-white",
                    photo.status === "rejected" && "bg-destructive text-white"
                  )}
                >
                  {photo.status}
                </span>
              </div>
            ))}
          </div>
        </ReviewPane>

        <ReviewPane title="Govt ID / Selfie" icon={IdCard}>
          {profile.verificationMethod === "selfie" && profile.selfiePhoto ? (
            <div className="relative aspect-[4/3] overflow-hidden rounded-xl border border-border">
              <Image src={profile.selfiePhoto} alt="Selfie verification" fill className="object-cover" sizes="300px" />
            </div>
          ) : profile.govtIdPhoto ? (
            <>
              <p className="mb-2 text-sm font-medium">{profile.govtIdType || "Government ID"}</p>
              <div className="relative aspect-[4/3] overflow-hidden rounded-xl border border-border">
                <Image src={profile.govtIdPhoto} alt="Government ID" fill className="object-cover" sizes="300px" />
              </div>
            </>
          ) : (
            <p className="text-sm text-muted-foreground">No verification document uploaded.</p>
          )}
        </ReviewPane>

        <ReviewPane title="Horoscope" icon={FileText}>
          {profile.horoscopeName ? (
            <div className="space-y-3 text-sm">
              <div className="rounded-xl border border-border bg-muted/30 p-3">
                <p className="font-semibold">{profile.horoscopeName}</p>
                <p className="text-muted-foreground">PDF on file (demo)</p>
              </div>
              <dl className="grid grid-cols-2 gap-2">
                <Detail label="Birth time" value={profile.birthTime || ""} />
                <Detail label="Birth place" value={profile.birthPlace || ""} />
                <Detail label="Rashi" value={profile.rashi || ""} />
                <Detail label="Star" value={profile.star || ""} />
                <Detail label="Manglik" value={profile.manglik || ""} />
              </dl>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">No horoscope uploaded.</p>
          )}
        </ReviewPane>
      </div>

      <section className="rounded-3xl border border-border bg-card p-5 shadow-sm md:p-6">
        <h2 className="font-serif text-xl font-bold">Profile summary</h2>
        <dl className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4 text-sm">
          <Detail label="Profile for" value={profile.profileFor} />
          <Detail label="Gender" value={profile.gender} />
          <Detail label="Religion" value={profile.religion} />
          <Detail label="Community" value={profile.caste} />
          <Detail label="Mother tongue" value={profile.motherTongue} />
          <Detail label="Completeness" value={`${profile.completeness}%`} />
          <Detail label="Created by" value={profile.createdBy === "staff" ? profile.createdByStaff ?? "Staff" : "Self signup"} />
          <Detail label="Account" value={profile.accountStatus} />
        </dl>
        {profile.rejectionReason && (
          <p className="mt-4 rounded-xl bg-destructive/10 px-3 py-2 text-sm text-destructive">
            Rejection reason: {profile.rejectionReason}
          </p>
        )}
      </section>

      {["pending", "idle"].includes(profile.verificationStatus) && (
        <footer className="sticky bottom-4 rounded-2xl border border-secondary/30 bg-[#fffbf4]/95 p-4 shadow-lg backdrop-blur">
          {!showReject ? (
            <div className="flex flex-wrap gap-2">
              <Button onClick={() => void handleApprove()} disabled={approve.isPending}>
                {approve.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Check className="mr-2 h-4 w-4" />}
                Approve profile
              </Button>
              <Button variant="outline" onClick={() => setShowReject(true)}>
                <X className="mr-2 h-4 w-4" /> Reject
              </Button>
            </div>
          ) : (
            <form className="space-y-3" onSubmit={rejectForm.handleSubmit(handleReject)}>
              <div>
                <Label htmlFor="rejectionReason">Rejection reason</Label>
                <Input id="rejectionReason" {...rejectForm.register("rejectionReason")} placeholder="Explain what needs to be fixed…" />
                {rejectForm.formState.errors.rejectionReason && (
                  <p className="mt-1 text-xs text-destructive">{rejectForm.formState.errors.rejectionReason.message}</p>
                )}
              </div>
              <div className="flex gap-2">
                <Button type="submit" variant="default" disabled={reject.isPending}>
                  Confirm reject
                </Button>
                <Button type="button" variant="ghost" onClick={() => setShowReject(false)}>
                  Cancel
                </Button>
              </div>
            </form>
          )}
        </footer>
      )}
    </div>
  )
}

function ReviewPane({
  title,
  icon: Icon,
  children,
}: {
  title: string
  icon: React.ComponentType<{ className?: string }>
  children: React.ReactNode
}) {
  return (
    <section className="rounded-2xl border border-border bg-card p-4 shadow-sm">
      <div className="mb-3 flex items-center gap-2">
        <Icon className="h-4 w-4 text-gold" />
        <h2 className="font-serif text-lg font-bold">{title}</h2>
      </div>
      {children}
    </section>
  )
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">{label}</dt>
      <dd className="mt-0.5 font-medium">{value}</dd>
    </div>
  )
}
