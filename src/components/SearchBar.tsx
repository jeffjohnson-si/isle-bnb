import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Icon } from './Icons'
import { countries } from '../data/countries'
import { stayTypes } from '../data/listings'

const guestOptions = [1, 2, 3, 4, 5, 6, 7, 8]

export function SearchBar({ compact = false }: { compact?: boolean }) {
  const navigate = useNavigate()
  const [country, setCountry] = useState('')
  const [guests, setGuests] = useState('')
  const [type, setType] = useState('')

  const submit = (event: React.FormEvent) => {
    event.preventDefault()
    const params = new URLSearchParams()
    if (country) params.set('country', country)
    if (guests) params.set('guests', guests)
    if (type) params.set('type', type)
    navigate(`/stays${params.toString() ? `?${params.toString()}` : ''}`)
  }

  return (
    <form
      onSubmit={submit}
      className={
        compact
          ? 'grid gap-2 sm:grid-cols-[1.4fr_1fr_1fr_auto]'
          : 'grid gap-1.5 rounded-[1.75rem] bg-white p-2 shadow-lift sm:grid-cols-[1.5fr_1fr_1fr_auto] sm:rounded-full'
      }
    >
      <label className="group relative flex flex-col justify-center rounded-2xl px-4 py-2.5 transition hover:bg-mist/60 sm:rounded-full">
        <span className="text-[10px] font-bold uppercase tracking-widest text-ink/45">
          Country
        </span>
        <span className="flex items-center gap-2">
          <Icon name="pin" size={16} className="text-lagoon" />
          <select
            value={country}
            onChange={(event) => setCountry(event.target.value)}
            className="w-full cursor-pointer appearance-none bg-transparent pr-4 text-sm font-semibold text-ink focus:outline-none"
            aria-label="Choose a country"
          >
            <option value="">Anywhere in the Pacific</option>
            {countries.map((c) => (
              <option key={c.code} value={c.code}>
                {c.name}
              </option>
            ))}
          </select>
        </span>
        <Icon
          name="chevronDown"
          size={14}
          className="pointer-events-none absolute right-3.5 bottom-4 text-ink/35"
        />
      </label>

      <label className="group relative flex flex-col justify-center rounded-2xl px-4 py-2.5 transition hover:bg-mist/60 sm:rounded-full">
        <span className="text-[10px] font-bold uppercase tracking-widest text-ink/45">
          Guests
        </span>
        <span className="flex items-center gap-2">
          <Icon name="users" size={16} className="text-lagoon" />
          <select
            value={guests}
            onChange={(event) => setGuests(event.target.value)}
            className="w-full cursor-pointer appearance-none bg-transparent pr-4 text-sm font-semibold text-ink focus:outline-none"
            aria-label="Number of guests"
          >
            <option value="">Any number</option>
            {guestOptions.map((n) => (
              <option key={n} value={n}>
                {n} guest{n > 1 ? 's' : ''}
              </option>
            ))}
          </select>
        </span>
        <Icon
          name="chevronDown"
          size={14}
          className="pointer-events-none absolute right-3.5 bottom-4 text-ink/35"
        />
      </label>

      <label className="group relative flex flex-col justify-center rounded-2xl px-4 py-2.5 transition hover:bg-mist/60 sm:rounded-full">
        <span className="text-[10px] font-bold uppercase tracking-widest text-ink/45">
          Stay type
        </span>
        <span className="flex items-center gap-2">
          <Icon name="bed" size={16} className="text-lagoon" />
          <select
            value={type}
            onChange={(event) => setType(event.target.value)}
            className="w-full cursor-pointer appearance-none bg-transparent pr-4 text-sm font-semibold text-ink focus:outline-none"
            aria-label="Type of stay"
          >
            <option value="">Any type</option>
            {stayTypes.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </span>
        <Icon
          name="chevronDown"
          size={14}
          className="pointer-events-none absolute right-3.5 bottom-4 text-ink/35"
        />
      </label>

      <button
        type="submit"
        aria-label="Search stays"
        className="btn-primary h-[56px] w-full gap-2 px-6 sm:w-[56px] sm:shrink-0 sm:self-center sm:px-0"
      >
        <Icon name="search" size={19} />
        <span className="sm:hidden">Search stays</span>
      </button>
    </form>
  )
}
