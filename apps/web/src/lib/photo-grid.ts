/**
 * Pure helpers for profile photo grid state (edit profile + tests).
 * Primary = index 0 after reorder (synced to isPrimary / displayOrder on the API).
 */

export type PhotoGridItem = {
  id: string
  url: string
  /** True when id is a real server UUID — drag/reorder/set-primary can hit the API. */
  canReorder: boolean
  status?: string
  isPrimary?: boolean
}

export function isServerPhotoId(id: string | undefined | null): boolean {
  if (!id) return false
  return !id.startsWith("local-") && !id.startsWith("obj-")
}

export function buildPhotoGridItems(input: {
  photoObjects?: Array<{ id?: string; url?: string; s3Key?: string; status?: string; isPrimary?: boolean }> | null
  photos?: string[] | null
}): PhotoGridItem[] {
  const objects = input.photoObjects
  if (objects?.length) {
    return objects.map((photo, index) => {
      const id = photo.id && isServerPhotoId(photo.id) ? photo.id : photo.id || `obj-${index}`
      return {
        id,
        url: photo.url || photo.s3Key || "",
        canReorder: Boolean(photo.id && isServerPhotoId(photo.id)),
        status: photo.status,
        isPrimary: photo.isPrimary ?? index === 0,
      }
    })
  }
  const photos = (input.photos || []).filter(Boolean)
  return photos.map((url, index) => ({
    id: `local-${index}`,
    url,
    canReorder: false,
    isPrimary: index === 0,
  }))
}

/** Move item from → to; returns new order (does not mutate). */
export function reorderPhotoList<T>(list: T[], from: number, to: number): T[] {
  if (from === to || from < 0 || to < 0 || from >= list.length || to >= list.length) {
    return list
  }
  const next = [...list]
  const [moved] = next.splice(from, 1)
  next.splice(to, 0, moved)
  return next
}

/** Server ids in new display order, or null if any item cannot be reordered. */
export function serverPhotoIdsForReorder(items: PhotoGridItem[]): string[] | null {
  if (items.length === 0) return null
  if (!items.every((p) => p.canReorder && isServerPhotoId(p.id))) return null
  return items.map((p) => p.id)
}
