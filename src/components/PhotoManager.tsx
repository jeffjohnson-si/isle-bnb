import { useCallback, useEffect, useRef, useState } from 'react'
import { Icon } from './Icons'
import { uploadPhoto, uploadPhotoPublic } from '../lib/api'
import { compressImage } from '../lib/uploads'

/**
 * Add, remove, preview and reorder listing photos. The first photo is the one
 * guests see on cards, so it carries a "Main" badge and any other photo can be
 * promoted to it — from the tile or from the full-screen preview.
 *
 * With a host token the photo belongs to an account; without one it is part of
 * an application that the team reviews before anything is published.
 */
export function PhotoManager({
  token,
  images,
  onChange,
}: {
  token?: string
  images: string[]
  onChange: (images: string[]) => void
}) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(0)
  const [error, setError] = useState('')
  const [preview, setPreview] = useState<number | null>(null)

  const add = async (files: FileList | null) => {
    if (!files?.length) return
    setError('')
    const room = 8 - images.length
    const chosen = Array.from(files).slice(0, room)
    if (chosen.length < files.length) {
      setError('Eight photos is the maximum — remove one to add another.')
    }

    let next = images
    for (const file of chosen) {
      setUploading((count) => count + 1)
      try {
        const blob = await compressImage(file)
        const { url } = token
          ? await uploadPhoto(token, blob)
          : await uploadPhotoPublic(blob)
        next = [...next, url]
        onChange(next)
      } catch (uploadError) {
        setError(
          uploadError instanceof Error ? uploadError.message : 'Could not upload that photo.',
        )
      } finally {
        setUploading((count) => count - 1)
      }
    }
    if (inputRef.current) inputRef.current.value = ''
  }

  const removeAt = (index: number) => {
    onChange(images.filter((_, position) => position !== index))
    setPreview(null)
  }

  const makeMain = (index: number) => {
    const chosen = images[index]
    onChange([chosen, ...images.filter((_, position) => position !== index)])
    setPreview(0)
  }

  return (
    <div>
      <span className="field-label">Photos</span>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {images.map((image, index) => (
          <div
            key={image}
            className="overflow-hidden rounded-xl border border-ink/10 bg-white"
          >
            <button
              type="button"
              onClick={() => setPreview(index)}
              className="group relative block w-full"
              aria-label={`Preview photo ${index + 1}`}
            >
              <img
                src={image}
                alt={`Listing photo ${index + 1}`}
                className="aspect-[4/3] w-full object-cover"
                loading="lazy"
              />
              <span className="absolute inset-0 bg-ink/0 transition group-hover:bg-ink/15" />
              <span className="absolute inset-0 grid place-items-center opacity-0 transition group-hover:opacity-100">
                <span className="rounded-full bg-white/90 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-ink">
                  View
                </span>
              </span>
              {index === 0 && (
                <span className="absolute left-1.5 top-1.5 rounded-full bg-ink/85 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-sand">
                  Main
                </span>
              )}
            </button>
            <div className="flex items-center justify-between gap-1 px-1.5 py-1">
              {index === 0 ? (
                <span className="text-[10px] text-ink/40">Shown on cards</span>
              ) : (
                <button
                  type="button"
                  onClick={() => makeMain(index)}
                  className="inline-flex items-center gap-1 text-[10px] font-bold text-lagoon hover:text-ink"
                >
                  <Icon name="star" size={11} />
                  Make main
                </button>
              )}
              <button
                type="button"
                onClick={() => removeAt(index)}
                aria-label={`Remove photo ${index + 1}`}
                className="grid h-6 w-6 place-items-center rounded-full text-ink/40 transition hover:bg-coral/10 hover:text-coral"
              >
                <Icon name="close" size={12} />
              </button>
            </div>
          </div>
        ))}

        {images.length < 8 && (
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            disabled={uploading > 0}
            className="flex aspect-[4/3] flex-col items-center justify-center gap-1.5 rounded-xl border border-dashed border-ink/25 bg-white text-xs font-semibold text-ink/55 transition hover:border-lagoon hover:text-lagoon disabled:cursor-wait"
          >
            <Icon name={uploading > 0 ? 'download' : 'sparkles'} size={18} />
            {uploading > 0 ? `Uploading ${uploading}…` : 'Add photos'}
          </button>
        )}
      </div>

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        multiple
        className="sr-only"
        onChange={(event) => void add(event.target.files)}
      />

      {error && <p className="mt-2 text-xs font-semibold text-coral">{error}</p>}
      <p className="mt-2 text-xs leading-relaxed text-ink/40">
        Up to 8 photos · tap one to see it full size. The first is the main photo guests
        see on cards. They are resized on this device before upload, so a phone picture
        will not eat your data.
      </p>

      {preview !== null && images[preview] && (
        <PhotoPreview
          images={images}
          index={preview}
          onIndex={setPreview}
          onClose={() => setPreview(null)}
          onMakeMain={makeMain}
          onRemove={removeAt}
        />
      )}
    </div>
  )
}

function PhotoPreview({
  images,
  index,
  onIndex,
  onClose,
  onMakeMain,
  onRemove,
}: {
  images: string[]
  index: number
  onIndex: (index: number) => void
  onClose: () => void
  onMakeMain: (index: number) => void
  onRemove: (index: number) => void
}) {
  const step = useCallback(
    (delta: number) => onIndex((index + delta + images.length) % images.length),
    [index, images.length, onIndex],
  )

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
      if (event.key === 'ArrowRight' && images.length > 1) step(1)
      if (event.key === 'ArrowLeft' && images.length > 1) step(-1)
    }
    document.addEventListener('keydown', onKey)
    const previous = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = previous
    }
  }, [onClose, step, images.length])

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`Photo ${index + 1} of ${images.length}`}
      className="fixed inset-0 z-[60] flex flex-col bg-ink p-4 sm:p-6"
      onClick={onClose}
    >
      <div
        className="flex flex-col"
        onClick={(event) => event.stopPropagation()}
        style={{ minHeight: 0, flex: 1 }}
      >
        <div className="flex items-center justify-between text-sand">
          <p className="text-xs font-semibold uppercase tracking-widest text-sand/70">
            {index + 1} of {images.length}
          </p>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close preview"
            className="grid h-9 w-9 place-items-center rounded-full bg-white/10 text-sand transition hover:bg-white/20"
          >
            <Icon name="close" size={18} />
          </button>
        </div>

        <div className="relative flex flex-1 items-center justify-center py-4">
          {images.length > 1 && (
            <button
              type="button"
              onClick={() => step(-1)}
              aria-label="Previous photo"
              className="absolute left-2 grid h-10 w-10 place-items-center rounded-full bg-white/15 text-sand backdrop-blur transition hover:bg-white/25 sm:left-4"
            >
              <Icon name="arrowLeft" size={18} />
            </button>
          )}
          <img
            src={images[index]}
            alt={`Photo ${index + 1} of ${images.length}`}
            className="max-h-full max-w-full rounded-xl object-contain"
          />
          {images.length > 1 && (
            <button
              type="button"
              onClick={() => step(1)}
              aria-label="Next photo"
              className="absolute right-2 grid h-10 w-10 place-items-center rounded-full bg-white/15 text-sand backdrop-blur transition hover:bg-white/25 sm:right-4"
            >
              <Icon name="arrowRight" size={18} />
            </button>
          )}
        </div>

        <div className="flex flex-wrap items-center justify-center gap-2 pb-1">
          {index === 0 ? (
            <span className="rounded-full bg-sun px-4 py-2 text-xs font-bold text-ink">
              Main photo — shown on cards
            </span>
          ) : (
            <button
              type="button"
              onClick={() => onMakeMain(index)}
              className="inline-flex items-center gap-1.5 rounded-full bg-sun px-4 py-2 text-xs font-bold text-ink transition hover:bg-white"
            >
              <Icon name="star" size={13} />
              Use as the main photo
            </button>
          )}
          <button
            type="button"
            onClick={() => onRemove(index)}
            className="rounded-full border border-coral/60 px-4 py-2 text-xs font-bold text-coral transition hover:bg-coral/10"
          >
            Remove photo
          </button>
        </div>
      </div>
    </div>
  )
}
