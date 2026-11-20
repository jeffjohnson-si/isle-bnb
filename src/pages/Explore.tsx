import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Icon } from '../components/Icons'
import { countries } from '../data/countries'
import { listings } from '../data/listings'
import { usePageTitle } from '../lib/usePageTitle'

const REGIONS = [
  {
    name: 'Melanesia',
    slug: 'melanesia',
    image: '/pics/king-solomon/pool.webp',
    blurb: 'The Mainlanders.',
  },
  {
    name: 'Polynesia',
    slug: 'polynesia',
    image: '/pics/aitutaki-lagoon/al-01.webp',
    blurb: 'The great triangle.',
  },
  {
    name: 'Micronesia',
    slug: 'micronesia',
    image: '/pics/bokanbotin/bk-01.webp',
    blurb: 'The archipelagos.',
  },
] as const

/**
 * Explore is a two-step picker: three regions, then the countries inside the
 * region, then that country's stays.
 */
export function ExplorePage() {
  usePageTitle('Explore · Isle BnB')
  const [hovered, setHovered] = useState<string | null>(null)

  const regions = REGIONS.map((region) => {
    const inRegion = countries.filter((country) => country.region === region.name)
    const live = inRegion.filter((country) =>
      listings.some((listing) => listing.country === country.code),
    )
    const stays = listings.filter((listing) =>
      inRegion.some((country) => country.code === listing.country),
    ).length
    return { ...region, countries: inRegion.length, live: live.length, stays }
  })

  return (
    <div className="section pt-10">
      <div className="max-w-2xl">
        <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-lagoon">
          Explore
        </p>
        <h1 className="mt-2 text-balance font-display text-3xl font-semibold leading-[1.1] text-ink sm:text-[2.8rem]">
          Three Races, One People, Where are you headed?
        </h1>
        <p className="mt-3 text-[15px] leading-relaxed text-ink/60">
          {listings.length} stays across {regions.reduce((sum, r) => sum + r.live, 0)}{' '}
          countries. Pick a region, then the island nation you are travelling to.
        </p>
      </div>

      <div className="mt-9 grid gap-4 md:grid-cols-3 md:gap-5">
        {regions.map((region) => (
          <Link
            key={region.slug}
            to={`/explore/${region.slug}`}
            onMouseEnter={() => setHovered(region.slug)}
            onMouseLeave={() => setHovered(null)}
            className="group relative aspect-[4/5] overflow-hidden rounded-[1.75rem] bg-deep md:aspect-[3/4]"
          >
            <img
              src={region.image}
              alt={region.name}
              loading="lazy"
              decoding="async"
              className="absolute inset-0 h-full w-full object-cover transition duration-[900ms] ease-out group-hover:scale-[1.06]"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-ink/90 via-ink/35 to-ink/10" />

            <div className="absolute inset-x-0 top-0 flex items-start justify-between p-5">
              <span className="rounded-full bg-white/15 px-2.5 py-1 text-[10px] font-bold uppercase tracking-widest text-white backdrop-blur-sm">
                Region
              </span>
              <span className="grid h-9 w-9 place-items-center rounded-full bg-white/15 text-white backdrop-blur-sm transition group-hover:bg-white group-hover:text-ink">
                <Icon name="arrowRight" size={17} />
              </span>
            </div>

            <div className="absolute inset-x-0 bottom-0 p-5 sm:p-6">
              <h2 className="font-display text-3xl font-semibold leading-tight text-white sm:text-[2.25rem]">
                {region.name}
              </h2>
              <p className="mt-2 max-w-xs text-sm leading-relaxed text-white/80">
                {hovered === region.slug ? region.blurb : `${region.live} countries with stays · ${region.stays} stays`}
              </p>
            </div>
          </Link>
        ))}
      </div>

      <div className="mt-12 flex flex-wrap items-center justify-between gap-6 rounded-[1.75rem] border border-ink/10 bg-white p-6 shadow-card sm:p-8">
        <div className="max-w-lg">
          <h2 className="font-display text-xl font-semibold text-ink sm:text-2xl">
            Prefer to search everything?
          </h2>
          <p className="mt-2 text-sm leading-relaxed text-ink/60">
            Browse all {listings.length} stays at once with filters for island, stay type
            and guests — or see every nation we cover, including the ones still onboarding
            hosts.
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          <Link to="/countries" className="btn-outline">
            All {countries.length} countries
          </Link>
          <Link to="/stays" className="btn-primary">
            Browse all stays
            <Icon name="arrowRight" size={16} />
          </Link>
        </div>
      </div>
    </div>
  )
}
