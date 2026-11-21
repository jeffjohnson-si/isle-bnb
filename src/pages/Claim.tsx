import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { Icon } from '../components/Icons'
import { listingById } from '../data/listings'
import { submitClaim } from '../lib/api'
import { listingLocation } from '../lib/location'
import { cn } from '../lib/utils'
import { usePageTitle } from '../lib/usePageTitle'
import { NotFoundPage } from './NotFound'

const ROLES = ['Owner', 'Manager', 'Authorised representative'] as const

const PROOFS = [
  {
    value: 'Published phone callback',
    label: 'Call the property number',
    hint: 'We ring the number published on your website or Facebook page and ask for you.',
  },
  {
    value: 'Domain email',
    label: 'Email from the property domain',
    hint: 'Reply from an address at the property’s own domain, e.g. you@hotel.com.fj.',
  },
  {
    value: 'Business licence',
    label: 'Business licence or registration',
    hint: 'Send a photo or scan of the licence naming the business and the property.',
  },
  {
    value: 'Social media post',
    label: 'Post from the property’s page',
    hint: 'Publish a short post saying you are claiming the listing on Isle BnB.',
  },
] as const

const emptyForm = {
  claimantName: '',
  role: ROLES[0] as string,
  email: '',
  phone: '',
  proofType: PROOFS[0].value as string,
  proofDetail: '',
}

type Errors = Record<string, string>

export function ClaimPage() {
  const { id = '' } = useParams()
  const listing = listingById(id)
  usePageTitle(listing ? `Claim ${listing.name} · Isle BnB` : 'Stay not found · Isle BnB')

  const [form, setForm] = useState(emptyForm)
  const [errors, setErrors] = useState<Errors>({})
  const [reference, setReference] = useState('')
  const [sending, setSending] = useState(false)
  const [submitError, setSubmitError] = useState('')

  if (!listing) return <NotFoundPage />

  const set = (key: keyof typeof emptyForm, value: string) => {
    setForm((current) => ({ ...current, [key]: value }))
    setErrors((current) => ({ ...current, [key]: '' }))
  }

  const validate = (): Errors => {
    const next: Errors = {}
    if (!form.claimantName.trim()) next.claimantName = 'Tell us who you are'
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(form.email.trim())) {
      next.email = 'Enter a valid email address'
    }
    if (form.phone.trim().replace(/[^\d]/g, '').length < 6) {
      next.phone = 'Enter a number we can reach you on'
    }
    if (!form.proofType) next.proofType = 'Choose how we can verify you'
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

    setSending(true)
    setSubmitError('')
    try {
      const claim = await submitClaim({
        listingId: listing.id,
        listingName: listing.name,
        claimantName: form.claimantName.trim(),
        role: form.role,
        email: form.email.trim(),
        phone: form.phone.trim(),
        proofType: form.proofType,
        proofDetail: form.proofDetail.trim(),
      })
      setReference(claim.reference)
      window.scrollTo({ top: 0, behavior: 'smooth' })
    } catch (error) {
      setSubmitError(
        error instanceof Error ? error.message : 'Could not send the claim. Please try again.',
      )
    } finally {
      setSending(false)
    }
  }

  if (reference) {
    const chosen = PROOFS.find((proof) => proof.value === form.proofType)

    return (
      <div className="section max-w-3xl pt-16">
        <div className="card p-8 text-center sm:p-12">
          <span className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-palm/10 text-palm">
            <Icon name="check" size={30} />
          </span>
          <h1 className="mt-6 font-display text-3xl font-semibold text-ink">
            Claim received
          </h1>
          <p className="mx-auto mt-3 max-w-lg text-[15px] leading-relaxed text-ink/60">
            Thanks {form.claimantName.split(' ')[0]} — we have your claim for{' '}
            {listing.name}. Nothing changes on the listing until we have verified you,
            and we will contact you on {form.phone} first.
          </p>

          <div className="mx-auto mt-6 max-w-sm rounded-2xl bg-sand px-5 py-4 text-left text-sm">
            <p className="text-xs font-bold uppercase tracking-widest text-ink/45">
              Your claim reference
            </p>
            <p className="mt-1 font-display text-2xl font-semibold text-ink">{reference}</p>
            <p className="mt-3 text-ink/60">{listing.name}</p>
            <p className="text-ink/60">
              {form.role} · {chosen?.label ?? form.proofType}
            </p>
          </div>

          <p className="mx-auto mt-6 max-w-md text-xs leading-relaxed text-ink/45">
            We aim to verify claims within two business days. Once verified you get
            control of the photos, description, rooms and rates on this page.
          </p>

          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Link to={`/stays/${listing.id}`} className="btn-dark">
              View the listing
            </Link>
            <Link to="/list-your-place" className="btn-outline">
              List another property
            </Link>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="section pt-10">
      <Link
        to={`/stays/${listing.id}`}
        className="inline-flex items-center gap-1.5 text-sm font-semibold text-ink/55 transition hover:text-ink"
      >
        <Icon name="arrowLeft" size={16} />
        Back to {listing.name}
      </Link>

      <div className="mt-6 grid gap-10 lg:grid-cols-[1.35fr_1fr] lg:gap-16">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-lagoon">
            For hosts
          </p>
          <h1 className="mt-2 text-balance font-display text-3xl font-semibold leading-[1.1] text-ink sm:text-[2.6rem]">
            Is this your property?
          </h1>
          <p className="mt-3 max-w-xl text-[15px] leading-relaxed text-ink/60">
            We add Pacific properties from public information while we build the
            catalogue. If this listing is yours, claim it and we will hand over the
            photos, description, rooms and rates.
          </p>

          <form onSubmit={submit} className="mt-8 space-y-8" noValidate>
            <fieldset className="card p-6">
              <legend className="float-left mb-4 w-full text-sm font-bold uppercase tracking-widest text-ink/45">
                1 · About you
              </legend>
              <div className="clear-both grid gap-4 sm:grid-cols-2">
                <div className="sm:col-span-2">
                  <label htmlFor="claimantName" className="field-label">
                    Your full name
                  </label>
                  <input
                    id="claimantName"
                    value={form.claimantName}
                    onChange={(event) => set('claimantName', event.target.value)}
                    autoComplete="name"
                    className={cn('field', errors.claimantName && 'border-coral')}
                    aria-invalid={Boolean(errors.claimantName)}
                  />
                  {errors.claimantName && (
                    <p className="mt-1 text-xs font-semibold text-coral">
                      {errors.claimantName}
                    </p>
                  )}
                </div>

                <div className="sm:col-span-2">
                  <span className="field-label">Your role at the property</span>
                  <div className="flex flex-wrap gap-2">
                    {ROLES.map((role) => (
                      <button
                        key={role}
                        type="button"
                        onClick={() => set('role', role)}
                        aria-pressed={form.role === role}
                        className={cn(
                          'rounded-full border px-3.5 py-2 text-xs font-semibold transition',
                          form.role === role
                            ? 'border-palm bg-palm text-white'
                            : 'border-ink/15 bg-white text-ink/65 hover:border-ink/35',
                        )}
                      >
                        {role}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label htmlFor="claimEmail" className="field-label">
                    Email
                  </label>
                  <input
                    id="claimEmail"
                    type="email"
                    value={form.email}
                    onChange={(event) => set('email', event.target.value)}
                    autoComplete="email"
                    className={cn('field', errors.email && 'border-coral')}
                    aria-invalid={Boolean(errors.email)}
                  />
                  {errors.email && (
                    <p className="mt-1 text-xs font-semibold text-coral">{errors.email}</p>
                  )}
                </div>

                <div>
                  <label htmlFor="claimPhone" className="field-label">
                    Phone / WhatsApp
                  </label>
                  <input
                    id="claimPhone"
                    type="tel"
                    value={form.phone}
                    onChange={(event) => set('phone', event.target.value)}
                    placeholder="+677 000 0000"
                    autoComplete="tel"
                    className={cn('field', errors.phone && 'border-coral')}
                    aria-invalid={Boolean(errors.phone)}
                  />
                  {errors.phone && (
                    <p className="mt-1 text-xs font-semibold text-coral">{errors.phone}</p>
                  )}
                </div>
              </div>
            </fieldset>

            <fieldset className="card p-6">
              <legend className="float-left mb-4 w-full text-sm font-bold uppercase tracking-widest text-ink/45">
                2 · How can we verify you?
              </legend>
              <div className="clear-both space-y-2.5">
                {PROOFS.map((proof) => {
                  const active = form.proofType === proof.value
                  return (
                    <label
                      key={proof.value}
                      className={cn(
                        'flex cursor-pointer gap-3 rounded-2xl border p-4 transition',
                        active
                          ? 'border-palm bg-mist/60'
                          : 'border-ink/12 bg-white hover:border-ink/25',
                      )}
                    >
                      <input
                        type="radio"
                        name="proofType"
                        value={proof.value}
                        checked={active}
                        onChange={() => set('proofType', proof.value)}
                        className="mt-1 h-4 w-4 shrink-0 accent-palm"
                      />
                      <span>
                        <span className="block text-sm font-semibold text-ink">
                          {proof.label}
                        </span>
                        <span className="mt-0.5 block text-xs leading-relaxed text-ink/55">
                          {proof.hint}
                        </span>
                      </span>
                    </label>
                  )
                })}
              </div>

              <div className="mt-5">
                <label htmlFor="proofDetail" className="field-label">
                  Anything we should know (optional)
                </label>
                <textarea
                  id="proofDetail"
                  rows={3}
                  value={form.proofDetail}
                  onChange={(event) => set('proofDetail', event.target.value)}
                  placeholder="The published number to ring, the email address you will reply from, a licence number…"
                  className="field resize-y"
                />
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
                disabled={sending}
                className="btn-primary disabled:cursor-wait"
              >
                {sending ? 'Sending claim…' : 'Claim this listing'}
                <Icon name="arrowRight" size={16} />
              </button>
              <p className="text-xs text-ink/45">
                Free. We only call the number already published for the property.
              </p>
            </div>
          </form>
        </div>

        <aside className="space-y-4 lg:sticky lg:top-24 lg:self-start">
          <div className="card overflow-hidden">
            <img
              src={listing.images[0]}
              alt={listing.name}
              className="aspect-[4/3] w-full object-cover"
            />
            <div className="p-5">
              <p className="chip bg-shell text-ink/70">{listing.type}</p>
              <h2 className="mt-2 font-display text-xl font-semibold text-ink">
                {listing.name}
              </h2>
              <p className="mt-1 flex items-center gap-1.5 text-sm text-ink/55">
                <Icon name="pin" size={14} />
                {listingLocation(listing)}
              </p>
            </div>
          </div>

          <div className="rounded-[1.5rem] bg-deep p-6 text-sand">
            <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-aqua">
              What happens next
            </p>
            <ol className="mt-4 space-y-3 text-sm text-sand/85">
              {[
                'We check the claim against the property’s published contact details.',
                'We call or email you on the number and address you give us.',
                'Once verified, the page shows “Managed by the owner” and you set the rooms, rates and photos.',
              ].map((step, index) => (
                <li key={step} className="flex gap-3">
                  <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-aqua/20 text-xs font-bold text-aqua">
                    {index + 1}
                  </span>
                  {step}
                </li>
              ))}
            </ol>
            <p className="mt-5 text-xs leading-relaxed text-sand/55">
              Nobody can take a listing over by claiming it — verification always comes
              first.
            </p>
          </div>
        </aside>
      </div>
    </div>
  )
}
