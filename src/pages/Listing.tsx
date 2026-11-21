import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { Icon } from '../components/Icons'
import { BookingCard } from '../components/BookingCard'
import { ListingCard } from '../components/ListingCard'
import { NotFoundPage } from './NotFound'
import { countryByCode } from '../data/countries'
import { listingById, listings } from '../data/listings'
import { fetchVerifiedClaims } from '../lib/api'
import { approxUsd, formatMoney } from '../lib/money'
import { isSaved, toggleSaved } from '../lib/storage'
import { listingLocation, listingLocality } from '../lib/location'
import { usePageTitle } from '../lib/usePageTitle'


const amenityIcon = (amenity: string) => {
  const value = amenity.toLowerCase()
  if (value.includes('wi-fi')) return 'wifi' as const
  if (value.includes('boat')) return 'boat' as const
  if (value.includes('beach') || value.includes('pool') || value.includes('snorkel'))
    return 'waves' as const
  if (value.includes('breakfast') || value.includes('restaurant')) return 'sun' as const
  if (value.includes('park')) return 'pin' as const
  return 'check' as const
}

export function ListingPage() {
  const { id = '' } = useParams()
  const listing = listingById(id)
  const [saved, setSaved] = useState(() => (listing ? isSaved(listing.id) : false))
  const [copied, setCopied] = useState(false)
  const [managedByOwner, setManagedByOwner] = useState(false)

  useEffect(() => {
    const current = listing
    if (!current) return
    let active = true
    void fetchVerifiedClaims().then((ids) => {
      if (active) setManagedByOwner(ids.includes(current.id))
    })
    return () => {
      active = false
    }
  }, [listing?.id])

  usePageTitle(listing ? `${listing.name} · Isle BnB` : 'Stay not found · Isle BnB')

  if (!listing) return <NotFoundPage />

  const country = countryByCode(listing.country)
  const related = listings
    .filter((l) => l.id !== listing.id && l.country === listing.country)
    .concat(listings.filter((l) => l.id !== listing.id && l.type === listing.type))
    .filter((l, index, arr) => arr.findIndex((x) => x.id === l.id) === index)
    .slice(0, 3)

  const share = async () => {
    const url = window.location.href
    try {
      if (navigator.share) {
        await navigator.share({ title: listing.name, url })
        return
      }
      await navigator.clipboard.writeText(url)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 2000)
    } catch {
      setCopied(false)
    }
  }

  return (
    <div className="section pt-6 pb-4">
      <Link
        to="/explore"
        className="inline-flex items-center gap-1.5 text-sm font-semibold text-ink/55 transition hover:text-ink"
      >
        <Icon name="arrowLeft" size={16} />
        Back to stays
      </Link>

      <div className="mt-4 flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="chip bg-shell text-ink/70">{listing.type}</span>
            {listing.badge && <span className="chip">{listing.badge}</span>}
            {listing.freeCancellation && (
              <span className="chip bg-palm/10 text-palm">Free cancellation</span>
            )}
            {managedByOwner && (
              <span className="chip bg-palm/10 text-palm">
                <Icon name="shield" size={13} />
                Managed by the owner
              </span>
            )}
          </div>
          <h1 className="mt-3 text-balance font-display text-3xl font-semibold leading-tight text-ink sm:text-[2.9rem]">
            {listing.name}
          </h1>
          <p className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-ink/60">
            {listing.reviews > 0 ? (
              <>
                <span className="inline-flex items-center gap-1 font-semibold text-ink">
                  <Icon name="star" size={14} className="text-coral" />
                  {listing.rating.toFixed(2)}
                </span>
                <span className="text-ink/30">•</span>
                <span className="text-ink/60">{listing.reviews} reviews</span>
                <span className="hidden text-ink/30 sm:inline">•</span>
              </>
            ) : (
              <span className="rounded-full bg-mist px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider text-palm">
                New on Isle BnB
              </span>
            )}
            <span className="inline-flex items-center gap-1">
              <Icon name="pin" size={14} />
              {listingLocation(listing)}
            </span>
          </p>
        </div>

        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setSaved(toggleSaved(listing.id).includes(listing.id))}
            className="btn-outline gap-2"
            aria-pressed={saved}
          >
            <Icon
              name="heart"
              size={17}
              className={saved ? 'text-coral' : 'text-ink/60'}
              fill={saved ? 'currentColor' : 'none'}
            />
            {saved ? 'Saved' : 'Save'}
          </button>
          <button type="button" onClick={() => void share()} className="btn-outline gap-2">
            <Icon name="globe" size={17} />
            {copied ? 'Link copied' : 'Share'}
          </button>
        </div>
      </div>

      {/* gallery */}
      <div className="mt-5 overflow-hidden rounded-[1.75rem]">
        <div className="grid gap-1.5 sm:grid-cols-4 sm:grid-rows-2">
          <div className="sm:col-span-2 sm:row-span-2">
            <img
              src={listing.images[0]}
              alt={`${listing.name} main photo`}
              className="aspect-[4/3] h-full w-full object-cover sm:aspect-auto"
            />
          </div>
          {[...listing.images.slice(1), ...listing.images].slice(0, 4).map((image, index) => (
            <div key={`${image}-${index}`} className="hidden sm:block">
              <img
                src={image}
                alt={`${listing.name} photo ${index + 2}`}
                loading="lazy"
                className="h-full w-full object-cover"
              />
            </div>
          ))}
        </div>
      </div>

      <div className="mt-10 grid gap-12 lg:grid-cols-[1.5fr_1fr] lg:gap-16">
        <div>
          {/* host */}
          <div className="flex flex-wrap items-center justify-between gap-4 border-b border-ink/10 pb-6">
            <div className="flex items-center gap-3.5">
              <span className="grid h-12 w-12 place-items-center rounded-full bg-deep font-display text-lg font-semibold text-sand">
                {listing.host.name.slice(0, 1)}
              </span>
              <div>
                <p className="flex items-center gap-2 font-semibold text-ink">
                  Hosted by {listing.host.name}
                  {listing.host.superhost && (
                    <span className="rounded-full bg-sun/30 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-ink/70">
                      Superhost
                    </span>
                  )}
                </p>
                <p className="text-sm text-ink/55">
                  {listing.guests} guests · {listing.bedrooms} bedroom
                  {listing.bedrooms > 1 ? 's' : ''} · {listing.beds} bed
                  {listing.beds > 1 ? 's' : ''} · {listing.baths} bath
                  {listing.baths > 1 ? 's' : ''}
                </p>
              </div>
            </div>
            <p className="text-xs font-semibold uppercase tracking-widest text-ink/40">
              On Isle BnB since {listing.host.since}
            </p>
          </div>

          {managedByOwner ? (
            <p className="mt-5 flex items-start gap-2.5 rounded-2xl border border-palm/20 bg-palm/5 px-4 py-3 text-sm leading-relaxed text-palm">
              <Icon name="shield" size={17} className="mt-0.5 shrink-0" />
              The property manages this listing. Rates, rooms and photos come straight
              from them.
            </p>
          ) : (
            <div className="mt-5 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-ink/10 bg-white/60 px-4 py-3">
              <p className="text-sm leading-relaxed text-ink/60">
                Do you own or manage {listing.name}?
              </p>
              <Link
                to={`/claim/${listing.id}`}
                className="inline-flex items-center gap-1.5 text-sm font-semibold text-lagoon transition hover:text-ink"
              >
                Claim this listing
                <Icon name="arrowRight" size={15} />
              </Link>
            </div>
          )}

          {/* highlights */}
          <div className="mt-6 grid gap-4 sm:grid-cols-3">
            {listing.highlights.map((highlight) => (
              <div
                key={highlight}
                className="rounded-2xl border border-ink/10 bg-white/60 p-4"
              >
                <Icon name="sparkles" size={18} className="text-lagoon" />
                <p className="mt-2 text-sm leading-relaxed text-ink/75">{highlight}</p>
              </div>
            ))}
          </div>

          {/* description */}
          <section className="mt-9">
            <h2 className="font-display text-2xl font-semibold text-ink">About this stay</h2>
            <p className="mt-3 whitespace-pre-line text-[15px] leading-[1.75] text-ink/70">
              {listing.description}
            </p>
          </section>

          {/* amenities */}
          <section className="mt-9 border-t border-ink/10 pt-8">
            <h2 className="font-display text-2xl font-semibold text-ink">
              What this place offers
            </h2>
            <ul className="mt-4 grid gap-3 sm:grid-cols-2">
              {listing.amenities.map((amenity) => (
                <li key={amenity} className="flex items-center gap-3 text-sm text-ink/75">
                  <span className="grid h-8 w-8 shrink-0 place-items-center rounded-xl bg-mist text-lagoon">
                    <Icon name={amenityIcon(amenity)} size={16} />
                  </span>
                  {amenity}
                </li>
              ))}
            </ul>
          </section>

          {/* good to know */}
          <section className="mt-9 border-t border-ink/10 pt-8">
            <h2 className="font-display text-2xl font-semibold text-ink">Good to know</h2>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <div className="rounded-2xl bg-white p-5 shadow-card">
                <p className="flex items-center gap-2 text-sm font-bold text-ink">
                  <Icon name="wallet" size={16} className="text-lagoon" />
                  Payment on arrival
                </p>
                <p className="mt-2 text-sm leading-relaxed text-ink/60">
                  {listing.price > 0
                    ? `Bring ${formatMoney(listing.price, listing.currency)} per night in local currency or USD. Isle BnB takes no payment and no card details.`
                    : 'The rate is confirmed by the property when it accepts your request. Isle BnB takes no payment and no card details.'}
                </p>
              </div>
              <div className="rounded-2xl bg-white p-5 shadow-card">
                <p className="flex items-center gap-2 text-sm font-bold text-ink">
                  <Icon name="calendar" size={16} className="text-lagoon" />
                  Check-in & check-out
                </p>
                <p className="mt-2 text-sm leading-relaxed text-ink/60">
                  Times are confirmed by {listing.host.name} when they accept your request.
                  Message your host if your flight lands late — most arrivals in the
                  Pacific do.
                </p>
              </div>
              <div className="rounded-2xl bg-white p-5 shadow-card">
                <p className="flex items-center gap-2 text-sm font-bold text-ink">
                  <Icon name="boat" size={16} className="text-lagoon" />
                  Getting there
                </p>
                <p className="mt-2 text-sm leading-relaxed text-ink/60">
                  {listing.transfer
                    ? `${listing.transfer}. Send your flight details when you book and the host will confirm the timing.`
                    : 'Fly into the nearest international airport and take a taxi or shuttle. Ask your host to help arrange a transfer.'}
                </p>
              </div>
              <div className="rounded-2xl bg-white p-5 shadow-card">
                <p className="flex items-center gap-2 text-sm font-bold text-ink">
                  <Icon name="shield" size={16} className="text-lagoon" />
                  Cancellation
                </p>
                <p className="mt-2 text-sm leading-relaxed text-ink/60">
                  {listing.freeCancellation
                    ? 'Free cancellation up to 7 days before check-in. After that, contact the property directly.'
                    : 'Contact the property as early as you can if your plans change — most hosts are flexible outside peak season.'}
                </p>
              </div>
            </div>
          </section>

          <section className="mt-9 rounded-2xl border border-ink/10 bg-mist/60 p-5 text-sm leading-relaxed text-palm">
            <p className="flex items-center gap-2 font-bold">
              <Icon name="pin" size={16} />
              {listingLocality(listing)}
            </p>
            <p className="mt-2 text-palm/80">
              Exact address and directions are shared once {listing.host.name} confirms
              your booking. {country?.name} · best visited {country?.bestTime.toLowerCase()}.
            </p>
          </section>
        </div>

        <aside className="lg:sticky lg:top-24 lg:self-start">
          <BookingCard listing={listing} />
          <div className="mt-4 rounded-2xl border border-ink/10 bg-white/60 p-4 text-xs leading-relaxed text-ink/55">
            <p className="flex items-center gap-2 font-semibold text-ink/70">
              <Icon name="shield" size={15} className="text-lagoon" />
              Why book here
            </p>
            <p className="mt-1.5">
              {listing.price > 0
                ? `Rates are set by the property and shown in ${listing.currency}${
                    approxUsd(listing.price, listing.currency) ? ' with a USD estimate' : ''
                  }. No booking fee is added in v1.`
                : 'The property has not published a rate yet, so none is shown. You request dates, they confirm the price, and you settle on arrival. No booking fee is added in v1.'}
            </p>
          </div>
        </aside>
      </div>

      {related.length > 0 && (
        <section className="mt-20">
          <h2 className="font-display text-2xl font-semibold text-ink">
            More stays you might like
          </h2>
          <div className="mt-6 grid grid-cols-1 gap-x-5 gap-y-9 sm:grid-cols-2 lg:grid-cols-3">
            {related.map((item) => (
              <ListingCard key={item.id} listing={item} />
            ))}
          </div>
        </section>
      )}
    </div>
  )
}
