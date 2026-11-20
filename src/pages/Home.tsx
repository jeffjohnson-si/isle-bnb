import { SearchBar } from '../components/SearchBar'
import { Icon } from '../components/Icons'
import { countries } from '../data/countries'
import { usePageTitle } from '../lib/usePageTitle'

/**
 * Landing screen: the hero and the search. Everything else lives on its own
 * route, so this page stays a single, quiet first impression.
 */
export function HomePage() {
  usePageTitle('Isle BnB — Island stays across the Pacific')

  return (
    <section className="relative isolate flex min-h-[calc(100svh-68px)] flex-col justify-center overflow-hidden py-16">
      <img
        src="/pics/hero-pavilion.webp"
        alt="A shaded beachfront deck in the Pacific with lunch laid out, looking out over a turquoise lagoon"
        className="absolute inset-0 -z-10 h-full w-full object-cover object-center"
      />
      <div className="absolute inset-0 -z-10 bg-gradient-to-b from-ink/60 via-ink/35 to-ink/80" />

      <div className="section">
        <div className="max-w-3xl animate-fade-up">
          <p className="inline-flex items-center gap-2 rounded-full border border-white/25 bg-white/10 px-3.5 py-1.5 text-xs font-semibold text-white backdrop-blur-sm">
            <Icon name="globe" size={14} />
            {countries.length} Pacific countries · pay on arrival
          </p>

          <h1 className="mt-5 text-balance font-display text-[2.6rem] font-semibold leading-[1.03] text-white sm:text-6xl lg:text-[4.15rem]">
            Experience the Pacific, not just pass through it.
          </h1>

          <p className="mt-5 max-w-xl text-pretty text-[15px] leading-relaxed text-white/85 sm:text-lg">
            Looking for a place to stay in the Pacific? 
            Explore the Blue Continent and have a touch of the untapped wonders of our Pristine Paradise.
            From the tip of Hawaii to the southern ends of Aotearoa, From the West of Papua to the far east of Rapanui, seperated by land but always and forever connected by the ocean.
            
          </p>
        </div>

        <div className="mt-8 max-w-3xl animate-fade-up [animation-delay:120ms]">
          <SearchBar />
        </div>

        <ul className="mt-6 flex flex-wrap gap-x-6 gap-y-2 text-[13px] font-medium text-white/80">
          <li className="inline-flex items-center gap-1.5">
            <Icon name="check" size={15} className="text-aqua" />
            No card needed
          </li>
          <li className="inline-flex items-center gap-1.5">
            <Icon name="check" size={15} className="text-aqua" />
            Free cancellation on most stays
          </li>
          <li className="inline-flex items-center gap-1.5">
            <Icon name="check" size={15} className="text-aqua" />
            Local, independent hosts
          </li>
        </ul>
      </div>
    </section>
  )
}
