import { Link } from 'react-router-dom'
import type { Country } from '../types'
import { listingsByCountry } from '../data/listings'
import { formatMoney } from '../lib/money'
import { Icon } from './Icons'
import { cn } from '../lib/utils'

interface CountryCardProps {
  country: Country
  className?: string
  size?: 'sm' | 'md' | 'lg'
}

export function CountryCard({ country, className, size = 'md' }: CountryCardProps) {
  const stays = listingsByCountry(country.code)
  const rated = stays.filter((stay) => stay.price > 0)
  const from = rated.length ? Math.min(...rated.map((stay) => stay.price)) : null
  const currency = rated[0]?.currency

  return (
    <Link
      to={`/countries/${country.code.toLowerCase()}`}
      className={cn(
        'group relative block overflow-hidden rounded-[1.5rem] bg-deep',
        size === 'md' ? 'aspect-[3/4]' : 'aspect-[4/3]',
        className,
      )}
      aria-label={`${country.name} — ${stays.length} stays`}
    >
      {country.image ? (
        <img
          src={country.image}
          alt={country.name}
          loading="lazy"
          decoding="async"
          className="absolute inset-0 h-full w-full object-cover transition duration-[900ms] ease-out group-hover:scale-[1.07]"
        />
      ) : (
        <div className="absolute inset-0 bg-gradient-to-br from-lagoon to-deep" />
      )}
      <div className="absolute inset-0 bg-gradient-to-t from-ink/90 via-ink/25 to-ink/5" />
      <div className="absolute inset-x-0 top-0 flex justify-between p-3.5">
        <span className="rounded-full bg-white/15 px-2.5 py-1 text-[10px] font-bold uppercase tracking-widest text-white backdrop-blur-sm">
          {country.region}
        </span>
        {size === 'lg' && stays.length > 0 && (
          <span className="grid h-8 w-8 place-items-center rounded-full bg-white/15 text-white backdrop-blur-sm transition group-hover:bg-white group-hover:text-ink">
            <Icon name="arrowRight" size={16} />
          </span>
        )}
      </div>
      <div className="absolute inset-x-0 bottom-0 p-4 sm:p-5">
        <h3
          className={cn(
            'font-display font-semibold leading-tight text-white',
            size === 'sm' && 'text-xl',
            size === 'md' && 'text-2xl',
            size === 'lg' && 'text-2xl sm:text-[1.75rem]',
          )}
        >
          {country.name}
        </h3>
        <div className="mt-1.5 flex items-center gap-2 text-xs text-white/75">
          {stays.length > 0 ? (
            <>
              <span className="inline-flex items-center gap-1">
                <Icon name="bed" size={13} />
                {stays.length} stay{stays.length > 1 ? 's' : ''}
              </span>
              <span className="text-white/30">•</span>
              <span>
                {from !== null && currency
                  ? `from ${formatMoney(from, currency)}`
                  : 'rate on request'}
              </span>
            </>
          ) : (
            <span className="inline-flex items-center gap-1 text-white/70">
              <Icon name="sparkles" size={13} />
              Hosts onboarding now
            </span>
          )}
        </div>
      </div>
    </Link>
  )
}
