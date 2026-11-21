import { Link } from 'react-router-dom'
import { Icon, IsleMark } from './Icons'
import { countries } from '../data/countries'

const countryLinks = countries
  .filter((c) => ['FJ', 'WS', 'TO', 'VU', 'SB', 'CK', 'PF', 'PW'].includes(c.code))
  .slice(0, 6)

export function Footer() {
  return (
    <footer className="mt-24 bg-deep text-sand">
      <div className="section py-16">
        <div className="grid gap-12 md:grid-cols-[1.4fr_1fr_1fr_1fr]">
          <div>
            <div className="flex items-center gap-2.5">
              <IsleMark className="h-9 w-9 text-white/15" />
              <span className="font-display text-xl font-semibold tracking-tight">
                isle<span className="text-sun">bnb</span>
              </span>
            </div>
            <p className="mt-4 max-w-xs text-sm leading-relaxed text-sand/70">
              Island stays across the Pacific, booked directly with the people who
              run them. Book online, pay when you arrive.
            </p>
            <p className="mt-6 inline-flex items-center gap-2 rounded-full bg-white/10 px-3.5 py-2 text-xs font-semibold text-sand/90">
              <Icon name="wallet" size={15} />
              No card details needed in v1
            </p>
          </div>

          <div>
            <h3 className="text-xs font-semibold uppercase tracking-widest text-sand/50">
              Countries
            </h3>
            <ul className="mt-4 space-y-2.5 text-sm">
              {countryLinks.map((country) => (
                <li key={country.code}>
                  <Link
                    to={`/countries/${country.code.toLowerCase()}`}
                    className="text-sand/80 transition hover:text-sun"
                  >
                    {country.name}
                  </Link>
                </li>
              ))}
              <li>
                <Link
                  to="/countries"
                  className="font-semibold text-sun transition hover:text-white"
                >
                  All 21 countries →
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h3 className="text-xs font-semibold uppercase tracking-widest text-sand/50">
              Travellers
            </h3>
            <ul className="mt-4 space-y-2.5 text-sm">
              <li>
                <Link to="/explore" className="text-sand/80 transition hover:text-sun">
                  Explore by country
                </Link>
              </li>
              <li>
                <Link to="/stays" className="text-sand/80 transition hover:text-sun">
                  All stays
                </Link>
              </li>
              <li>
                <Link to="/experiences" className="text-sand/80 transition hover:text-sun">
                  Experiences
                </Link>
              </li>
              <li>
                <Link to="/bookings" className="text-sand/80 transition hover:text-sun">
                  My bookings
                </Link>
              </li>
              <li>
                <Link to="/how-it-works" className="text-sand/80 transition hover:text-sun">
                  How booking works
                </Link>
              </li>
              <li>
                <Link to="/saved" className="text-sand/80 transition hover:text-sun">
                  Saved stays
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h3 className="text-xs font-semibold uppercase tracking-widest text-sand/50">
              For hosts
            </h3>
            <ul className="mt-4 space-y-2.5 text-sm">
              <li>
                <Link
                  to="/list-your-place"
                  className="text-sand/80 transition hover:text-sun"
                >
                  List your property
                </Link>
              </li>
              <li>
                <Link
                  to="/list-your-place#standards"
                  className="text-sand/80 transition hover:text-sun"
                >
                  Host standards
                </Link>
              </li>
              <li>
                <Link
                  to="/host/login"
                  className="text-sand/80 transition hover:text-sun"
                >
                  Host sign in
                </Link>
              </li>
              <li>
                <a
                  href="mailto:hosts@islebnb.com"
                  className="text-sand/80 transition hover:text-sun"
                >
                  hosts@islebnb.com
                </a>
              </li>
            </ul>
          </div>
        </div>
      </div>

      <div className="border-t border-white/10">
        <div className="section flex flex-col gap-3 py-6 text-xs text-sand/55 sm:flex-row sm:items-center sm:justify-between">
          <p>© {new Date().getFullYear()} Isle BnB. Made in the Pacific.</p>
          <p className="max-w-lg sm:text-right">
            Bookings are confirmed by the property. Rates are shown in local
            currency and paid on arrival.
          </p>
        </div>
      </div>
    </footer>
  )
}
