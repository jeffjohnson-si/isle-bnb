import { useRef, useState } from 'react'
import { Icon } from './Icons'
import { uploadPhoto } from '../lib/api'
import { compressImage } from '../lib/uploads'
import { cn } from '../lib/utils'

/**
 * Add, remove and reorder listing photos. The first photo is the one guests see
 * on cards, so it is labelled as the main photo and can be swapped.
 */
export function PhotoManager({
  token,
  images,
  onChange,
}: {
  token: string
  images: string[]
  onChange: (images: string[]) => void
}) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(0)
  const [error, setError] = useState('')

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
        const { url } = await uploadPhoto(token, blob)
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

  const remove = (url: string) => onChange(images.filter((image) => image !== url))

  const makeMain = (url: string) =>
    onChange([url, ...images.filter((image) => image !== url)])

  return (
    <div>
      <span className="field-label">Photos</span>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {images.map((image, index) => (
          <div
            key={image}
            className="group relative overflow-hidden rounded-xl border border-ink/10 bg-mist"
          >
            <img
              src={image}
              alt={`Listing photo ${index + 1}`}
              className="aspect-[4/3] w-full object-cover"
              loading="lazy"
            />
            {index === 0 && (
              <span className="absolute left-1.5 top-1.5 rounded-full bg-ink/80 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-sand">
                Main
              </span>
            )}
            <div className="flex items-center justify-between gap-1 bg-white/95 px-1.5 py-1">
              {index === 0 ? (
                <span className="text-[10px] text-ink/40">Shown on cards</span>
              ) : (
                <button
                  type="button"
                  onClick={() => makeMain(image)}
                  className="text-[10px] font-bold text-lagoon hover:text-ink"
                >
                  Make main
                </button>
              )}
              <button
                type="button"
                onClick={() => remove(image)}
                aria-label="Remove photo"
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
      <p className={cn('mt-2 text-xs leading-relaxed text-ink/40')}>
        Up to 8 photos. They are resized on this device before upload, so a phone
        picture will not eat your data. Use your own photos of the actual rooms.
      </p>
    </div>
  )
}
