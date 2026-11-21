import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Icon } from '../components/Icons'
import { listingById } from '../data/listings'
import { countryByCode } from '../data/countries'
import { cancelBookingRequest, fetchBookings } from '../lib/api'
import { getMyReferences, removeMyReference } from '../lib/storage'
import { formatMoney } from '../lib/money'
import { formatDate } from '../lib/utils'
import { usePageTitle } from '../lib/usePageTitle'
import type { Booking } from '../types'

type Row = Booking & { status: string }

const statusCopy: Record<string, string> = {
  pending: 'Awaiting host confirmation',
  confirmed: 'Confirmed by the property',
  declined: 'Declined by the property',
  cancelled: 'Cancelled',
}

const statusTone = (status: string) =>
  status === 'confirmed'
    ? 'bg-palm/10 text-palm'
    : status === 'declined'
      ? 'bg-coral/10 text-coral'
      : status === 'cancelled'
        ? 'bg-ink/10 text-ink/50'
        : 'bg-sun/30 text-ink/70'

export function BookingsPage() {
  usePageTitle('My bookings · Isle BnB')

  const [bookings, setBookings] = useState<Row[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const rows = await fetchBookings(getMyReferences())
      setBookings(rows)
    } catch (loadError) {
      setError(
        loadError instanceof Error
          ? loadError.message
          : 'Could not load your bookings.',
      )
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  const cancel = async (reference: string) => {
    const confirmed = window.confirm(
      'Cancel this booking request? The property will see it as cancelled.',
    )
    if (!confirmed) return
    try {
      await cancelBookingRequest(reference)
      removeMyReference(reference)
      setBookings((current) => current.filter((item) => item.reference !== reference))
    } catch (cancelError) {
      setError(
        cancelError instanceof Error ? cancelError.message : 'Could not cancel.',
      )
    }
  }

  return (
    <div className="section pt-10">
      <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-lagoon">
        Traveller
      </p>
      <h1 className="mt-2 font-display text-3xl font-semibold text-ink sm:text-[2.6rem]">
        My bookings
      </h1>
      <p className="mt-2 max-w-xl text-sm leading-relaxed text-ink/60">
        Requests you have sent through Isle BnB. Nothing has been charged — pay each
        property when you arrive.
      </p>

      {error && (
        <div className="mt-6 flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-coral/30 bg-coral/5 px-5 py-4">
          <p className="text-sm font-semibold text-coral">{error}</p>
          <button type="button" onClick={() => void load()} className="btn-outline">
            Try again
          </button>
        </div>
      )}

      {loading ? (
        <div className="card mt-8 px-6 py-16 text-center">
          <p className="text-sm text-ink/55">Loading your bookings…</p>
        </div>
      ) : bookings.length === 0 ? (
        <div className="card mt-8 px-6 py-16 text-center">
          <span className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-mist text-lagoon">
            <Icon name="calendar" size={26} />
          </span>
          <h2 className="mt-5 text-xl font-semibold text-ink">No bookings yet</h2>
          <p className="mx-auto mt-2 max-w-sm text-sm leading-relaxed text-ink/60">
            Once you request a stay it will appear here with the dates, the total to pay
            on arrival, and your reference number.
          </p>
          <Link to="/explore" className="btn-primary mt-6">
            Find a stay
            <Icon name="arrowRight" size={16} />
          </Link>
        </div>
      ) : (
        <div className="mt-8 space-y-4">
          {bookings.map((booking) => {
            const listing = listingById(booking.listingId)
            const country = countryByCode(booking.country)
            const closed = booking.status === 'cancelled' || booking.status === 'declined'
            return (
              <article
                key={booking.reference}
                className="card overflow-hidden sm:flex sm:items-stretch"
              >
                <div className="sm:w-52 sm:shrink-0">
                  {listing ? (
                    <img
                      src={listing.images[0]}
                      alt={booking.listingName}
                      className="h-40 w-full object-cover sm:h-full"
                      loading="lazy"
                    />
                  ) : (
                    <div className="h-40 w-full bg-mist sm:h-full" />
                  )}
                </div>

                <div className="flex flex-1 flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <span
                        className={`rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider ${statusTone(booking.status)}`}
                      >
                        {statusCopy[booking.status] ?? 'Awaiting host confirmation'}
                      </span>
                      <span className="text-xs font-semibold text-ink/40">
                        Ref {booking.reference}
                      </span>
                    </div>
                    <h2 className="mt-2 text-lg font-semibold text-ink">
                      {listing ? (
                        <Link to={`/stays/${listing.id}`} className="hover:underline">
                          {booking.listingName}
                        </Link>
                      ) : (
                        booking.listingName
                      )}
                    </h2>
                    <p className="text-sm text-ink/55">
                      {booking.region ??
                        `${booking.island}${country ? ` · ${country.name}` : ''}`}
                    </p>
                    <p className="mt-2 text-sm text-ink/70">
                      {formatDate(booking.checkIn)} → {formatDate(booking.checkOut)} ·{' '}
                      {booking.nights} night{booking.nights > 1 ? 's' : ''} ·{' '}
                      {booking.guests} guest{booking.guests > 1 ? 's' : ''}
                    </p>
                  </div>

                  <div className="text-left sm:text-right">
                    <p className="text-xs font-semibold uppercase tracking-widest text-ink/40">
                      Pay on arrival
                    </p>
                    <p className="mt-1 font-display text-2xl font-semibold text-ink">
                      {booking.total > 0
                        ? formatMoney(booking.total, booking.currency)
                        : 'Rate on arrival'}
                    </p>
                    {!closed && (
                      <button
                        type="button"
                        onClick={() => void cancel(booking.reference)}
                        className="mt-3 text-xs font-semibold text-coral hover:underline"
                      >
                        Cancel request
                      </button>
                    )}
                  </div>
                </div>
              </article>
            )
          })}
        </div>
      )}

      <p className="mt-8 max-w-2xl text-xs leading-relaxed text-ink/40">
        Bookings are stored against the reference number on our server. This device
        remembers which references are yours — keep the reference if you switch device
        or clear your browser data.
      </p>
    </div>
  )
}
