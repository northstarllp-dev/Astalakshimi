const fs = require("fs")
const path = "c:/Users/hareh/Documents/Astalakshimi/apps/web/src/app/(dashboard)/profile/edit/page.tsx"
let text = fs.readFileSync(path, "utf8")
const startMarker = '        <p className={cn("text-sm", isMissing("photos")'
const endMarker = '        <Field label="Photo privacy setting">'
const start = text.indexOf(startMarker)
const end = text.indexOf(endMarker)
if (start < 0 || end < 0) {
  console.error("markers not found", start, end)
  process.exit(1)
}
const newBlock = `        <p className={cn("text-sm", isMissing("photos") ? "text-destructive" : "text-muted-foreground")}>
          {isMissing("photos")
            ? "At least one profile photo is required to unlock Discover."
            : "First photo is your primary. Use arrows or Set primary to change order. Drag works on desktop."}
        </p>
        {photoBusy && (
          <p className="text-xs font-medium text-muted-foreground">Updating photos…</p>
        )}

        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          onChange={(e) => void onFiles(e.target.files)}
        />
        <input
          ref={replaceFileRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => void onReplaceFile(e.target.files)}
        />

        {photoItems.length === 0 ? (
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            disabled={photoBusy}
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
                draggable={photo.canReorder && !photoBusy}
                onDragStart={() => setDragIndex(i)}
                onDragOver={(e) => e.preventDefault()}
                onDrop={() => {
                  if (dragIndex !== null) void reorder(dragIndex, i)
                }}
                className="group relative aspect-[3/4] overflow-hidden rounded-xl border-2 border-border bg-muted"
              >
                <Image src={getMediaUrl(photo.url)} alt={`Photo ${i + 1}`} fill className="object-cover" sizes="120px" />
                {i === 0 && (
                  <span className="absolute left-1 top-1 z-10 rounded-full bg-secondary px-1.5 py-0.5 text-[9px] font-bold text-secondary-foreground">
                    <Star className="mr-0.5 inline h-2.5 w-2.5 fill-current" />Primary
                  </span>
                )}
                <div className="absolute inset-x-0 bottom-0 z-10 flex flex-col gap-1 bg-gradient-to-t from-black/70 to-transparent p-1.5 pt-6">
                  <div className="flex items-center justify-between gap-0.5">
                    <button
                      type="button"
                      disabled={!photo.canReorder || photoBusy || i === 0}
                      onClick={() => void reorder(i, i - 1)}
                      className="rounded-full bg-black/55 p-1 text-white disabled:opacity-30"
                      aria-label="Move photo earlier"
                    >
                      <ChevronLeft className="h-3.5 w-3.5" />
                    </button>
                    <button
                      type="button"
                      disabled={!photo.canReorder || photoBusy || i === photoItems.length - 1}
                      onClick={() => void reorder(i, i + 1)}
                      className="rounded-full bg-black/55 p-1 text-white disabled:opacity-30"
                      aria-label="Move photo later"
                    >
                      <ChevronRight className="h-3.5 w-3.5" />
                    </button>
                    <button
                      type="button"
                      disabled={photoBusy}
                      onClick={() => {
                        setReplaceIndex(i)
                        replaceFileRef.current?.click()
                      }}
                      className="rounded-full bg-black/55 p-1 text-white disabled:opacity-30"
                      aria-label="Replace photo"
                    >
                      <Upload className="h-3.5 w-3.5" />
                    </button>
                    <button
                      type="button"
                      disabled={photoBusy}
                      onClick={() => void deletePhoto(i)}
                      className="rounded-full bg-black/55 p-1 text-white disabled:opacity-30"
                      aria-label="Delete photo"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                  {i !== 0 && photo.canReorder && (
                    <button
                      type="button"
                      disabled={photoBusy}
                      onClick={() => void setPrimary(i)}
                      className="w-full rounded-full bg-primary px-2 py-1 text-[10px] font-semibold text-primary-foreground disabled:opacity-50"
                    >
                      Set primary
                    </button>
                  )}
                </div>
                {photo.canReorder && (
                  <span className="absolute right-1 top-1 z-10 hidden cursor-grab rounded bg-black/40 px-1 text-white sm:inline-flex">
                    <GripVertical className="h-3 w-3" />
                  </span>
                )}
              </div>
            ))}
            {photoItems.length < MAX_PHOTOS && (
              <button
                type="button"
                disabled={photoBusy}
                onClick={() => fileRef.current?.click()}
                className="flex aspect-[3/4] items-center justify-center rounded-xl border border-dashed border-border text-muted-foreground hover:border-primary/40 hover:text-primary disabled:opacity-50"
              >
                <Upload className="h-6 w-6" />
                <span className="sr-only">Add photo</span>
              </button>
            )}
          </div>
        )}

`
fs.writeFileSync(path, text.slice(0, start) + newBlock + text.slice(end))
console.log("ok", start, end)
