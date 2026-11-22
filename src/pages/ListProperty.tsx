import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Icon } from '../components/Icons'
import { PhotoManager } from '../components/PhotoManager'
import { countries } from '../data/countries'
import { amenityChoices } from '../data/amenities'
import { stayTypes } from '../data/listings'
import { createApplication } from '../lib/api'
import { cn } from '../lib/utils'
import { usePageTitle } from '../lib/usePageTitle'
import type { HostApplication, StayType } from '../types'

type Errors = Record<string, string>

const emptyForm = {
  propertyName: '',
  type: 'Resort' as StayType,
  country: '',
  island: '',
  area: '',
  address: '',
  nightlyRate: '',
  guests: '2',
  bedrooms: '1',
  description: '',
  contactName: '',
  email: '',
  phone: '',
}

export function ListPropertyPage() {
  usePageTitle('List your property · Isle BnB')

  const [form, setForm] = useState(emptyForm)
  const [amenities, setAmenities] = useState<string[]>([])
  const [images, setImages] = useState<string[]>([])
  const [errors, setErrors] = useState<Errors>({})
  const [submitted, setSubmitted] = useState<HostApplication | null>(null)
  const [sending, setSending] = useState(false)
  const [submitError, setSubmitError] = useState('')

  const currency = useMemo(() => {
    const country = countries.find((c) => c.code === form.country)
    return country?.currency ?? ''
  }, [form.country])

  const set = (key: keyof typeof emptyForm, value: string) => {
    setForm((current) => ({ ...current, [key]: value }))
  }

  const toggleAmenity = (amenity: string) => {
    setAmenities((current) =>
      current.includes(amenity)
        ? current.filter((a) => a !== amenity)
        : [...current, amenity],
    )
  }

  const validate = (): Errors => {
    const next: Errors = {}
    if (!form.propertyName.trim()) next.propertyName = 'Add the name guests will see'
    if (!form.country) next.country = 'Choose the country'
    if (!form.island.trim()) next.island = 'Which island is it on?'
    if (!form.area.trim()) next.area = 'Add the town, village or area'
    if (!form.nightlyRate || Number(form.nightlyRate) <= 0) {
      next.nightlyRate = 'Enter a nightly rate'
    }
    if (form.description.trim().length < 40) {
      next.description = 'Give travellers at least a couple of sentences'
    }
    if (!form.contactName.trim()) next.contactName = 'Add a contact name'
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(form.email.trim())) {
      next.email = 'Enter a valid email address'
    }
    if (form.phone.trim().replace(/[^\d]/g, '').length < 6) {
      next.phone = 'Enter a phone number we can reach you on'
    }
    if (images.length === 0) next.images = 'Add at least one photo'
    return next
  }

  const submit = async (event: React.FormEvent) => {
    event.preventDefault()
    const found = validate()
    setErrors(found)
    if (Object.keys(found).length > 0) {
      const first = document.querySelector('[aria-invalid="true"]')
      if (first instanceof HTMLElement) first.focus()
      return
    }

    const application: HostApplication = {
      reference: '',
      propertyName: form.propertyName.trim(),
      type: form.type,
      country: form.country,
      island: form.island.trim(),
      area: form.area.trim(),
      address: form.address.trim(),
      nightlyRate: Number(form.nightlyRate),
      currency,
      guests: Number(form.guests) || 1,
      bedrooms: Number(form.bedrooms) || 1,
      description: form.description.trim(),
      amenities,
      contactName: form.contactName.trim(),
      email: form.email.trim(),
      phone: form.phone.trim(),
      createdAt: new Date().toISOString(),
    }
    setSending(true)
    setSubmitError('')
    try {
      const saved = await createApplication({
        propertyName: application.propertyName,
        type: application.type,
        country: application.country,
        island: application.island,
        area: application.area,
        address: application.address,
        nightlyRate: application.nightlyRate,
        currency: application.currency,
        guests: application.guests,
        bedrooms: application.bedrooms,
        description: application.description,
        amenities: application.amenities,
        images,
        contactName: application.contactName,
        email: application.email,
        phone: application.phone,
      })
      setSubmitted({ ...application, reference: saved.reference })
      window.scrollTo({ top: 0, behavior: 'smooth' })
    } catch (error) {
      setSubmitError(
        error instanceof Error
          ? error.message
          : 'Could not submit the application. Please try again.',
      )
    } finally {
      setSending(false)
    }
  }

  if (submitted) {
    return (
      <div className="section max-w-3xl pt-16">
        <div className="card p-8 text-center sm:p-12">
          <span className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-palm/10 text-palm">
            <Icon name="check" size={30} />
          </span>
          <h1 className="mt-6 font-display text-3xl font-semibold text-ink">
            Application received
          </h1>
          <p className="mx-auto mt-3 max-w-lg text-[15px] leading-relaxed text-ink/60">
            Thanks {submitted.contactName.split(' ')[0]} — {submitted.propertyName} and
            your {images.length} photo{images.length === 1 ? '' : 's'} are with our team.
            We call or email within two business days to verify the property; once
            approved it goes live on Isle BnB and you get a dashboard invitation to
            manage your rate and booking requests.
          </p>

          <div className="mx-auto mt-6 max-w-sm rounded-2xl bg-sand px-5 py-4 text-left text-sm">
            <p className="text-xs font-bold uppercase tracking-widest text-ink/45">
              Your reference
            </p>
            <p className="mt-1 font-display text-2xl font-semibold text-ink">
              {submitted.reference}
            </p>
            <p className="mt-3 text-ink/60">
              {submitted.type} · {submitted.area}, {submitted.island}
            </p>
            <p className="text-ink/60">
              {submitted.currency} {submitted.nightlyRate.toLocaleString()} / night
            </p>
          </div>

          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Link to="/" className="btn-dark">
              Back to Isle BnB
            </Link>
            <Link to="/explore" className="btn-outline">
              See how listings look
            </Link>
          </div>

          <p className="mt-6 text-[11px] leading-relaxed text-ink/35">
            Keep this reference. Our team reviews every application in the admin queue.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="section pt-10">
      <div className="grid gap-10 lg:grid-cols-[1.35fr_1fr] lg:gap-16">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-lagoon">
            For hosts
          </p>
          <h1 className="mt-2 text-balance font-display text-3xl font-semibold leading-[1.1] text-ink sm:text-[2.8rem]">
            Put your place in front of travellers already flying here.
          </h1>
          <p className="mt-3 max-w-xl text-[15px] leading-relaxed text-ink/60">
            Resorts, hotels, lodges, guesthouses, homestays and private homes are all
            welcome. List your rate, keep your calendar and get guests who pay on arrival.
            Free during our Pacific launch, no commission on v1 bookings.
          </p>

          <form onSubmit={submit} className="mt-8 space-y-8" noValidate>
            <fieldset className="card p-6">
              <legend className="float-left mb-4 w-full text-sm font-bold uppercase tracking-widest text-ink/45">
                1 · The property
              </legend>
              <div className="clear-both grid gap-4 sm:grid-cols-2">
                <div className="sm:col-span-2">
                  <label htmlFor="propertyName" className="field-label">
                    Property name
                  </label>
                  <input
                    id="propertyName"
                    value={form.propertyName}
                    onChange={(event) => set('propertyName', event.target.value)}
                    placeholder="e.g. Marovo Lagoon Bungalow"
                    className={cn('field', errors.propertyName && 'border-coral')}
                    aria-invalid={Boolean(errors.propertyName)}
                  />
                  {errors.propertyName && (
                    <p className="mt-1 text-xs font-semibold text-coral">
                      {errors.propertyName}
                    </p>
                  )}
                </div>

                <div>
                  <label htmlFor="type" className="field-label">
                    Property type
                  </label>
                  <select
                    id="type"
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
                  <label htmlFor="country" className="field-label">
                    Country
                  </label>
                  <select
                    id="country"
                    value={form.country}
                    onChange={(event) => set('country', event.target.value)}
                    className={cn('field', errors.country && 'border-coral')}
                    aria-invalid={Boolean(errors.country)}
                  >
                    <option value="">Choose a country</option>
                    {countries.map((country) => (
                      <option key={country.code} value={country.code}>
                        {country.name}
                      </option>
                    ))}
                  </select>
                  {errors.country && (
                    <p className="mt-1 text-xs font-semibold text-coral">
                      {errors.country}
                    </p>
                  )}
                </div>

                <div>
                  <label htmlFor="island" className="field-label">
                    Island
                  </label>
                  <input
                    id="island"
                    value={form.island}
                    onChange={(event) => set('island', event.target.value)}
                    placeholder="e.g. Viti Levu"
                    className={cn('field', errors.island && 'border-coral')}
                    aria-invalid={Boolean(errors.island)}
                  />
                  {errors.island && (
                    <p className="mt-1 text-xs font-semibold text-coral">
                      {errors.island}
                    </p>
                  )}
                </div>

                <div>
                  <label htmlFor="area" className="field-label">
                    Town / village / area
                  </label>
                  <input
                    id="area"
                    value={form.area}
                    onChange={(event) => set('area', event.target.value)}
                    placeholder="e.g. Denarau"
                    className={cn('field', errors.area && 'border-coral')}
                    aria-invalid={Boolean(errors.area)}
                  />
                  {errors.area && (
                    <p className="mt-1 text-xs font-semibold text-coral">{errors.area}</p>
                  )}
                </div>

                <div className="sm:col-span-2">
                  <label htmlFor="address" className="field-label">
                    Street address (kept private until a booking is confirmed)
                  </label>
                  <input
                    id="address"
                    value={form.address}
                    onChange={(event) => set('address', event.target.value)}
                    placeholder="Lot / street / village"
                    className="field"
                  />
                </div>
              </div>
            </fieldset>

            <fieldset className="card p-6">
              <legend className="float-left mb-4 w-full text-sm font-bold uppercase tracking-widest text-ink/45">
                2 · Rooms and rates
              </legend>
              <div className="clear-both grid gap-4 sm:grid-cols-3">
                <div>
                  <label htmlFor="nightlyRate" className="field-label">
                    Nightly rate {currency && `(${currency})`}
                  </label>
                  <input
                    id="nightlyRate"
                    type="number"
                    min="1"
                    inputMode="numeric"
                    value={form.nightlyRate}
                    onChange={(event) => set('nightlyRate', event.target.value)}
                    placeholder="250"
                    className={cn('field', errors.nightlyRate && 'border-coral')}
                    aria-invalid={Boolean(errors.nightlyRate)}
                  />
                  {errors.nightlyRate && (
                    <p className="mt-1 text-xs font-semibold text-coral">
                      {errors.nightlyRate}
                    </p>
                  )}
                </div>
                <div>
                  <label htmlFor="guests" className="field-label">
                    Sleeps
                  </label>
                  <select
                    id="guests"
                    value={form.guests}
                    onChange={(event) => set('guests', event.target.value)}
                    className="field"
                  >
                    {[1, 2, 3, 4, 5, 6, 8, 10, 12].map((n) => (
                      <option key={n} value={n}>
                        {n} guest{n > 1 ? 's' : ''}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label htmlFor="bedrooms" className="field-label">
                    Bedrooms
                  </label>
                  <select
                    id="bedrooms"
                    value={form.bedrooms}
                    onChange={(event) => set('bedrooms', event.target.value)}
                    className="field"
                  >
                    {[1, 2, 3, 4, 5, 6, 8, 10].map((n) => (
                      <option key={n} value={n}>
                        {n}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="mt-5">
                <span className="field-label">What do you offer?</span>
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
            </fieldset>

            <fieldset className="card p-6">
              <legend className="float-left mb-4 w-full text-sm font-bold uppercase tracking-widest text-ink/45">
                3 · Describe it
              </legend>
              <div className="clear-both">
                <label htmlFor="description" className="field-label">
                  Tell travellers what makes it special
                </label>
                <textarea
                  id="description"
                  rows={5}
                  value={form.description}
                  onChange={(event) => set('description', event.target.value)}
                  placeholder="Rooms, the view, the reef, meals, transfers, what is nearby…"
                  className={cn('field resize-y', errors.description && 'border-coral')}
                  aria-invalid={Boolean(errors.description)}
                />
                {errors.description && (
                  <p className="mt-1 text-xs font-semibold text-coral">
                    {errors.description}
                  </p>
                )}
              </div>
            </fieldset>

            <fieldset className="card p-6">
              <legend className="float-left mb-4 w-full text-sm font-bold uppercase tracking-widest text-ink/45">
                4 · Photos
              </legend>
              <div className="clear-both">
                <PhotoManager
                  images={images}
                  onChange={(next) => {
                    setImages(next)
                    setErrors((current) => ({ ...current, images: '' }))
                  }}
                />
                {errors.images && (
                  <p className="mt-2 text-xs font-semibold text-coral">{errors.images}</p>
                )}
              </div>
            </fieldset>

            <fieldset className="card p-6">
              <legend className="float-left mb-4 w-full text-sm font-bold uppercase tracking-widest text-ink/45">
                5 · How we reach you
              </legend>
              <div className="clear-both grid gap-4 sm:grid-cols-2">
                <div>
                  <label htmlFor="contactName" className="field-label">
                    Contact name
                  </label>
                  <input
                    id="contactName"
                    value={form.contactName}
                    onChange={(event) => set('contactName', event.target.value)}
                    className={cn('field', errors.contactName && 'border-coral')}
                    aria-invalid={Boolean(errors.contactName)}
                    autoComplete="name"
                  />
                  {errors.contactName && (
                    <p className="mt-1 text-xs font-semibold text-coral">
                      {errors.contactName}
                    </p>
                  )}
                </div>
                <div>
                  <label htmlFor="email" className="field-label">
                    Email
                  </label>
                  <input
                    id="email"
                    type="email"
                    value={form.email}
                    onChange={(event) => set('email', event.target.value)}
                    className={cn('field', errors.email && 'border-coral')}
                    aria-invalid={Boolean(errors.email)}
                    autoComplete="email"
                  />
                  {errors.email && (
                    <p className="mt-1 text-xs font-semibold text-coral">{errors.email}</p>
                  )}
                </div>
                <div>
                  <label htmlFor="phone" className="field-label">
                    Phone / WhatsApp
                  </label>
                  <input
                    id="phone"
                    type="tel"
                    value={form.phone}
                    onChange={(event) => set('phone', event.target.value)}
                    placeholder="+677 000 0000"
                    className={cn('field', errors.phone && 'border-coral')}
                    aria-invalid={Boolean(errors.phone)}
                    autoComplete="tel"
                  />
                  {errors.phone && (
                    <p className="mt-1 text-xs font-semibold text-coral">{errors.phone}</p>
                  )}
                </div>
                <div className="flex items-end">
                  <p className="text-xs leading-relaxed text-ink/45">
                    We only use these details to verify your property. Guests see the
                    property contact, not your personal number, until you confirm a
                    booking.
                  </p>
                </div>
              </div>
            </fieldset>

            {submitError && (
              <p className="rounded-2xl bg-coral/10 px-4 py-3 text-sm font-semibold text-coral">
                {submitError}
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
                  : 'No fee, no commission in v1. You can delist at any time.'}
              </p>
            </div>
          </form>
        </div>

        <aside className="space-y-4 lg:sticky lg:top-24 lg:self-start">
          <div id="standards" className="card scroll-mt-24 p-6">
            <h2 className="font-display text-xl font-semibold text-ink">Host standards</h2>
            <ul className="mt-4 space-y-3 text-sm text-ink/70">
              {[
                'The property exists, is licensed where required, and you have the right to let it.',
                'Rates are clear per night, in local currency, including taxes you must display.',
                'You answer booking requests within 24 hours where possible.',
                'Check-in, payment and transfer arrangements are confirmed before arrival.',
                'Photos and descriptions are your own and show the actual rooms.',
              ].map((item) => (
                <li key={item} className="flex gap-2.5">
                  <Icon name="check" size={16} className="mt-0.5 shrink-0 text-lagoon" />
                  {item}
                </li>
              ))}
            </ul>
          </div>

          <div className="rounded-[1.5rem] bg-deep p-6 text-sand">
            <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-aqua">
              What hosts get
            </p>
            <ul className="mt-4 space-y-3 text-sm text-sand/85">
              <li className="flex gap-2.5">
                <Icon name="globe" size={16} className="mt-0.5 shrink-0 text-aqua" />
                A listing page on a site built for Pacific travellers
              </li>
              <li className="flex gap-2.5">
                <Icon name="mail" size={16} className="mt-0.5 shrink-0 text-aqua" />
                A simple dashboard for your rates, photos and booking requests
              </li>
              <li className="flex gap-2.5">
                <Icon name="wallet" size={16} className="mt-0.5 shrink-0 text-aqua" />
                Guests pay you directly on arrival, in your currency
              </li>
            </ul>
            <a
              href="mailto:hosts@islebnb.com"
              className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-sun hover:text-white"
            >
              <Icon name="mail" size={15} />
              hosts@islebnb.com
            </a>
          </div>
        </aside>
      </div>
    </div>
  )
}
