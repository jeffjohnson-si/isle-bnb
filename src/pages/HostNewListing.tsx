import { useMemo, useState } from 'react'
import { Link, Navigate, useNavigate } from 'react-router-dom'
import { Icon } from '../components/Icons'
import { PhotoManager } from '../components/PhotoManager'
import { amenityChoices } from '../data/amenities'
import { countries } from '../data/countries'
import { stayTypes } from '../data/listings'
import { ApiError, createHostListing } from '../lib/api'
import { getHostToken } from '../lib/hostSession'
import { cn } from '../lib/utils'
import { usePageTitle } from '../lib/usePageTitle'

const emptyForm = {
  name: '',
  type: stayTypes[0] as string,
  country: '',
  island: '',
  area: '',
  province: '',
  price: '',
  summary: '',
  description: '',
  guests: '2',
  bedrooms: '1',
  beds: '1',
  baths: '1',
}

export function HostNewListingPage() {
  usePageTitle('Add a listing · Isle BnB')
  const token = getHostToken()
  const navigate = useNavigate()

  const [form, setForm] = useState(emptyForm)
  const [amenities, setAmenities] = useState<string[]>([])
  const [images, setImages] = useState<string[]>([])
  const [fields, setFields] = useState<Record<string, string>>({})
  const [error, setError] = useState('')
  const [sending, setSending] = useState(false)
  const [done, setDone] = useState<{ listingId: string; name: string } | null>(null)

  const currency = useMemo(
    () => countries.find((country) => country.code === form.country)?.currency ?? '',
    [form.country],
  )

  if (!token) return <Navigate to="/host/login" replace />

  const set = (key: keyof typeof form, value: string) => {
    setForm((current) => ({ ...current, [key]: value }))
    setFields((current) => ({ ...current, [key]: '' }))
  }

  const toggleAmenity = (amenity: string) => {
    setAmenities((current) =>
      current.includes(amenity)
        ? current.filter((item) => item !== amenity)
        : [...current, amenity],
    )
  }

  const submit = async (event: React.FormEvent) => {
    event.preventDefault()
    setSending(true)
    setError('')
    setFields({})
    try {
      const result = await createHostListing(token, {
        name: form.name.trim(),
        type: form.type,
        country: form.country,
        currency,
        island: form.island.trim(),
        area: form.area.trim(),
        province: form.province.trim(),
        price: Number(form.price) || 0,
        summary: form.summary.trim(),
        description: form.description.trim(),
        guests: Number(form.guests) || 1,
        bedrooms: Number(form.bedrooms) || 0,
        beds: Number(form.beds) || 0,
        baths: Number(form.baths) || 0,
        amenities,
        images,
      })
      setDone({ listingId: result.listing.listingId, name: result.listing.name })
      window.scrollTo({ top: 0, behavior: 'smooth' })
    } catch (submitError) {
      if (submitError instanceof ApiError) {
        setFields(submitError.fields)
        if (!Object.keys(submitError.fields).length) setError(submitError.message)
      } else {
        setError(
          submitError instanceof Error ? submitError.message : 'Could not submit the listing.',
        )
      }
    } finally {
      setSending(false)
    }
  }

  if (done) {
    return (
      <div className="section max-w-2xl pt-16">
        <div className="card p-8 text-center sm:p-12">
          <span className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-palm/10 text-palm">
            <Icon name="check" size={30} />
          </span>
          <h1 className="mt-6 font-display text-3xl font-semibold text-ink">
            {done.name} is with our team
          </h1>
          <p className="mx-auto mt-3 max-w-md text-[15px] leading-relaxed text-ink/60">
            We check that the photos and details match the property — usually within two
            business days. When it is approved it goes live and you can start taking
            requests. You can keep editing it in the meantime.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Link to="/host" className="btn-dark">
              Back to my listings
            </Link>
            <button
              type="button"
              className="btn-outline"
              onClick={() => {
                setDone(null)
                setForm(emptyForm)
                setAmenities([])
                setImages([])
              }}
            >
              Add another property
            </button>
          </div>
          <p className="mt-6 text-[11px] leading-relaxed text-ink/35">
            Listing reference <span className="font-mono">{done.listingId}</span>
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="section pt-10">
      <button
        type="button"
        onClick={() => navigate('/host')}
        className="inline-flex items-center gap-1.5 text-sm font-semibold text-ink/55 transition hover:text-ink"
      >
        <Icon name="arrowLeft" size={16} />
        Back to my listings
      </button>

      <div className="mt-6 grid gap-10 lg:grid-cols-[1.35fr_1fr] lg:gap-16">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-lagoon">
            New listing
          </p>
          <h1 className="mt-2 text-balance font-display text-3xl font-semibold leading-[1.1] text-ink sm:text-[2.6rem]">
            Tell travellers about your place
          </h1>
          <p className="mt-3 max-w-xl text-[15px] leading-relaxed text-ink/60">
            Everything here can be changed later. Our team checks each new listing before
            it goes live — you will get an email either way.
          </p>

          <form onSubmit={submit} className="mt-8 space-y-8" noValidate>
            <fieldset className="card p-6">
              <legend className="float-left mb-4 w-full text-sm font-bold uppercase tracking-widest text-ink/45">
                1 · The property
              </legend>
              <div className="clear-both grid gap-4 sm:grid-cols-2">
                <div className="sm:col-span-2">
                  <label htmlFor="newName" className="field-label">
                    Property name
                  </label>
                  <input
                    id="newName"
                    value={form.name}
                    onChange={(event) => set('name', event.target.value)}
                    placeholder="e.g. Marovo Lagoon Bungalows"
                    className={cn('field', fields.name && 'border-coral')}
                    aria-invalid={Boolean(fields.name)}
                  />
                  {fields.name && (
                    <p className="mt-1 text-xs font-semibold text-coral">{fields.name}</p>
                  )}
                </div>

                <div>
                  <label htmlFor="newType" className="field-label">
                    Property type
                  </label>
                  <select
                    id="newType"
                    value={form.type}
                    onChange={(event) => set('type', event.target.value)}
                    className="field"
                  >
                    {stayTypes.map((type) => (
                      <option key={type} value={type}>
                        {type}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label htmlFor="newCountry" className="field-label">
                    Country
                  </label>
                  <select
                    id="newCountry"
                    value={form.country}
                    onChange={(event) => set('country', event.target.value)}
                    className={cn('field', fields.country && 'border-coral')}
                    aria-invalid={Boolean(fields.country)}
                  >
                    <option value="">Choose a country</option>
                    {countries.map((country) => (
                      <option key={country.code} value={country.code}>
                        {country.name}
                      </option>
                    ))}
                  </select>
                  {fields.country && (
                    <p className="mt-1 text-xs font-semibold text-coral">{fields.country}</p>
                  )}
                </div>

                <div>
                  <label htmlFor="newIsland" className="field-label">
                    Island
                  </label>
                  <input
                    id="newIsland"
                    value={form.island}
                    onChange={(event) => set('island', event.target.value)}
                    placeholder="e.g. Viti Levu"
                    className={cn('field', fields.island && 'border-coral')}
                    aria-invalid={Boolean(fields.island)}
                  />
                  {fields.island && (
                    <p className="mt-1 text-xs font-semibold text-coral">{fields.island}</p>
                  )}
                </div>

                <div>
                  <label htmlFor="newArea" className="field-label">
                    Town / village / area
                  </label>
                  <input
                    id="newArea"
                    value={form.area}
                    onChange={(event) => set('area', event.target.value)}
                    placeholder="e.g. Munda"
                    className={cn('field', fields.area && 'border-coral')}
                    aria-invalid={Boolean(fields.area)}
                  />
                  {fields.area && (
                    <p className="mt-1 text-xs font-semibold text-coral">{fields.area}</p>
                  )}
                </div>

                <div className="sm:col-span-2">
                  <label htmlFor="newProvince" className="field-label">
                    Province (optional)
                  </label>
                  <input
                    id="newProvince"
                    value={form.province}
                    onChange={(event) => set('province', event.target.value)}
                    placeholder="Western Province"
                    className="field"
                  />
                </div>
              </div>
            </fieldset>

            <fieldset className="card p-6">
              <legend className="float-left mb-4 w-full text-sm font-bold uppercase tracking-widest text-ink/45">
                2 · Rooms and rate
              </legend>
              <div className="clear-both grid gap-4 sm:grid-cols-2">
                <div className="sm:col-span-2">
                  <label htmlFor="newPrice" className="field-label">
                    Nightly rate {currency && `(${currency})`}
                  </label>
                  <input
                    id="newPrice"
                    type="number"
                    min="0"
                    inputMode="numeric"
                    value={form.price}
                    onChange={(event) => set('price', event.target.value)}
                    placeholder="Enter 0 if you would rather quote on request"
                    className={cn('field', fields.price && 'border-coral')}
                    aria-invalid={Boolean(fields.price)}
                  />
                  {fields.price && (
                    <p className="mt-1 text-xs font-semibold text-coral">{fields.price}</p>
                  )}
                </div>
                <div>
                  <label htmlFor="newGuests" className="field-label">
                    Sleeps
                  </label>
                  <input
                    id="newGuests"
                    type="number"
                    min="1"
                    value={form.guests}
                    onChange={(event) => set('guests', event.target.value)}
                    className="field"
                  />
                </div>
                <div>
                  <label htmlFor="newBedrooms" className="field-label">
                    Bedrooms
                  </label>
                  <input
                    id="newBedrooms"
                    type="number"
                    min="0"
                    value={form.bedrooms}
                    onChange={(event) => set('bedrooms', event.target.value)}
                    className="field"
                  />
                </div>
                <div>
                  <label htmlFor="newBeds" className="field-label">
                    Beds
                  </label>
                  <input
                    id="newBeds"
                    type="number"
                    min="0"
                    value={form.beds}
                    onChange={(event) => set('beds', event.target.value)}
                    className="field"
                  />
                </div>
                <div>
                  <label htmlFor="newBaths" className="field-label">
                    Bathrooms
                  </label>
                  <input
                    id="newBaths"
                    type="number"
                    min="0"
                    value={form.baths}
                    onChange={(event) => set('baths', event.target.value)}
                    className="field"
                  />
                </div>
              </div>
            </fieldset>

            <fieldset className="card p-6">
              <legend className="float-left mb-4 w-full text-sm font-bold uppercase tracking-widest text-ink/45">
                3 · Describe it
              </legend>
              <div className="clear-both grid gap-4">
                <div>
                  <label htmlFor="newSummary" className="field-label">
                    One-line summary
                  </label>
                  <input
                    id="newSummary"
                    value={form.summary}
                    onChange={(event) => set('summary', event.target.value)}
                    maxLength={200}
                    placeholder="Waterfront bungalows with a reef straight off the deck"
                    className={cn('field', fields.summary && 'border-coral')}
                  />
                </div>
                <div>
                  <label htmlFor="newDescription" className="field-label">
                    Description
                  </label>
                  <textarea
                    id="newDescription"
                    rows={6}
                    value={form.description}
                    onChange={(event) => set('description', event.target.value)}
                    placeholder="Rooms, the view, meals, transfers, what is nearby…"
                    className={cn('field resize-y', fields.description && 'border-coral')}
                    aria-invalid={Boolean(fields.description)}
                  />
                  {fields.description ? (
                    <p className="mt-1 text-xs font-semibold text-coral">
                      {fields.description}
                    </p>
                  ) : (
                    <p className="mt-1 text-xs text-ink/40">At least a couple of sentences.</p>
                  )}
                </div>
                <div>
                  <span className="field-label">What you offer</span>
                  <div className="flex flex-wrap gap-2">
                    {amenityChoices.map((amenity) => {
                      const active = amenities.includes(amenity)
                      return (
                        <button
                          key={amenity}
                          type="button"
                          onClick={() => toggleAmenity(amenity)}
                          aria-pressed={active}
                          className={cn(
                            'rounded-full border px-3.5 py-2 text-xs font-semibold transition',
                            active
                              ? 'border-palm bg-palm text-white'
                              : 'border-ink/15 bg-white text-ink/65 hover:border-ink/35',
                          )}
                        >
                          {amenity}
                        </button>
                      )
                    })}
                  </div>
                </div>
              </div>
            </fieldset>

            <fieldset className="card p-6">
              <legend className="float-left mb-4 w-full text-sm font-bold uppercase tracking-widest text-ink/45">
                4 · Photos
              </legend>
              <div className="clear-both">
                <PhotoManager token={token} images={images} onChange={setImages} />
                {fields.images && (
                  <p className="mt-1 text-xs font-semibold text-coral">{fields.images}</p>
                )}
              </div>
            </fieldset>

            {error && (
              <p className="rounded-2xl bg-coral/10 px-4 py-3 text-sm font-semibold text-coral">
                {error}
              </p>
            )}

            <div className="flex flex-wrap items-center gap-4">
              <button
                type="submit"
                disabled={sending || images.length === 0}
                className="btn-primary disabled:cursor-not-allowed disabled:opacity-60"
              >
                {sending ? 'Submitting…' : 'Submit for review'}
                <Icon name="arrowRight" size={16} />
              </button>
              <p className="text-xs text-ink/45">
                {images.length === 0
                  ? 'Add at least one photo to submit.'
                  : 'No fee. Guests pay you on arrival.'}
              </p>
            </div>
          </form>
        </div>

        <aside className="space-y-4 lg:sticky lg:top-24 lg:self-start">
          <div className="rounded-[1.5rem] bg-deep p-6 text-sand">
            <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-aqua">
              What happens next
            </p>
            <ol className="mt-4 space-y-3 text-sm text-sand/85">
              {[
                'You submit the listing and we both get an email.',
                'Our team checks the photos and details — usually two business days.',
                'It goes live and guests can send booking requests.',
                'You confirm or decline each request; the guest pays you on arrival.',
              ].map((step, index) => (
                <li key={step} className="flex gap-3">
                  <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-aqua/20 text-xs font-bold text-aqua">
                    {index + 1}
                  </span>
                  {step}
                </li>
              ))}
            </ol>
          </div>

          <div className="card p-6">
            <h2 className="font-display text-xl font-semibold text-ink">A good listing</h2>
            <ul className="mt-4 space-y-3 text-sm text-ink/70">
              {[
                'Photos of the actual room and the view — daylight helps.',
                'The real nightly rate in local currency, or 0 for on request.',
                'How guests arrive: airport, jetty, boat transfer.',
                'What is included: meals, transfers, activities.',
              ].map((item) => (
                <li key={item} className="flex gap-2.5">
                  <Icon name="check" size={16} className="mt-0.5 shrink-0 text-lagoon" />
                  {item}
                </li>
              ))}
            </ul>
            <p className="mt-4 text-xs leading-relaxed text-ink/45">
              We do not take a commission and never ask guests for card details.
            </p>
          </div>
        </aside>
      </div>
    </div>
  )
}
