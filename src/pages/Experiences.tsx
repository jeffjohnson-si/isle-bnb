import { Link } from 'react-router-dom'
import { Icon } from '../components/Icons'
import { experiences } from '../data/experiences'
import { countryByCode } from '../data/countries'
import { formatMoney } from '../lib/money'
import { usePageTitle } from '../lib/usePageTitle'

export function ExperiencesPage() {
  usePageTitle('Experiences · Isle BnB')

  return (
    <div className="section pt-10">
      <div className="max-w-2xl">
        <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-lagoon">
          While you are there
        </p>
        <h1 className="mt-2 text-balance font-display text-3xl font-semibold leading-[1.1] text-ink sm:text-[2.8rem]">
          Things the guidebooks miss
        </h1>
        <p className="mt-3 text-[15px] leading-relaxed text-ink/60">
          Reefs, fire knife nights and umu feasts — usually run by families in the
          village next door to where you are staying. Ask your host to arrange any of
          these when you book; nothing is charged online in v1.
        </p>
        <p className="mt-4 inline-flex items-center gap-2 rounded-full bg-mist px-3.5 py-2 text-xs font-semibold text-palm">
          <Icon name="wallet" size={14} />
          Arranged and paid with the operator on the day
        </p>
      </div>

      <div className="mt-10 grid grid-cols-1 gap-x-6 gap-y-10 sm:grid-cols-2 lg:grid-cols-3">
        {experiences.map((experience) => {
          const country = countryByCode(experience.country)
          return (
            <article key={experience.id} className="group">
              <div className="overflow-hidden rounded-[1.5rem] bg-shell">
                <div className="aspect-[4/3]">
                  <img
                    src={experience.image}
                    alt={experience.title}
                    loading="lazy"
                    decoding="async"
                    className="h-full w-full object-cover transition duration-[900ms] ease-out group-hover:scale-[1.05]"
                  />
                </div>
              </div>

              <p className="mt-4 text-[11px] font-bold uppercase tracking-widest text-lagoon">
                {experience.location} · {experience.duration}
              </p>
              <h2 className="mt-1.5 text-lg font-bold leading-snug text-ink">
                {experience.title}
              </h2>
              <p className="mt-2 text-sm leading-relaxed text-ink/60">
                {experience.blurb}
              </p>

              <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
                <p className="text-sm font-semibold text-ink">
                  from {formatMoney(experience.price, experience.currency)}
                  <span className="font-normal text-ink/45"> / person</span>
                </p>
                {country && (
                  <Link
                    to={`/countries/${country.code.toLowerCase()}`}
                    className="inline-flex items-center gap-1 text-sm font-semibold text-lagoon hover:underline"
                  >
                    Stays in {country.name}
                    <Icon name="arrowRight" size={14} />
                  </Link>
                )}
              </div>
            </article>
          )
        })}
      </div>

      <div className="mt-16 overflow-hidden rounded-[2rem] bg-deep p-7 text-sand sm:p-10">
        <div className="flex flex-wrap items-center justify-between gap-6">
          <div className="max-w-xl">
            <h2 className="font-display text-2xl font-semibold sm:text-3xl">
              Book the stay. We help with the rest.
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-sand/75">
              Every property on Isle BnB can arrange transfers, reef trips and village
              visits for guests. Send an experience request in the notes on your booking,
              and the host will come back with a price before you arrive.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link to="/explore" className="btn-primary">
              Explore stays
              <Icon name="arrowRight" size={16} />
            </Link>
            <Link to="/how-it-works" className="btn-outline">
              How booking works
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
