import { Link, useParams } from 'react-router-dom'
import { CountryCard } from '../components/CountryCard'
import { ListingCard } from '../components/ListingCard'
import { Icon } from '../components/Icons'
import { countries, countryByCode } from '../data/countries'
import { listingsByCountry } from '../data/listings'
import { usePageTitle } from '../lib/usePageTitle'
import { NotFoundPage } from './NotFound'

export function CountryPage() {
  const { code = '' } = useParams()
  const country = countryByCode(code)

  usePageTitle(country ? `${country.name} · Isle BnB` : 'Country not found · Isle BnB')

  if (!country) return <NotFoundPage />

  const stays = listingsByCountry(country.code)
  const neighbours = countries
    .filter((c) => c.region === country.region && c.code !== country.code)
    .slice(0, 4)

  const facts = [
    { label: 'Capital', value: country.capital },
    { label: 'Currency', value: `${country.currency} · ${country.currencyName}` },
    { label: 'Languages', value: country.languages.join(', ') },
    { label: 'Best time', value: country.bestTime },
  ]

  return (
    <div className="pt-6">
      <div className="section">
        <Link
          to="/countries"
          className="inline-flex items-center gap-1.5 text-sm font-semibold text-ink/55 transition hover:text-ink"
        >
          <Icon name="arrowLeft" size={16} />
          All countries
        </Link>
      </div>

      <section className="section mt-4">
        <div className="relative overflow-hidden rounded-[2rem]">
          <div className="aspect-[16/10] sm:aspect-[21/9]">
            {country.image ? (
              <img
                src={country.image}
                alt={country.name}
                className="h-full w-full object-cover"
              />
            ) : (
              <div className="h-full w-full bg-gradient-to-br from-lagoon to-deep" />
            )}
          </div>
          <div className="absolute inset-0 bg-gradient-to-t from-ink/85 via-ink/30 to-transparent" />
          <div className="absolute inset-x-0 bottom-0 p-6 sm:p-10">
            <span className="rounded-full bg-white/15 px-2.5 py-1 text-[10px] font-bold uppercase tracking-widest text-white backdrop-blur-sm">
              {country.region}
            </span>
            <h1 className="mt-3 font-display text-4xl font-semibold text-white sm:text-6xl">
              {country.name}
            </h1>
            <p className="mt-2 max-w-xl text-sm text-white/80 sm:text-base">
              {country.tagline}
            </p>
          </div>
        </div>
      </section>

      <section className="section mt-8">
        <div className="grid gap-8 lg:grid-cols-[1.4fr_1fr]">
          <p className="text-[15px] leading-relaxed text-ink/70">{country.blurb}</p>

          <dl className="grid grid-cols-2 gap-4 rounded-[1.5rem] border border-ink/10 bg-white p-5 shadow-card">
            {facts.map((fact) => (
              <div key={fact.label}>
                <dt className="text-[10px] font-bold uppercase tracking-widest text-ink/40">
                  {fact.label}
                </dt>
                <dd className="mt-1 text-sm font-semibold leading-snug text-ink">
                  {fact.value}
                </dd>
              </div>
            ))}
          </dl>
        </div>
      </section>

      <section className="section mt-14">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <h2 className="font-display text-2xl font-semibold text-ink sm:text-3xl">
            {stays.length > 0
              ? `${stays.length} stay${stays.length > 1 ? 's' : ''} in ${country.name}`
              : `Stays in ${country.name}`}
          </h2>
          {stays.length > 0 && (
            <Link
              to={`/explore?country=${country.code}`}
              className="text-sm font-semibold text-lagoon hover:underline"
            >
              Open in search
            </Link>
          )}
        </div>

        {stays.length > 0 ? (
          <div className="mt-6 grid grid-cols-1 gap-x-5 gap-y-9 sm:grid-cols-2 lg:grid-cols-3">
            {stays.map((listing, index) => (
              <ListingCard key={listing.id} listing={listing} priority={index < 3} />
            ))}
          </div>
        ) : (
          <div className="card mt-6 px-6 py-14 text-center">
            <span className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-mist text-lagoon">
              <Icon name="sparkles" size={24} />
            </span>
            <h3 className="mt-5 text-xl font-semibold text-ink">
              No stays listed here yet
            </h3>
            <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-ink/60">
              We are signing up resorts, lodges and family guesthouses across{' '}
              {country.name}. If you run one — or know someone who does — send them our
              way.
            </p>
            <div className="mt-6 flex flex-wrap justify-center gap-3">
              <Link to="/list-your-place" className="btn-primary">
                List a property here
              </Link>
              <Link to="/explore" className="btn-outline">
                Browse other countries
              </Link>
            </div>
          </div>
        )}
      </section>

      <section className="section mt-16">
        <h2 className="font-display text-2xl font-semibold text-ink">
          More of {country.region}
        </h2>
        <div className="mt-5 grid grid-cols-2 gap-3.5 sm:gap-4 lg:grid-cols-4">
          {neighbours.map((neighbour) => (
            <CountryCard key={neighbour.code} country={neighbour} size="sm" />
          ))}
        </div>
      </section>
    </div>
  )
}
