import { Link } from 'react-router-dom'
import { Icon } from '../components/Icons'
import { usePageTitle } from '../lib/usePageTitle'

export function NotFoundPage() {
  usePageTitle('Page not found · Isle BnB')

  return (
    <div className="section flex min-h-[60vh] flex-col items-center justify-center py-20 text-center">
      <span className="grid h-16 w-16 place-items-center rounded-full bg-mist text-lagoon">
        <Icon name="waves" size={30} />
      </span>
      <h1 className="mt-6 font-display text-3xl font-semibold text-ink sm:text-4xl">
        This one drifted off the map
      </h1>
      <p className="mt-3 max-w-md text-sm leading-relaxed text-ink/60">
        That page is not here. The country you are looking for might be under a different
        name — try the directory.
      </p>
      <div className="mt-7 flex flex-wrap justify-center gap-3">
        <Link to="/" className="btn-dark">
          Back to home
        </Link>
        <Link to="/countries" className="btn-outline">
          All countries
        </Link>
      </div>
    </div>
  )
}
