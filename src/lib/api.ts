import type { Booking } from '../types'
import type { ListingOverride } from '../data/listings'

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
      ...init,
      headers: { 'content-type': 'application/json', ...init?.headers },
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

/* ── claims ─────────────────────────────────────────────────────────────── */

export interface ClaimInput {
  listingId: string
  listingName: string
  claimantName: string
  role: string
  email: string
  phone: string
  proofType: string
  proofDetail: string
}

export async function submitClaim(input: ClaimInput) {
  const data = await request<{
    claim: { reference: string; status: string }
  }>('/api/claims', {
    method: 'POST',
    body: JSON.stringify(input),
  })
  return data.claim
}

/** Listing ids claimed by an owner the team has verified. */
export async function fetchVerifiedClaims() {
  try {
    const data = await request<{ listingIds: string[] }>('/api/claims/verified')
    return data.listingIds
  } catch {
    // A missing claim service must never break a listing page.
    return []
  }
}

/* ── admin ──────────────────────────────────────────────────────────────── */

export interface AdminClaim {
  reference: string
  listing_id: string
  listing_name: string
  claimant_name: string
  role: string
  email: string
  phone: string
  proof_type: string
  proof_detail: string | null
  status: 'pending' | 'verified' | 'rejected'
  created_at: string
}

export interface AdminApplication {
  reference: string
  property_name: string
  type: string
  country: string
  island: string
  area: string
  address: string | null
  nightly_rate: number
  currency: string
  guests: number
  bedrooms: number
  description: string
  amenities: string
  contact_name: string
  email: string
  phone: string
  status: 'pending' | 'approved' | 'rejected'
  created_at: string
}

export interface AdminBooking {
  reference: string
  listing_name: string
  country: string
  island: string
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

const admin = (token: string) => ({ 'x-admin-token': token })

export async function fetchAdminClaims(token: string) {
  const data = await request<{ claims: AdminClaim[] }>('/api/admin/claims', {
    headers: admin(token),
  })
  return data.claims
}

export async function fetchAdminApplications(token: string) {
  const data = await request<{ applications: AdminApplication[] }>(
    '/api/admin/applications',
    { headers: admin(token) },
  )
  return data.applications
}

export async function fetchAdminBookings(token: string) {
  const data = await request<{ bookings: AdminBooking[] }>('/api/admin/bookings', {
    headers: admin(token),
  })
  return data.bookings
}

export async function setClaimStatus(
  token: string,
  reference: string,
  status: 'pending' | 'verified' | 'rejected',
) {
  const data = await request<{
    claim: AdminClaim
    host: HostIdentity | null
    inviteUrl: string | null
    invitePath: string | null
  }>(`/api/admin/claims/${encodeURIComponent(reference)}`, {
    method: 'PATCH',
    headers: admin(token),
    body: JSON.stringify({ status }),
  })
  return data
}

export async function setApplicationStatus(
  token: string,
  reference: string,
  status: 'pending' | 'approved' | 'rejected',
) {
  const data = await request<{ application: AdminApplication }>(
    `/api/admin/applications/${encodeURIComponent(reference)}`,
    { method: 'PATCH', headers: admin(token), body: JSON.stringify({ status }) },
  )
  return data.application
}

/* ── owner-published listing content ────────────────────────────────────── */

export async function fetchListingOverrides() {
  const data = await request<{ overrides: ListingOverride[] }>('/api/listings/overrides')
  return data.overrides
}

/* ── host accounts ──────────────────────────────────────────────────────── */

export interface HostIdentity {
  id: number
  name: string | null
  email: string
  status: 'invited' | 'active' | 'suspended'
}

export interface HostListingState {
  listingId: string
  listingName: string
  grantedAt: string
  override: ListingOverride | null
  bookings: AdminBooking[]
}

export interface HostOverview {
  host: HostIdentity
  listings: HostListingState[]
}

const asHost = (token: string) => ({ 'x-host-token': token })

export async function loginHost(email: string, password: string) {
  return request<{ token: string; expiresAt: string; host: HostIdentity }>(
    '/api/host/login',
    { method: 'POST', body: JSON.stringify({ email, password }) },
  )
}

export async function activateHost(token: string, name: string, password: string) {
  return request<{ token: string; expiresAt: string; host: HostIdentity }>(
    '/api/host/activate',
    { method: 'POST', body: JSON.stringify({ token, name, password }) },
  )
}

export async function logoutHost(token: string) {
  await request('/api/host/logout', { method: 'POST', headers: asHost(token) })
}

export async function fetchHostOverview(token: string) {
  return request<HostOverview>('/api/host/dashboard', { headers: asHost(token) })
}

export interface ListingOverrideInput {
  price: number
  summary: string
  description: string
  guests: number
  bedrooms: number
  beds: number
  baths: number
  amenities: string[]
}

export async function saveListingOverride(
  token: string,
  listingId: string,
  input: ListingOverrideInput,
) {
  const data = await request<{ override: ListingOverride }>(
    `/api/host/listings/${encodeURIComponent(listingId)}`,
    { method: 'PATCH', headers: asHost(token), body: JSON.stringify(input) },
  )
  return data.override
}

export async function setHostBookingStatus(
  token: string,
  reference: string,
  status: 'pending' | 'confirmed' | 'declined',
) {
  const data = await request<{ booking: AdminBooking }>(
    `/api/host/bookings/${encodeURIComponent(reference)}`,
    { method: 'PATCH', headers: asHost(token), body: JSON.stringify({ status }) },
  )
  return data.booking
}

/* ── admin: host accounts ───────────────────────────────────────────────── */

export interface AdminHost extends HostIdentity {
  createdAt: string
  listings: { listingId: string; listingName: string; grantedAt: string }[]
  inviteUrl: string | null
  /** Same link without an origin: resolved against whoever is viewing. */
  invitePath: string | null
}

export async function fetchAdminHosts(token: string) {
  const data = await request<{ hosts: AdminHost[] }>('/api/admin/hosts', {
    headers: admin(token),
  })
  return data.hosts
}

export async function reinviteHost(token: string, id: number) {
  const data = await request<{ host: HostIdentity; inviteUrl: string; invitePath: string }>(
    `/api/admin/hosts/${id}/reinvite`,
    { method: 'POST', headers: admin(token) },
  )
  return data
}

export async function setHostStatus(
  token: string,
  id: number,
  status: 'active' | 'suspended',
) {
  const data = await request<{ host: HostIdentity }>(`/api/admin/hosts/${id}`, {
    method: 'PATCH',
    headers: admin(token),
    body: JSON.stringify({ status }),
  })
  return data.host
}
