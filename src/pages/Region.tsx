import { Link, useParams } from 'react-router-dom'
import { CountryCard } from '../components/CountryCard'
import { Icon } from '../components/Icons'
import { countries } from '../data/countries'
import { listings } from '../data/listings'
import { usePageTitle } from '../lib/usePageTitle'
import type { Region } from '../types'
import { NotFoundPage } from './NotFound'

const REGIONS: Region[] = ['Melanesia', 'Polynesia', 'Micronesia']

const REGION_BLURBS: Record<Region, string> = {
  Melanesia:
    'The volcanic south-west: Fiji, Vanuatu, Solomon Islands, Papua New Guinea and New Caledonia.',
  Polynesia:
    'The great triangle from Tonga to the Cook Islands, where voyaging canoes were invented.',
  Micronesia:
    'Thousands of small atolls across the western Pacific, north of the equator.',
}

export function RegionPage() {
  const { region: slug = '' } = useParams()
  const region = REGIONS.find((name) => name.toLowerCase() === slug.toLowerCase())

  usePageTitle(region ? `${region} · Isle BnB` : 'Region not found · Isle BnB')

  if (!region) return <NotFoundPage />

  const inRegion = countries.filter((country) => country.region === region)

  const withStays = inRegion
    .map((country) => ({
      country,
      stays: listings.filter((listing) => listing.country === country.code).length,
    }))
    .filter((entry) => entry.stays > 0)
    .sort((a, b) => b.stays - a.stays)

  const onboarding = inRegion.filter(
    (country) => !withStays.some((entry) => entry.country.code === country.code),
  )

  const totalStays = withStays.reduce((sum, entry) => sum + entry.stays, 0)

  return (
    <div className="section pt-10">
      <Link
        to="/explore"
        className="inline-flex items-center gap-1.5 text-sm font-semibold text-ink/55 transition hover:text-ink"
      >
        <Icon name="arrowLeft" size={16} />
        All regions
      </Link>

      <div className="mt-4 max-w-2xl">
        <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-lagoon">
          Region
        </p>
        <h1 className="mt-2 text-balance font-display text-3xl font-semibold leading-[1.1] text-ink sm:text-[2.8rem]">
          {region}
        </h1>
        <p className="mt-3 text-[15px] leading-relaxed text-ink/60">
          {totalStays} stays across {withStays.length}{' '}
          {withStays.length === 1 ? 'country' : 'countries'}. {REGION_BLURBS[region]}
        </p>
      </div>

      {withStays.length > 0 && (
        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {withStays.map(({ country }) => (
            <CountryCard key={country.code} country={country} size="lg" />
          ))}
        </div>
      )}

      {onboarding.length > 0 && (
        <div className="mt-10 rounded-[1.5rem] border border-ink/10 bg-white p-6 shadow-card">
          <h2 className="text-sm font-bold uppercase tracking-widest text-ink/45">
            Also in {region} — hosts onboarding
          </h2>
          <div className="mt-4 flex flex-wrap gap-2">
            {onboarding.map((country) => (
              <Link
                key={country.code}
                to={`/countries/${country.code.toLowerCase()}`}
                className="rounded-full border border-ink/15 px-3.5 py-2 text-sm font-semibold text-ink/70 transition hover:border-ink/40 hover:text-ink"
              >
                {country.name}
              </Link>
            ))}
          </div>
          <p className="mt-4 text-sm leading-relaxed text-ink/55">
            We only open a country once its stays are verified. If you run a property on one
            of these islands, you could be the first listing.
          </p>
        </div>
      )}
    </div>
  )
}
