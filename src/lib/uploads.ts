/**
 * Photos are resized in the browser before they are uploaded: phones produce
 * 4–8 MB files, and island connections should not have to carry them. The canvas
 * re-encode also strips EXIF location data, which the host did not agree to share.
 */
const MAX_EDGE = 1600
const QUALITY = 0.82

export async function compressImage(file: File): Promise<Blob> {
  if (!file.type.startsWith('image/')) {
    throw new Error('That file is not an image. Use a JPEG, PNG or WebP photo.')
  }

  try {
    const bitmap = await createImageBitmap(file)
    const scale = Math.min(1, MAX_EDGE / Math.max(bitmap.width, bitmap.height))
    const width = Math.max(1, Math.round(bitmap.width * scale))
    const height = Math.max(1, Math.round(bitmap.height * scale))

    const canvas = document.createElement('canvas')
    canvas.width = width
    canvas.height = height
    const context = canvas.getContext('2d')
    if (!context) return file

    context.drawImage(bitmap, 0, 0, width, height)
    bitmap.close?.()

    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, 'image/webp', QUALITY),
    )
    return blob ?? file
  } catch {
    // Older browsers, or a format the canvas cannot read: let the server decide.
    return file
  }
}
