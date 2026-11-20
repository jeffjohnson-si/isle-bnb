import { Link } from 'react-router-dom'
import { CountryCard } from '../components/CountryCard'
import { Icon } from '../components/Icons'
import { countries } from '../data/countries'
import { listings } from '../data/listings'
import { usePageTitle } from '../lib/usePageTitle'
import type { Region } from '../types'

const regionOrder: Region[] = ['Melanesia', 'Polynesia', 'Micronesia']

const regionCopy: Record<Region, string> = {
  Melanesia:
    'The volcanic south-west: Fiji, Vanuatu, Solomon Islands, Papua New Guinea and New Caledonia.',
  Polynesia:
    'The great triangle from Tonga to the Cook Islands, where voyaging canoes were invented.',
  Micronesia: 'Thousands of small atolls across the western Pacific, north of the equator.',
}

export function CountriesPage() {
  usePageTitle('Countries · Isle BnB')

  const live = countries.filter((c) => listings.some((l) => l.country === c.code))
  const onboarding = countries.filter(
    (c) => !listings.some((l) => l.country === c.code),
  )

  return (
    <div className="section pt-10">
      <div className="max-w-2xl">
        <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-lagoon">
          Countries
        </p>
        <h1 className="mt-2 text-balance font-display text-3xl font-semibold leading-[1.1] text-ink sm:text-[2.8rem]">
          Twenty-one nations. One ocean.
        </h1>
        <p className="mt-3 text-[15px] leading-relaxed text-ink/60">
          {live.length > 0
            ? `Choose a country to see every stay we have there. ${live.length} countries are live today; the rest are onboarding hosts right now.`
            : 'Hosts are onboarding across all 21 countries right now. Choose a country to see what is coming, or list your property and be the first stay there.'}
        </p>
      </div>

      {regionOrder.map((region) => {
        const inRegion = countries.filter((c) => c.region === region)
        return (
          <section key={region} className="mt-14">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <h2 className="font-display text-2xl font-semibold text-ink">{region}</h2>
              <p className="text-xs font-semibold uppercase tracking-widest text-ink/40">
                {inRegion.length} nations
              </p>
            </div>
            <p className="mt-1.5 max-w-2xl text-sm text-ink/55">{regionCopy[region]}</p>

            <div className="mt-6 grid grid-cols-2 gap-3.5 sm:gap-4 lg:grid-cols-4">
              {inRegion.map((country) => (
                <CountryCard key={country.code} country={country} size="sm" />
              ))}
            </div>
          </section>
        )
      })}

      <section className="mt-16">
        <div className="rounded-[2rem] border border-ink/10 bg-white p-7 shadow-card sm:p-10">
          <div className="flex flex-wrap items-center justify-between gap-6">
            <div className="max-w-lg">
              <h2 className="font-display text-2xl font-semibold text-ink">
                Not on the map yet?
              </h2>
              <p className="mt-2 text-sm leading-relaxed text-ink/60">
                {onboarding.length} countries are waiting for their first host —
                including {onboarding.slice(0, 3).map((c) => c.name).join(', ')} and{' '}
                {onboarding.length - 3} more. If you run a property there, you would be
                the first thing travellers see.
              </p>
            </div>
            <Link to="/list-your-place" className="btn-primary">
              <Icon name="pin" size={16} />
              List your property
            </Link>
          </div>

          <div className="mt-6 flex flex-wrap gap-2">
            {onboarding.map((country) => (
              <span
                key={country.code}
                className="rounded-full border border-ink/10 bg-sand px-3 py-1.5 text-xs font-semibold text-ink/55"
              >
                {country.name}
              </span>
            ))}
          </div>
        </div>
      </section>
    </div>
  )
}
