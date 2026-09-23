import {
  buildPhotoGridItems,
  isServerPhotoId,
  reorderPhotoList,
  serverPhotoIdsForReorder,
} from "./photo-grid"

describe("photo-grid helpers", () => {
  describe("isServerPhotoId", () => {
    it("accepts real UUIDs and rejects local/obj placeholders", () => {
      expect(isServerPhotoId("a1b2c3d4-e5f6-7890-abcd-ef1234567890")).toBe(true)
      expect(isServerPhotoId("local-0")).toBe(false)
      expect(isServerPhotoId("obj-1")).toBe(false)
      expect(isServerPhotoId("")).toBe(false)
      expect(isServerPhotoId(null)).toBe(false)
    })
  })

  describe("buildPhotoGridItems", () => {
    it("prefers photoObjects with canReorder for server ids", () => {
      const items = buildPhotoGridItems({
        photoObjects: [
          { id: "11111111-1111-4111-8111-111111111111", url: "a.jpg", isPrimary: true },
          { id: "22222222-2222-4222-8222-222222222222", s3Key: "b.jpg", isPrimary: false },
        ],
        photos: ["ignored.jpg"],
      })
      expect(items).toHaveLength(2)
      expect(items[0].canReorder).toBe(true)
      expect(items[0].url).toBe("a.jpg")
      expect(items[1].url).toBe("b.jpg")
      expect(items[0].isPrimary).toBe(true)
    })

    it("falls back to photos[] without reorder when objects missing", () => {
      const items = buildPhotoGridItems({ photos: ["blob:x", "https://cdn/y.jpg"] })
      expect(items).toHaveLength(2)
      expect(items.every((p) => !p.canReorder)).toBe(true)
      expect(items[0].id).toBe("local-0")
      expect(items[0].isPrimary).toBe(true)
    })
  })

  describe("reorderPhotoList", () => {
    it("moves an item and leaves others stable", () => {
      expect(reorderPhotoList(["a", "b", "c"], 2, 0)).toEqual(["c", "a", "b"])
      expect(reorderPhotoList(["a", "b", "c"], 0, 2)).toEqual(["b", "c", "a"])
      expect(reorderPhotoList(["a", "b"], 0, 0)).toEqual(["a", "b"])
      expect(reorderPhotoList(["a"], 0, 5)).toEqual(["a"])
    })
  })

  describe("serverPhotoIdsForReorder", () => {
    it("returns ordered ids only when every item is reorderable", () => {
      const ok = buildPhotoGridItems({
        photoObjects: [
          { id: "11111111-1111-4111-8111-111111111111", url: "a" },
          { id: "22222222-2222-4222-8222-222222222222", url: "b" },
        ],
      })
      expect(serverPhotoIdsForReorder(ok)).toEqual([
        "11111111-1111-4111-8111-111111111111",
        "22222222-2222-4222-8222-222222222222",
      ])
      expect(serverPhotoIdsForReorder(reorderPhotoList(ok, 1, 0))).toEqual([
        "22222222-2222-4222-8222-222222222222",
        "11111111-1111-4111-8111-111111111111",
      ])

      const local = buildPhotoGridItems({ photos: ["a.jpg"] })
      expect(serverPhotoIdsForReorder(local)).toBeNull()
      expect(serverPhotoIdsForReorder([])).toBeNull()
    })
  })
})
