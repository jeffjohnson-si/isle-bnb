import { useState } from 'react'
import { Link } from 'react-router-dom'
import type { Listing } from '../types'
import { Icon } from './Icons'
import { approxUsd, formatMoney } from '../lib/money'
import { countryByCode } from '../data/countries'
import { listingRegion } from '../lib/location'
import { isSaved, toggleSaved } from '../lib/storage'
import { cn } from '../lib/utils'

interface ListingCardProps {
  listing: Listing
  className?: string
  priority?: boolean
}

export function ListingCard({ listing, className, priority }: ListingCardProps) {
  const [saved, setSaved] = useState(() => isSaved(listing.id))
  const country = countryByCode(listing.country)
  const hasRate = listing.price > 0
  const hasRating = listing.reviews > 0
  const usd = hasRate ? approxUsd(listing.price, listing.currency) : null

  const onSave = (event: React.MouseEvent) => {
    event.preventDefault()
    event.stopPropagation()
    setSaved(toggleSaved(listing.id).includes(listing.id))
  }

  return (
    <Link
      to={`/stays/${listing.id}`}
      className={cn('group block', className)}
      aria-label={`${listing.name}, ${listing.area}, ${country?.name ?? ''}`}
    >
      <div className="relative overflow-hidden rounded-[1.6rem] bg-shell">
        <div className="aspect-[4/3] w-full">
          <img
            src={listing.images[0]}
            alt={`${listing.name} — ${listing.type.toLowerCase()} in ${listing.area}`}
            loading={priority ? 'eager' : 'lazy'}
            decoding="async"
            className="h-full w-full object-cover transition duration-[900ms] ease-out group-hover:scale-[1.06]"
          />
        </div>
        <div className="pointer-events-none absolute inset-x-0 top-0 flex items-start justify-between p-3">
          {listing.badge ? (
            <span className="rounded-full bg-white/95 px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide text-ink shadow-sm">
              {listing.badge}
            </span>
          ) : (
            <span />
          )}
          <button
            type="button"
            onClick={onSave}
            aria-label={saved ? 'Remove from saved stays' : 'Save this stay'}
            aria-pressed={saved}
            className="pointer-events-auto grid h-9 w-9 place-items-center rounded-full bg-white/85 text-ink/70 backdrop-blur transition hover:scale-105 hover:bg-white"
          >
            <Icon
              name="heart"
              size={18}
              className={cn(saved ? 'text-coral' : 'text-ink/60')}
              fill={saved ? 'currentColor' : 'none'}
            />
          </button>
        </div>
        {listing.transfer && (
          <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-ink/70 to-transparent p-3 pt-8">
            <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-white">
              <Icon name="boat" size={14} />
              {listing.transfer}
            </span>
          </div>
        )}
      </div>

      <div className="mt-3.5 px-0.5">
        <div className="flex items-start justify-between gap-3">
          <h3 className="text-[15px] font-bold leading-snug text-ink">{listing.name}</h3>
          {hasRating ? (
            <span className="flex shrink-0 items-center gap-1 text-sm font-semibold text-ink">
              <Icon name="star" size={13} className="text-coral" />
              {listing.rating.toFixed(2)}
            </span>
          ) : (
            <span className="shrink-0 rounded-full bg-mist px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-palm">
              New
            </span>
          )}
        </div>
        <p className="mt-1 text-sm text-ink/55">{listingRegion(listing)}</p>
        <p className="mt-2.5 text-sm text-ink">
          {hasRate ? (
            <>
              <span className="font-bold">
                {formatMoney(listing.price, listing.currency)}
              </span>
              <span className="text-ink/55"> / night</span>
              {usd && <span className="ml-1.5 text-xs text-ink/40">{usd}</span>}
            </>
          ) : (
            <span className="font-semibold text-ink/70">Rate on request</span>
          )}
        </p>
      </div>
    </Link>
  )
}
