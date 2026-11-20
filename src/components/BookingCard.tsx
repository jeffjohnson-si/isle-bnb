import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import type { Booking, Listing } from '../types'
import { Icon } from './Icons'
import { createBooking } from '../lib/api'
import { addMyReference } from '../lib/storage'
import { approxUsd, formatMoney } from '../lib/money'
import { addDays, cn, formatDate, nightsBetween, todayISO } from '../lib/utils'
import { countryByCode } from '../data/countries'
import { listingRegion } from '../lib/location'

type Errors = Record<string, string>

export function BookingCard({ listing }: { listing: Listing }) {
  const today = todayISO()
  const [checkIn, setCheckIn] = useState('')
  const [checkOut, setCheckOut] = useState('')
  const [guests, setGuests] = useState(Math.min(2, listing.guests))
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [notes, setNotes] = useState('')
  const [errors, setErrors] = useState<Errors>({})
  const [confirmation, setConfirmation] = useState<Booking | null>(null)
  const [sending, setSending] = useState(false)
  const [submitError, setSubmitError] = useState('')

  const nights = nightsBetween(checkIn, checkOut)
  const hasRate = listing.price > 0
  const hasRating = listing.reviews > 0
  const propertyKind = listing.type.toLowerCase()
  const usd = hasRate ? approxUsd(listing.price, listing.currency) : null
  const subtotal = nights * listing.price
  const totalUsd = subtotal > 0 ? approxUsd(subtotal, listing.currency) : null
  const country = countryByCode(listing.country)
  const minCheckOut = useMemo(
    () => (checkIn ? addDays(checkIn, 1) : addDays(today, 1)),
    [checkIn, today],
  )

  const validate = (): Errors => {
    const next: Errors = {}
    if (!checkIn) next.checkIn = 'Choose a check-in date'
    if (!checkOut) next.checkOut = 'Choose a check-out date'
    if (checkIn && checkIn < today) next.checkIn = 'Check-in cannot be in the past'
    if (checkIn && checkOut && nights === 0) {
      next.checkOut = 'Check-out must be after check-in'
    }
    if (!name.trim()) next.name = 'We need a name for the booking'
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email.trim())) {
      next.email = 'Enter a valid email address'
    }
    if (phone.trim().replace(/[^\d]/g, '').length < 6) {
      next.phone = 'Enter a phone number the host can reach you on'
    }
    return next
  }

  const submit = async (event: React.FormEvent) => {
    event.preventDefault()
    const found = validate()
    setErrors(found)
    if (Object.keys(found).length > 0) return

    setSending(true)
    setSubmitError('')
    try {
      const booking = await createBooking({
        listingId: listing.id,
        listingName: listing.name,
        country: listing.country,
        island: listing.island,
        region: listingRegion(listing),
        checkIn,
        checkOut,
        guests,
        total: subtotal,
        currency: listing.currency,
        guestName: name.trim(),
        guestEmail: email.trim(),
        guestPhone: phone.trim(),
        notes: notes.trim(),
      })
      addMyReference(booking.reference)
      setConfirmation(booking)
    } catch (error) {
      setSubmitError(
        error instanceof Error
          ? error.message
          : 'Could not send the request. Please try again.',
      )
    } finally {
      setSending(false)
    }
  }

  if (confirmation) {
    return (
      <div className="card overflow-hidden p-6">
        <div className="flex items-center gap-3">
          <span className="grid h-10 w-10 place-items-center rounded-full bg-palm/10 text-palm">
            <Icon name="check" size={20} />
          </span>
          <div>
            <h3 className="text-lg font-semibold text-ink">Booking request saved</h3>
            <p className="text-xs font-semibold uppercase tracking-widest text-ink/40">
              Ref {confirmation.reference}
            </p>
          </div>
        </div>

        <dl className="mt-5 space-y-2.5 border-t border-ink/10 pt-4 text-sm">
          <div className="flex justify-between gap-4">
            <dt className="text-ink/55">Stay</dt>
            <dd className="text-right font-semibold text-ink">{listing.name}</dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="text-ink/55">Dates</dt>
            <dd className="text-right font-semibold text-ink">
              {formatDate(confirmation.checkIn)} → {formatDate(confirmation.checkOut)}
            </dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="text-ink/55">Guests</dt>
            <dd className="text-right font-semibold text-ink">
              {confirmation.guests} guest{confirmation.guests > 1 ? 's' : ''}
            </dd>
          </div>
          <div className="flex justify-between gap-4 border-t border-ink/10 pt-3">
            <dt className="text-ink/55">Pay on arrival</dt>
            <dd className="text-right font-bold text-ink">
              {confirmation.total > 0
                ? formatMoney(confirmation.total, confirmation.currency)
                : `Rate confirmed by the ${propertyKind}`}
            </dd>
          </div>
        </dl>

        <p className="mt-4 rounded-2xl bg-mist px-4 py-3 text-xs leading-relaxed text-palm">
          {listing.host.name} will confirm your request and the nightly rate. Nothing is
          charged online — you settle with them in {listing.currency} (or USD) when you
          check in.
        </p>

        <div className="mt-5 flex flex-col gap-2">
          <Link to="/bookings" className="btn-dark w-full">
            View my bookings
          </Link>
          <button
            type="button"
            onClick={() => {
              setConfirmation(null)
              setCheckIn('')
              setCheckOut('')
            }}
            className="btn-ghost w-full"
          >
            Book different dates
          </button>
        </div>

        <p className="mt-4 text-[11px] leading-relaxed text-ink/35">
          Keep this reference. You can find the request again under My bookings on this
          device, or quote it to the property.
        </p>
      </div>
    )
  }

  return (
    <form
      onSubmit={submit}
      className="card p-5 sm:p-6"
      noValidate
      data-nightly-rate={listing.price}
      data-currency={listing.currency}
    >
      <div className="flex items-baseline justify-between gap-3">
        <p className="text-ink">
          {hasRate ? (
            <>
              <span className="font-display text-2xl font-semibold">
                {formatMoney(listing.price, listing.currency)}
              </span>
              <span className="text-sm text-ink/55"> / night</span>
            </>
          ) : (
            <span className="font-display text-2xl font-semibold">Rate on request</span>
          )}
        </p>
        {hasRating && (
          <span className="flex items-center gap-1 text-sm font-semibold text-ink">
            <Icon name="star" size={13} className="text-coral" />
            {listing.rating.toFixed(2)}
            <span className="font-normal text-ink/45">({listing.reviews})</span>
          </span>
        )}
      </div>
      {usd && <p className="mt-1 text-xs text-ink/45">{usd} per night, indicative</p>}
      {!hasRate && (
        <p className="mt-1 text-xs text-ink/45">
          The {propertyKind} confirms the rate when it accepts your request.
        </p>
      )}

      <div className="mt-5 grid grid-cols-2 gap-3">
        <div>
          <label htmlFor="checkIn" className="field-label">
            Check-in
          </label>
          <input
            id="checkIn"
            type="date"
            value={checkIn}
            min={today}
            onChange={(event) => {
              setCheckIn(event.target.value)
              if (checkOut && event.target.value && checkOut <= event.target.value) {
                setCheckOut(addDays(event.target.value, 1))
              }
            }}
            className={cn('field', errors.checkIn && 'border-coral')}
            aria-invalid={Boolean(errors.checkIn)}
          />
        </div>
        <div>
          <label htmlFor="checkOut" className="field-label">
            Check-out
          </label>
          <input
            id="checkOut"
            type="date"
            value={checkOut}
            min={minCheckOut}
            onChange={(event) => setCheckOut(event.target.value)}
            className={cn('field', errors.checkOut && 'border-coral')}
            aria-invalid={Boolean(errors.checkOut)}
          />
        </div>
      </div>
      {(errors.checkIn || errors.checkOut) && (
        <p className="mt-1.5 text-xs font-semibold text-coral">
          {errors.checkIn ?? errors.checkOut}
        </p>
      )}

      <div className="mt-3">
        <label htmlFor="guests" className="field-label">
          Guests
        </label>
        <select
          id="guests"
          value={guests}
          onChange={(event) => setGuests(Number(event.target.value))}
          className="field"
        >
          {Array.from({ length: listing.guests }, (_, index) => index + 1).map((n) => (
            <option key={n} value={n}>
              {n} guest{n > 1 ? 's' : ''}
            </option>
          ))}
        </select>
      </div>

      <div className="mt-4 rounded-2xl bg-sand px-4 py-3.5 text-sm">
        {!hasRate ? (
          <p className="text-ink/60">
            <span className="font-semibold text-ink">{listing.host.name}</span> has not
            published a nightly rate yet. Send your request and they will confirm the
            price before you commit — nothing is charged on Isle BnB.
          </p>
        ) : nights > 0 ? (
          <>
            <div className="flex justify-between text-ink/70">
              <span>
                {formatMoney(listing.price, listing.currency)} × {nights} night
                {nights > 1 ? 's' : ''}
              </span>
              <span>{formatMoney(subtotal, listing.currency)}</span>
            </div>
            <div className="mt-2 flex justify-between text-ink/70">
              <span>Isle BnB fee</span>
              <span className="font-semibold text-palm">None in v1</span>
            </div>
            <div className="mt-3 flex justify-between border-t border-ink/10 pt-3 font-bold text-ink">
              <span>Pay on arrival</span>
              <span>{formatMoney(subtotal, listing.currency)}</span>
            </div>
            {totalUsd && (
              <p className="mt-1 text-right text-[11px] text-ink/40">{totalUsd}</p>
            )}
          </>
        ) : (
          <p className="text-ink/55">
            Add your dates to see the total. You pay the property directly — no card
            needed.
          </p>
        )}
      </div>

      <div className="mt-5 space-y-3">
        <div>
          <label htmlFor="guestName" className="field-label">
            Full name
          </label>
          <input
            id="guestName"
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="As it appears on your passport"
            className={cn('field', errors.name && 'border-coral')}
            autoComplete="name"
          />
          {errors.name && (
            <p className="mt-1 text-xs font-semibold text-coral">{errors.name}</p>
          )}
        </div>
        <div>
          <label htmlFor="guestEmail" className="field-label">
            Email
          </label>
          <input
            id="guestEmail"
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="you@example.com"
            className={cn('field', errors.email && 'border-coral')}
            autoComplete="email"
          />
          {errors.email && (
            <p className="mt-1 text-xs font-semibold text-coral">{errors.email}</p>
          )}
        </div>
        <div>
          <label htmlFor="guestPhone" className="field-label">
            Phone / WhatsApp
          </label>
          <input
            id="guestPhone"
            type="tel"
            value={phone}
            onChange={(event) => setPhone(event.target.value)}
            placeholder="+61 400 000 000"
            className={cn('field', errors.phone && 'border-coral')}
            autoComplete="tel"
          />
          {errors.phone && (
            <p className="mt-1 text-xs font-semibold text-coral">{errors.phone}</p>
          )}
        </div>
        <div>
          <label htmlFor="notes" className="field-label">
            Anything the host should know? (optional)
          </label>
          <textarea
            id="notes"
            value={notes}
            onChange={(event) => setNotes(event.target.value)}
            rows={2}
            placeholder="Late arrival, dietary needs, airport pickup…"
            className="field resize-none"
          />
        </div>
      </div>

      {submitError && (
        <p className="mt-4 rounded-2xl bg-coral/10 px-4 py-3 text-xs font-semibold leading-relaxed text-coral">
          {submitError}
        </p>
      )}

      <button
        type="submit"
        disabled={sending}
        className="btn-primary mt-5 w-full disabled:cursor-wait"
      >
        {sending ? 'Sending request…' : 'Request to book'}
      </button>

      <p className="mt-3 text-center text-xs leading-relaxed text-ink/45">
        You will not be charged. {listing.host.name} confirms by email or phone
        {hasRate
          ? `, and you pay ${formatMoney(listing.price, listing.currency)} per night on arrival.`
          : ', including the nightly rate, before you travel.'}
      </p>
      <p className="mt-2 text-center text-[11px] text-ink/35">
        {country?.name} · {listing.freeCancellation ? 'Free cancellation up to 7 days before check-in' : 'Contact the property to cancel'}
      </p>
    </form>
  )
}
