const KEYS = {
  /** References of bookings made on this device, used to look them up again. */
  references: 'islebnb.myreferences.v1',
  saved: 'islebnb.saved.v1',
} as const

function read<T>(key: string, fallback: T): T {
  try {
    const raw = window.localStorage.getItem(key)
    if (!raw) return fallback
    const parsed = JSON.parse(raw) as T
    return parsed ?? fallback
  } catch {
    return fallback
  }
}

function write<T>(key: string, value: T): void {
  try {
    window.localStorage.setItem(key, JSON.stringify(value))
  } catch {
    // Storage can be full or blocked (private mode) — the UI still works for
    // this session, we just cannot remember the reference afterwards.
  }
}

/** Only references live here — the bookings themselves are in the database. */
export const getMyReferences = (): string[] => read<string[]>(KEYS.references, [])

export function addMyReference(reference: string): void {
  const current = getMyReferences()
  if (!current.includes(reference)) write(KEYS.references, [reference, ...current])
}

export function removeMyReference(reference: string): void {
  write(
    KEYS.references,
    getMyReferences().filter((item) => item !== reference),
  )
}

export const getSaved = (): string[] => read<string[]>(KEYS.saved, [])

export function isSaved(id: string): boolean {
  return getSaved().includes(id)
}

export function toggleSaved(id: string): string[] {
  const current = getSaved()
  const next = current.includes(id)
    ? current.filter((x) => x !== id)
    : [...current, id]
  write(KEYS.saved, next)
  return next
}
