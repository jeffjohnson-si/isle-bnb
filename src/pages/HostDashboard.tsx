import { useCallback, useEffect, useState } from 'react'
import { Link, Navigate, useNavigate } from 'react-router-dom'
import { Icon } from '../components/Icons'
import { PhotoManager } from '../components/PhotoManager'
import { amenityChoices } from '../data/amenities'
import { listingById } from '../data/listings'
import {
  ApiError,
  fetchHostOverview,
  logoutHost,
  saveListingContent,
  setHostBookingStatus,
  type AdminBooking,
  type HostListingState,
  type HostOverview,
  type ListingContent,
} from '../lib/api'
import { clearHostToken, getHostToken } from '../lib/hostSession'
import { listingLocation } from '../lib/location'
import { cn, formatDate } from '../lib/utils'
import { usePageTitle } from '../lib/usePageTitle'

const statusLabel: Record<string, string> = {
  pending: 'Awaiting your reply',
  confirmed: 'Confirmed',
  declined: 'Declined',
  cancelled: 'Cancelled by guest',
}

const statusStyle: Record<string, string> = {
  pending: 'bg-sun/30 text-ink/70',
  confirmed: 'bg-palm/10 text-palm',
  declined: 'bg-coral/10 text-coral',
  cancelled: 'bg-ink/10 text-ink/50',
}

const listingStatus: Record<string, { label: string; tone: string; note: string }> = {
  live: {
    label: 'Live',
    tone: 'bg-palm/10 text-palm',
    note: 'Guests can find and request this listing.',
  },
  pending: {
    label: 'In review',
    tone: 'bg-sun/30 text-ink/70',
    note: 'Our team is checking it, usually within two business days. You can keep editing meanwhile.',
  },
  rejected: {
    label: 'Not approved',
    tone: 'bg-coral/10 text-coral',
    note: 'This listing was not approved. Contact hosts@islebnb.com and we will explain why.',
  },
}

/** A draft created from an application has no photos yet, so it is not with the team. */
const isDraft = (listing: HostListingState) =>
  listing.status === 'pending' && (listing.content?.images?.length ?? 0) === 0

const statusNote = (listing: HostListingState) => {
  if (isDraft(listing)) {
    return 'Add at least one photo and save — it goes to our team as soon as you do.'
  }
  return listingStatus[listing.status]?.note ?? ''
}

const statusBadge = (listing: HostListingState) =>
  isDraft(listing)
    ? { label: 'Draft', tone: 'bg-ink/10 text-ink/60' }
    : (listingStatus[listing.status] ?? listingStatus.pending)

function ListingEditor({
  token,
  state,
  onSaved,
}: {
  token: string
  state: HostListingState
  onSaved: (listingId: string, content: ListingContent) => void
}) {
  const seeded = listingById(state.listingId)
  const content = state.content

  const [form, setForm] = useState({
    name: content?.name ?? seeded?.name ?? '',
    island: content?.island ?? seeded?.island ?? '',
    area: content?.area ?? seeded?.area ?? '',
    province: content?.province ?? seeded?.province ?? '',
    price: String(content?.price ?? seeded?.price ?? 0),
    summary: content?.summary ?? seeded?.summary ?? '',
    description: content?.description ?? seeded?.description ?? '',
    guests: String(content?.guests ?? seeded?.guests ?? 2),
    bedrooms: String(content?.bedrooms ?? seeded?.bedrooms ?? 1),
    beds: String(content?.beds ?? seeded?.beds ?? 1),
    baths: String(content?.baths ?? seeded?.baths ?? 1),
  })
  const [amenities, setAmenities] = useState<string[]>(
    content?.amenities ?? seeded?.amenities ?? [],
  )
  const [images, setImages] = useState<string[]>(content?.images ?? seeded?.images ?? [])
  const [fields, setFields] = useState<Record<string, string>>({})
  const [saved, setSaved] = useState('')
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  const currency = content?.currency ?? seeded?.currency ?? 'USD'
  const choices = [...new Set([...amenityChoices, ...amenities])]

  const set = (key: keyof typeof form, value: string) => {
    setForm((current) => ({ ...current, [key]: value }))
    setFields((current) => ({ ...current, [key]: '' }))
    setSaved('')
  }

  const toggleAmenity = (amenity: string) => {
    setAmenities((current) =>
      current.includes(amenity)
        ? current.filter((item) => item !== amenity)
        : [...current, amenity],
    )
    setSaved('')
  }

  const submit = async (event: React.FormEvent) => {
    event.preventDefault()
    setSaving(true)
    setError('')
    setSaved('')
    try {
      const result = await saveListingContent(token, state.listingId, {
        name: form.name.trim(),
        island: form.island.trim(),
        area: form.area.trim(),
        province: form.province.trim(),
        price: Number(form.price) || 0,
        summary: form.summary.trim(),
        description: form.description.trim(),
        guests: Number(form.guests) || 1,
        bedrooms: Number(form.bedrooms) || 0,
        beds: Number(form.beds) || 0,
        baths: Number(form.baths) || 0,
        amenities,
        images,
      })
      onSaved(state.listingId, result)
      setSaved(
        state.status === 'live'
          ? 'Published — visitors see this on their next page load.'
          : 'Saved. Your changes will show when the listing is approved.',
      )
    } catch (saveError) {
      if (saveError instanceof ApiError) setFields(saveError.fields)
      setError(saveError instanceof Error ? saveError.message : 'Could not save the listing.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <form onSubmit={submit} className="card p-6" noValidate>
      <h2 className="font-display text-xl font-semibold text-ink">Rate and details</h2>
      <p className="mt-1 text-sm leading-relaxed text-ink/55">
        These are the details guests see. You can change them at any time.
      </p>

      <div className="mt-5 grid gap-4 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <label htmlFor="hostName" className="field-label">
            Property name
          </label>
          <input
            id="hostName"
            value={form.name}
            onChange={(event) => set('name', event.target.value)}
            className={cn('field', fields.name && 'border-coral')}
            aria-invalid={Boolean(fields.name)}
          />
          {fields.name && (
            <p className="mt-1 text-xs font-semibold text-coral">{fields.name}</p>
          )}
        </div>

        <div>
          <label htmlFor="hostIsland" className="field-label">
            Island
          </label>
          <input
            id="hostIsland"
            value={form.island}
            onChange={(event) => set('island', event.target.value)}
            className={cn('field', fields.island && 'border-coral')}
            aria-invalid={Boolean(fields.island)}
          />
          {fields.island && (
            <p className="mt-1 text-xs font-semibold text-coral">{fields.island}</p>
          )}
        </div>
        <div>
          <label htmlFor="hostArea" className="field-label">
            Town / village / area
          </label>
          <input
            id="hostArea"
            value={form.area}
            onChange={(event) => set('area', event.target.value)}
            className={cn('field', fields.area && 'border-coral')}
            aria-invalid={Boolean(fields.area)}
          />
          {fields.area && (
            <p className="mt-1 text-xs font-semibold text-coral">{fields.area}</p>
          )}
        </div>
        <div className="sm:col-span-2">
          <label htmlFor="hostProvince" className="field-label">
            Province (optional)
          </label>
          <input
            id="hostProvince"
            value={form.province}
            onChange={(event) => set('province', event.target.value)}
            className="field"
            placeholder="Western Province"
          />
        </div>

        <div className="sm:col-span-2">
          <label htmlFor="hostRate" className="field-label">
            Nightly rate ({currency})
          </label>
          <input
            id="hostRate"
            type="number"
            min="0"
            step="1"
            inputMode="numeric"
            value={form.price}
            onChange={(event) => set('price', event.target.value)}
            className={cn('field', fields.price && 'border-coral')}
            aria-invalid={Boolean(fields.price)}
          />
          {fields.price ? (
            <p className="mt-1 text-xs font-semibold text-coral">{fields.price}</p>
          ) : (
            <p className="mt-1 text-xs text-ink/40">
              Enter 0 to show “Rate on request” — useful while you settle on a price.
            </p>
          )}
        </div>

        <div>
          <label htmlFor="hostGuests" className="field-label">
            Sleeps
          </label>
          <input
            id="hostGuests"
            type="number"
            min="1"
            max="50"
            value={form.guests}
            onChange={(event) => set('guests', event.target.value)}
            className={cn('field', fields.guests && 'border-coral')}
          />
        </div>
        <div>
          <label htmlFor="hostBedrooms" className="field-label">
            Bedrooms
          </label>
          <input
            id="hostBedrooms"
            type="number"
            min="0"
            max="50"
            value={form.bedrooms}
            onChange={(event) => set('bedrooms', event.target.value)}
            className={cn('field', fields.bedrooms && 'border-coral')}
          />
        </div>
        <div>
          <label htmlFor="hostBeds" className="field-label">
            Beds
          </label>
          <input
            id="hostBeds"
            type="number"
            min="0"
            max="100"
            value={form.beds}
            onChange={(event) => set('beds', event.target.value)}
            className={cn('field', fields.beds && 'border-coral')}
          />
        </div>
        <div>
          <label htmlFor="hostBaths" className="field-label">
            Bathrooms
          </label>
          <input
            id="hostBaths"
            type="number"
            min="0"
            max="50"
            value={form.baths}
            onChange={(event) => set('baths', event.target.value)}
            className={cn('field', fields.baths && 'border-coral')}
          />
        </div>

        <div className="sm:col-span-2">
          <label htmlFor="hostSummary" className="field-label">
            One-line summary
          </label>
          <input
            id="hostSummary"
            value={form.summary}
            onChange={(event) => set('summary', event.target.value)}
            maxLength={200}
            className={cn('field', fields.summary && 'border-coral')}
            placeholder="Waterfront rooms with a reef straight off the deck"
          />
          {fields.summary && (
            <p className="mt-1 text-xs font-semibold text-coral">{fields.summary}</p>
          )}
        </div>

        <div className="sm:col-span-2">
          <label htmlFor="hostDescription" className="field-label">
            Description
          </label>
          <textarea
            id="hostDescription"
            rows={6}
            value={form.description}
            onChange={(event) => set('description', event.target.value)}
            className={cn('field resize-y', fields.description && 'border-coral')}
            aria-invalid={Boolean(fields.description)}
          />
          {fields.description ? (
            <p className="mt-1 text-xs font-semibold text-coral">{fields.description}</p>
          ) : (
            <p className="mt-1 text-xs text-ink/40">
              Rooms, the view, meals, transfers — what a guest should expect.
            </p>
          )}
        </div>

        <div className="sm:col-span-2">
          <span className="field-label">What you offer</span>
          <div className="flex flex-wrap gap-2">
            {choices.map((amenity) => {
              const active = amenities.includes(amenity)
              return (
                <button
                  key={amenity}
                  type="button"
                  onClick={() => toggleAmenity(amenity)}
                  aria-pressed={active}
                  className={cn(
                    'rounded-full border px-3.5 py-2 text-xs font-semibold transition',
                    active
                      ? 'border-palm bg-palm text-white'
                      : 'border-ink/15 bg-white text-ink/65 hover:border-ink/35',
                  )}
                >
                  {amenity}
                </button>
              )
            })}
          </div>
        </div>

        <div className="sm:col-span-2">
          <PhotoManager
            token={token}
            images={images}
            onChange={(next) => {
              setImages(next)
              setSaved('')
              setFields((current) => ({ ...current, images: '' }))
            }}
          />
          {fields.images && (
            <p className="mt-1 text-xs font-semibold text-coral">{fields.images}</p>
          )}
        </div>
      </div>

      {error && (
        <p className="mt-4 rounded-2xl bg-coral/10 px-4 py-3 text-sm font-semibold text-coral">
          {error}
        </p>
      )}
      {saved && (
        <p className="mt-4 rounded-2xl bg-palm/10 px-4 py-3 text-sm font-semibold text-palm">
          {saved}
        </p>
      )}

      <div className="mt-5 flex flex-wrap items-center gap-4">
        <button type="submit" disabled={saving} className="btn-primary disabled:cursor-wait">
          {saving ? 'Saving…' : 'Publish changes'}
          <Icon name="check" size={16} />
        </button>
        {state.status === 'live' ? (
          <Link to={`/stays/${state.listingId}`} className="btn-outline">
            View public page
          </Link>
        ) : (
          <span className="text-xs text-ink/40">
            The public page appears once the listing is approved.
          </span>
        )}
        {content?.updatedAt && (
          <p className="text-xs text-ink/40">
            Last saved {new Date(content.updatedAt).toLocaleString('en-GB')}
          </p>
        )}
      </div>
    </form>
  )
}

function BookingRow({
  token,
  booking,
  onChanged,
}: {
  token: string
  booking: AdminBooking
  onChanged: (booking: AdminBooking) => void
}) {
  const [busy, setBusy] = useState('')
  const [error, setError] = useState('')

  const update = async (status: 'pending' | 'confirmed' | 'declined') => {
    setBusy(status)
    setError('')
    try {
      onChanged(await setHostBookingStatus(token, booking.reference, status))
    } catch (updateError) {
      setError(updateError instanceof Error ? updateError.message : 'Could not update.')
    } finally {
      setBusy('')
    }
  }

  return (
    <article className="rounded-2xl border border-ink/10 bg-white p-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <p className="flex flex-wrap items-center gap-2 text-sm font-semibold text-ink">
            {booking.guest_name}
            <span
              className={cn(
                'rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider',
                statusStyle[booking.status] ?? statusStyle.pending,
              )}
            >
              {statusLabel[booking.status] ?? booking.status}
            </span>
          </p>
          <p className="mt-1 text-sm text-ink/60">
            {formatDate(booking.check_in)} → {formatDate(booking.check_out)} ·{' '}
            {booking.nights} night{booking.nights === 1 ? '' : 's'} · {booking.guests} guest
            {booking.guests === 1 ? '' : 's'}
          </p>
        </div>
        <div className="text-right">
          <p className="font-mono text-[11px] font-semibold text-ink/45">{booking.reference}</p>
          <p className="mt-1 text-sm font-semibold text-ink">
            {booking.total > 0
              ? `${booking.currency} ${booking.total.toLocaleString()}`
              : 'Rate to confirm'}
          </p>
          <p className="text-[10px] font-bold uppercase tracking-wider text-ink/35">
            Pay on arrival
          </p>
        </div>
      </div>

      {booking.notes && (
        <p className="mt-3 rounded-xl bg-sand px-3 py-2 text-sm leading-relaxed text-ink/70">
          {booking.notes}
        </p>
      )}

      <div className="mt-3 flex flex-wrap items-center gap-4 text-sm">
        <a
          href={`mailto:${booking.guest_email}`}
          className="inline-flex items-center gap-1.5 font-semibold text-lagoon hover:text-ink"
        >
          <Icon name="mail" size={15} />
          {booking.guest_email}
        </a>
        <a
          href={`tel:${booking.guest_phone}`}
          className="inline-flex items-center gap-1.5 font-semibold text-lagoon hover:text-ink"
        >
          <Icon name="phone" size={15} />
          {booking.guest_phone}
        </a>
      </div>

      {booking.status !== 'cancelled' && (
        <div className="mt-3 flex flex-wrap gap-2">
          {booking.status !== 'confirmed' && (
            <button
              type="button"
              onClick={() => void update('confirmed')}
              disabled={Boolean(busy)}
              className="rounded-full bg-palm px-4 py-2 text-xs font-bold text-white transition hover:bg-ink disabled:cursor-wait"
            >
              {busy === 'confirmed' ? 'Confirming…' : 'Confirm'}
            </button>
          )}
          {booking.status !== 'declined' && (
            <button
              type="button"
              onClick={() => void update('declined')}
              disabled={Boolean(busy)}
              className="rounded-full border border-coral/40 px-4 py-2 text-xs font-bold text-coral transition hover:bg-coral/10 disabled:cursor-wait"
            >
              Decline
            </button>
          )}
          {booking.status !== 'pending' && (
            <button
              type="button"
              onClick={() => void update('pending')}
              disabled={Boolean(busy)}
              className="rounded-full border border-ink/15 px-4 py-2 text-xs font-bold text-ink/60 transition hover:border-ink/35 disabled:cursor-wait"
            >
              Back to pending
            </button>
          )}
        </div>
      )}

      {error && <p className="mt-2 text-xs font-semibold text-coral">{error}</p>}
    </article>
  )
}

export function HostDashboardPage() {
  usePageTitle('Host dashboard · Isle BnB')
  const navigate = useNavigate()
  const token = getHostToken()

  const [data, setData] = useState<HostOverview | null>(null)
  const [activeId, setActiveId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const load = useCallback(
    async (activeToken: string) => {
      setLoading(true)
      setError('')
      try {
        setData(await fetchHostOverview(activeToken))
      } catch (loadError) {
        if (loadError instanceof ApiError && /sign in/i.test(loadError.message)) {
          clearHostToken()
          navigate('/host/login', { replace: true })
          return
        }
        setError(loadError instanceof Error ? loadError.message : 'Could not load your dashboard.')
      } finally {
        setLoading(false)
      }
    },
    [navigate],
  )

  useEffect(() => {
    if (token) void load(token)
  }, [token, load])

  if (!token) return <Navigate to="/host/login" replace />

  const signOut = async () => {
    await logoutHost(token).catch(() => {})
    clearHostToken()
    navigate('/host/login', { replace: true })
  }

  const active =
    data?.listings.find((listing) => listing.listingId === activeId) ?? data?.listings[0] ?? null

  const applyContent = (listingId: string, content: ListingContent) => {
    setData((current) =>
      current
        ? {
            ...current,
            listings: current.listings.map((listing) =>
              listing.listingId === listingId
                ? { ...listing, content, listingName: content.name ?? listing.listingName }
                : listing,
            ),
          }
        : current,
    )
  }

  const applyBooking = (listingId: string, booking: AdminBooking) => {
    setData((current) =>
      current
        ? {
            ...current,
            listings: current.listings.map((listing) =>
              listing.listingId === listingId
                ? {
                    ...listing,
                    bookings: listing.bookings.map((row) =>
                      row.reference === booking.reference ? booking : row,
                    ),
                  }
                : listing,
            ),
          }
        : current,
    )
  }

  const cover = (listing: HostListingState) =>
    listing.content?.images?.[0] ?? listingById(listing.listingId)?.images[0] ?? null

  const where = (listing: HostListingState) => {
    const seeded = listingById(listing.listingId)
    if (listing.content?.island) {
      return [listing.content.area, listing.content.island, listing.content.province]
        .filter(Boolean)
        .join(' · ')
    }
    return seeded ? listingLocation(seeded) : 'Verified property'
  }

  return (
    <div className="section pt-10">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-lagoon">
            Host
          </p>
          <h1 className="mt-2 font-display text-3xl font-semibold text-ink">
            {data?.host.name ? `Welcome back, ${data.host.name.split(' ')[0]}` : 'Your listings'}
          </h1>
          <p className="mt-1 text-sm text-ink/55">{data?.host.email ?? 'Loading…'}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link to="/host/new" className="btn-primary">
            Add a listing
            <Icon name="arrowRight" size={16} />
          </Link>
          <button type="button" onClick={() => void signOut()} className="btn-outline">
            Sign out
          </button>
        </div>
      </div>

      {loading && !data && (
        <div className="card mt-8 px-6 py-16 text-center text-sm text-ink/55">
          Loading your listings…
        </div>
      )}

      {error && (
        <div className="mt-6 flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-coral/30 bg-coral/5 px-5 py-4">
          <p className="text-sm font-semibold text-coral">{error}</p>
          <button type="button" onClick={() => void load(token)} className="btn-outline">
            Try again
          </button>
        </div>
      )}

      {data && data.listings.length === 0 && (
        <div className="card mt-8 px-6 py-16 text-center">
          <h2 className="text-xl font-semibold text-ink">No properties on this account yet</h2>
          <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-ink/60">
            Add your first property here. Our team checks it, usually within two business
            days, and then guests can find it.
          </p>
          <Link to="/host/new" className="btn-primary mt-6">
            Add a listing
            <Icon name="arrowRight" size={16} />
          </Link>
        </div>
      )}

      {active && (
        <>
          {data!.listings.length > 1 && (
            <div className="mt-6 flex flex-wrap gap-2">
              {data!.listings.map((listing) => (
                <button
                  key={listing.listingId}
                  type="button"
                  onClick={() => setActiveId(listing.listingId)}
                  aria-pressed={active.listingId === listing.listingId}
                  className={cn(
                    'rounded-full px-4 py-2 text-sm font-semibold transition',
                    active.listingId === listing.listingId
                      ? 'bg-deep text-sand shadow-card'
                      : 'border border-ink/12 bg-white text-ink/60 hover:border-ink/30 hover:text-ink',
                  )}
                >
                  {listing.listingName}
                </button>
              ))}
            </div>
          )}

          <div className="mt-6 grid gap-6 lg:grid-cols-[1.15fr_1fr]">
            <div className="space-y-4">
              <div className="card overflow-hidden sm:flex">
                {cover(active) ? (
                  <img
                    src={cover(active)!}
                    alt={active.listingName}
                    className="h-40 w-full object-cover sm:h-auto sm:w-40 sm:shrink-0"
                  />
                ) : (
                  <div className="flex h-40 w-full flex-col items-center justify-center gap-1.5 bg-mist text-ink/35 sm:h-auto sm:w-40 sm:shrink-0">
                    <Icon name="sparkles" size={20} />
                    <span className="text-[10px] font-semibold uppercase tracking-wider">
                      No photos yet
                    </span>
                  </div>
                )}
                <div className="flex flex-1 flex-col justify-center gap-1 p-5">
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="font-display text-lg font-semibold text-ink">
                      {active.listingName}
                    </h2>
                    <span
                      className={cn(
                        'rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider',
                        statusBadge(active).tone,
                      )}
                    >
                      {statusBadge(active).label}
                    </span>
                  </div>
                  <p className="text-sm text-ink/55">{where(active)}</p>
                  <p className="mt-1 text-xs font-semibold uppercase tracking-wider text-palm">
                    {active.content?.price
                      ? `${active.content.currency ?? 'USD'} ${active.content.price.toLocaleString()} / night`
                      : 'Rate on request'}
                  </p>
                  {active.status !== 'live' && (
                    <p className="mt-2 text-xs leading-relaxed text-ink/45">
                      {statusNote(active)}
                    </p>
                  )}
                </div>
              </div>

              <ListingEditor
                key={active.listingId}
                token={token}
                state={active}
                onSaved={applyContent}
              />
            </div>

            <div className="card p-6">
              <div className="flex items-center justify-between gap-3">
                <h2 className="font-display text-xl font-semibold text-ink">
                  Booking requests
                </h2>
                <span className="chip bg-shell text-ink/70">{active.bookings.length}</span>
              </div>
              <p className="mt-1 text-sm leading-relaxed text-ink/55">
                Reply by confirming or declining. The guest sees your answer in “My
                bookings”, and you settle payment with them on arrival.
              </p>

              <div className="mt-4 space-y-3">
                {active.bookings.length === 0 ? (
                  <p className="rounded-2xl bg-sand px-4 py-6 text-center text-sm text-ink/50">
                    No requests for this property yet.
                  </p>
                ) : (
                  active.bookings.map((booking) => (
                    <BookingRow
                      key={booking.reference}
                      token={token}
                      booking={booking}
                      onChanged={(updated) => applyBooking(active.listingId, updated)}
                    />
                  ))
                )}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
