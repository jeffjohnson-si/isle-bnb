import { useMemo } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { ListingCard } from '../components/ListingCard'
import { Icon } from '../components/Icons'
import { countries, countryByCode } from '../data/countries'
import { listings, stayTypes } from '../data/listings'
import { toUsd } from '../lib/money'
import { usePageTitle } from '../lib/usePageTitle'
import type { Listing, StayType } from '../types'

const sortOptions = [
  { value: 'recommended', label: 'Recommended' },
  { value: 'price-asc', label: 'Price: low to high' },
  { value: 'price-desc', label: 'Price: high to low' },
  { value: 'rating', label: 'Top rated' },
] as const

export function StaysPage() {
  usePageTitle('All stays · Isle BnB')

  const [params, setParams] = useSearchParams()

  const country = params.get('country') ?? ''
  const type = params.get('type') ?? ''
  const guests = params.get('guests') ?? ''
  const sort = params.get('sort') ?? 'recommended'
  const query = params.get('q') ?? ''

  const update = (key: string, value: string) => {
    const next = new URLSearchParams(params)
    if (value) next.set(key, value)
    else next.delete(key)
    setParams(next, { replace: true })
  }

  const results = useMemo(() => {
    const guestCount = Number(guests) || 0
    const needle = query.trim().toLowerCase()

    const filtered = listings.filter((listing) => {
      if (country && listing.country !== country) return false
      if (type && listing.type !== type) return false
      if (guestCount && listing.guests < guestCount) return false
      if (needle) {
        const haystack = [
          listing.name,
          listing.island,
          listing.area,
          listing.type,
          countryByCode(listing.country)?.name ?? '',
        ]
          .join(' ')
          .toLowerCase()
        if (!haystack.includes(needle)) return false
      }
      return true
    })

    const sorted = [...filtered]
    // Properties without a published rate always sort last, whichever direction.
    const priceOf = (price: number, currency: string) =>
      price > 0 ? toUsd(price, currency) : null
    const byPrice = (direction: 1 | -1) => (a: Listing, b: Listing) => {
      const aPrice = priceOf(a.price, a.currency)
      const bPrice = priceOf(b.price, b.currency)
      if (aPrice === null && bPrice === null) return 0
      if (aPrice === null) return 1
      if (bPrice === null) return -1
      return (aPrice - bPrice) * direction
    }

    switch (sort) {
      case 'price-asc':
        sorted.sort(byPrice(1))
        break
      case 'price-desc':
        sorted.sort(byPrice(-1))
        break
      case 'rating':
        sorted.sort((a, b) => b.rating - a.rating || b.reviews - a.reviews)
        break
      default:
        sorted.sort(
          (a, b) =>
            b.rating * Math.log(b.reviews + 2) - a.rating * Math.log(a.reviews + 2),
        )
    }
    return sorted
  }, [country, type, guests, sort, query])

  const hasFilters = Boolean(country || type || guests || query)
  const activeCountry = country ? countryByCode(country) : undefined

  return (
    <div className="section pt-10">
      <Link
        to="/explore"
        className="inline-flex items-center gap-1.5 text-sm font-semibold text-ink/55 transition hover:text-ink"
      >
        <Icon name="arrowLeft" size={16} />
        Explore by country
      </Link>

      <div className="mt-4 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-lagoon">
            All stays
          </p>
          <h1 className="mt-2 font-display text-3xl font-semibold text-ink sm:text-[2.6rem]">
            {activeCountry ? `Stays in ${activeCountry.name}` : 'Every stay in the Pacific'}
          </h1>
          <p className="mt-2 text-sm text-ink/60">
            {results.length} stay{results.length === 1 ? '' : 's'} available
            {guests ? ` for ${guests} guest${guests === '1' ? '' : 's'}` : ''} · rates in
            local currency, paid on arrival
          </p>
        </div>
      </div>

      <div className="mt-7 rounded-[1.75rem] border border-ink/10 bg-white p-3 shadow-card">
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-[1.6fr_1fr_1fr_1fr_1fr]">
          <label className="relative col-span-2 block lg:col-span-1">
            <span className="sr-only">Search stays</span>
            <Icon
              name="search"
              size={17}
              className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-ink/40"
            />
            <input
              type="search"
              value={query}
              onChange={(event) => update('q', event.target.value)}
              placeholder="Search by name, island or area"
              className="field pl-11"
            />
          </label>

          <label className="relative block">
            <span className="sr-only">Country</span>
            <select
              value={country}
              onChange={(event) => update('country', event.target.value)}
              className="field appearance-none pr-9"
            >
              <option value="">All countries</option>
              {countries.map((c) => (
                <option key={c.code} value={c.code}>
                  {c.name}
                </option>
              ))}
            </select>
            <Icon
              name="chevronDown"
              size={15}
              className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 text-ink/40"
            />
          </label>

          <label className="relative block">
            <span className="sr-only">Stay type</span>
            <select
              value={type}
              onChange={(event) => update('type', event.target.value)}
              className="field appearance-none pr-9"
            >
              <option value="">Any stay type</option>
              {stayTypes.map((t: StayType) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
            <Icon
              name="chevronDown"
              size={15}
              className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 text-ink/40"
            />
          </label>

          <label className="relative block">
            <span className="sr-only">Guests</span>
            <select
              value={guests}
              onChange={(event) => update('guests', event.target.value)}
              className="field appearance-none pr-9"
            >
              <option value="">Any guests</option>
              {[1, 2, 3, 4, 5, 6].map((n) => (
                <option key={n} value={n}>
                  {n} guest{n > 1 ? 's' : ''}+
                </option>
              ))}
            </select>
            <Icon
              name="chevronDown"
              size={15}
              className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 text-ink/40"
            />
          </label>

          <label className="relative block">
            <span className="sr-only">Sort results</span>
            <select
              value={sort}
              onChange={(event) => update('sort', event.target.value)}
              className="field appearance-none pr-9"
            >
              {sortOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            <Icon
              name="filter"
              size={15}
              className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 text-ink/40"
            />
          </label>
        </div>
      </div>

      {hasFilters && (
        <div className="mt-4 flex flex-wrap items-center gap-2">
          <span className="text-xs font-semibold uppercase tracking-wider text-ink/45">
            Filters
          </span>
          {country && (
            <button
              type="button"
              onClick={() => update('country', '')}
              className="chip hover:bg-shell"
            >
              {countryByCode(country)?.name}
              <Icon name="close" size={12} />
            </button>
          )}
          {type && (
            <button
              type="button"
              onClick={() => update('type', '')}
              className="chip hover:bg-shell"
            >
              {type}
              <Icon name="close" size={12} />
            </button>
          )}
          {guests && (
            <button
              type="button"
              onClick={() => update('guests', '')}
              className="chip hover:bg-shell"
            >
              {guests} guest{guests === '1' ? '' : 's'}+
              <Icon name="close" size={12} />
            </button>
          )}
          {query && (
            <button
              type="button"
              onClick={() => update('q', '')}
              className="chip hover:bg-shell"
            >
              “{query}”
              <Icon name="close" size={12} />
            </button>
          )}
          <button
            type="button"
            onClick={() => setParams(new URLSearchParams(), { replace: true })}
            className="ml-1 text-xs font-semibold text-coral hover:underline"
          >
            Clear all
          </button>
        </div>
      )}

      {results.length === 0 ? (
        <div className="card mt-8 px-6 py-16 text-center">
          <span className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-mist text-lagoon">
            <Icon name={hasFilters ? 'search' : 'sparkles'} size={26} />
          </span>
          <h2 className="mt-5 text-xl font-semibold text-ink">
            {hasFilters ? 'No stays match that yet' : 'Our first stays are being onboarded'}
          </h2>
          <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-ink/60">
            {hasFilters
              ? 'Nothing in the catalogue fits those filters. Widen the search, or tell us where you are headed and we will chase hosts there.'
              : 'We are verifying properties before they go live — a rate travellers can trust matters more than a full grid. If you run a resort, lodge or guesthouse, you can be the first listing.'}
          </p>
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            {hasFilters ? (
              <>
                <button
                  type="button"
                  onClick={() => setParams(new URLSearchParams(), { replace: true })}
                  className="btn-dark"
                >
                  Reset filters
                </button>
                <a href="mailto:hello@islebnb.com" className="btn-outline">
                  Request a country
                </a>
              </>
            ) : (
              <>
                <Link to="/list-your-place" className="btn-primary">
                  List your property
                </Link>
                <a href="mailto:hello@islebnb.com" className="btn-outline">
                  Talk to us
                </a>
              </>
            )}
          </div>
        </div>
      ) : (
        <div className="mt-8 grid grid-cols-1 gap-x-5 gap-y-9 sm:grid-cols-2 lg:grid-cols-3">
          {results.map((listing, index) => (
            <ListingCard key={listing.id} listing={listing} priority={index < 3} />
          ))}
        </div>
      )}
    </div>
  )
}
