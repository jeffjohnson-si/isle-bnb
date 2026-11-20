import type { Booking } from '../types'

const base = (import.meta.env.VITE_API_BASE ?? '').replace(/\/$/, '')
const apiUrl = (path: string) => `${base}${path}`

export class ApiError extends Error {
  fields: Record<string, string>

  constructor(message: string, fields: Record<string, string> = {}) {
    super(message)
    this.name = 'ApiError'
    this.fields = fields
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  let response: Response
  try {
    response = await fetch(apiUrl(path), {
      headers: { 'content-type': 'application/json' },
      ...init,
    })
  } catch {
    throw new ApiError(
      'Could not reach the booking service. Check your connection and try again.',
    )
  }

  const payload = (await response.json().catch(() => ({}))) as Record<string, unknown>
  if (!response.ok) {
    throw new ApiError(
      typeof payload.error === 'string' ? payload.error : 'Request failed',
      (payload.fields as Record<string, string>) ?? {},
    )
  }
  return payload as T
}

interface BookingRow {
  reference: string
  listing_id: string
  listing_name: string
  country: string
  island: string
  region: string | null
  check_in: string
  check_out: string
  guests: number
  nights: number
  guest_name: string
  guest_email: string
  guest_phone: string
  notes: string | null
  total: number
  currency: string
  status: string
  created_at: string
}

const toBooking = (row: BookingRow): Booking & { status: string } => ({
  reference: row.reference,
  listingId: row.listing_id,
  listingName: row.listing_name,
  country: row.country,
  island: row.island,
  region: row.region ?? undefined,
  checkIn: row.check_in,
  checkOut: row.check_out,
  guests: row.guests,
  nights: row.nights,
  guestName: row.guest_name,
  guestEmail: row.guest_email,
  guestPhone: row.guest_phone,
  notes: row.notes ?? '',
  total: row.total,
  currency: row.currency,
  createdAt: row.created_at,
  status: row.status,
})

export interface BookingInput {
  listingId: string
  listingName: string
  country: string
  island: string
  region?: string
  checkIn: string
  checkOut: string
  guests: number
  total: number
  currency: string
  guestName: string
  guestEmail: string
  guestPhone: string
  notes: string
}

export async function createBooking(input: BookingInput) {
  const data = await request<{ booking: BookingRow }>('/api/bookings', {
    method: 'POST',
    body: JSON.stringify(input),
  })
  return toBooking(data.booking)
}

export async function fetchBookings(references: string[]) {
  if (!references.length) return []
  const data = await request<{ bookings: BookingRow[] }>(
    `/api/bookings?refs=${encodeURIComponent(references.join(','))}`,
  )
  return data.bookings.map(toBooking)
}

export async function cancelBookingRequest(reference: string) {
  await request(`/api/bookings/${encodeURIComponent(reference)}`, {
    method: 'DELETE',
  })
}

export interface ApplicationInput {
  propertyName: string
  type: string
  country: string
  island: string
  area: string
  address: string
  nightlyRate: number
  currency: string
  guests: number
  bedrooms: number
  description: string
  amenities: string[]
  contactName: string
  email: string
  phone: string
}

export async function createApplication(input: ApplicationInput) {
  const data = await request<{
    application: { reference: string; status: string }
  }>('/api/applications', {
    method: 'POST',
    body: JSON.stringify(input),
  })
  return data.application
}

export async function apiIsUp() {
  try {
    await request('/api/health')
    return true
  } catch {
    return false
  }
}
