import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Icon } from '../components/Icons'
import { ListingCard } from '../components/ListingCard'
import { getSaved } from '../lib/storage'
import { usePageTitle } from '../lib/usePageTitle'
import { listings } from '../data/listings'

export function SavedPage() {
  usePageTitle('Saved stays · Isle BnB')

  const [savedIds] = useState<string[]>(() => getSaved())
  const saved = listings.filter((listing) => savedIds.includes(listing.id))

  return (
    <div className="section pt-10">
      <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-lagoon">
        Wishlist
      </p>
      <h1 className="mt-2 font-display text-3xl font-semibold text-ink sm:text-[2.6rem]">
        Saved stays
      </h1>
      <p className="mt-2 text-sm text-ink/60">
        {saved.length > 0
          ? `${saved.length} stay${saved.length > 1 ? 's' : ''} saved on this device.`
          : 'Tap the heart on any stay to keep it here.'}
      </p>

      {saved.length === 0 ? (
        <div className="card mt-8 px-6 py-16 text-center">
          <span className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-mist text-coral">
            <Icon name="heart" size={24} />
          </span>
          <h2 className="mt-5 text-xl font-semibold text-ink">Nothing saved yet</h2>
          <p className="mx-auto mt-2 max-w-sm text-sm leading-relaxed text-ink/60">
            Shortlist the bungalows and lodges you like, then compare them when you are
            ready to book.
          </p>
          <Link to="/explore" className="btn-primary mt-6">
            Browse stays
            <Icon name="arrowRight" size={16} />
          </Link>
        </div>
      ) : (
        <div className="mt-8 grid grid-cols-1 gap-x-5 gap-y-9 sm:grid-cols-2 lg:grid-cols-3">
          {saved.map((listing) => (
            <ListingCard key={listing.id} listing={listing} />
          ))}
        </div>
      )}
    </div>
  )
}
