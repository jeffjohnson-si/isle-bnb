import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Icon } from '../components/Icons'
import {
  ApiError,
  fetchAdminApplications,
  fetchAdminBookings,
  fetchAdminClaims,
  setApplicationStatus,
  setClaimStatus,
  type AdminApplication,
  type AdminBooking,
  type AdminClaim,
} from '../lib/api'
import { cn } from '../lib/utils'
import { usePageTitle } from '../lib/usePageTitle'

const TOKEN_KEY = 'islebnb.admintoken.v1'

type Tab = 'applications' | 'claims' | 'bookings'

const TABS: { id: Tab; label: string }[] = [
  { id: 'applications', label: 'Host applications' },
  { id: 'claims', label: 'Listing claims' },
  { id: 'bookings', label: 'Bookings' },
]

const when = (iso: string) => {
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return iso
  return date.toLocaleString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

const statusStyle = (status: string) =>
  status === 'verified' || status === 'approved'
    ? 'bg-palm/10 text-palm'
    : status === 'rejected' || status === 'cancelled'
      ? 'bg-coral/10 text-coral'
      : 'bg-sun/25 text-ink/70'

function StatusPill({ status }: { status: string }) {
  return (
    <span
      className={cn(
        'rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider',
        statusStyle(status),
      )}
    >
      {status}
    </span>
  )
}

function Empty({ tab }: { tab: Tab }) {
  const copy: Record<Tab, string> = {
    applications: 'No host applications yet. They arrive from the “List your place” form.',
    claims: 'No listing claims yet. They arrive from the “Claim this listing” link.',
    bookings: 'No booking requests yet. They arrive from a listing page.',
  }
  return (
    <div className="card p-10 text-center text-sm leading-relaxed text-ink/55">
      {copy[tab]}
    </div>
  )
}

export function AdminPage() {
  usePageTitle('Team dashboard · Isle BnB')

  const [token, setToken] = useState(() => sessionStorage.getItem(TOKEN_KEY) ?? '')
  const [draft, setDraft] = useState('')
  const [tab, setTab] = useState<Tab>('applications')
  const [applications, setApplications] = useState<AdminApplication[]>([])
  const [claims, setClaims] = useState<AdminClaim[]>([])
  const [bookings, setBookings] = useState<AdminBooking[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState('')

  const load = useCallback(async (activeToken: string) => {
    setLoading(true)
    setError('')
    try {
      const [apps, claimRows, bookingRows] = await Promise.all([
        fetchAdminApplications(activeToken),
        fetchAdminClaims(activeToken),
        fetchAdminBookings(activeToken),
      ])
      setApplications(apps)
      setClaims(claimRows)
      setBookings(bookingRows)
    } catch (error) {
      if (error instanceof ApiError && /unauthoris/i.test(error.message)) {
        sessionStorage.removeItem(TOKEN_KEY)
        setToken('')
        setError('That token was not accepted. Check ADMIN_TOKEN on the server.')
      } else {
        setError(error instanceof Error ? error.message : 'Could not load the queue.')
      }
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (token) void load(token)
  }, [token, load])

  const signIn = (event: React.FormEvent) => {
    event.preventDefault()
    const value = draft.trim()
    if (!value) return
    sessionStorage.setItem(TOKEN_KEY, value)
    setToken(value)
  }

  const signOut = () => {
    sessionStorage.removeItem(TOKEN_KEY)
    setToken('')
    setDraft('')
    setApplications([])
    setClaims([])
    setBookings([])
  }

  const patchApplication = async (
    reference: string,
    status: 'pending' | 'approved' | 'rejected',
  ) => {
    setBusy(reference)
    setError('')
    try {
      const updated = await setApplicationStatus(token, reference, status)
      setApplications((rows) =>
        rows.map((row) => (row.reference === reference ? updated : row)),
      )
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Could not update the application.')
    } finally {
      setBusy('')
    }
  }

  const patchClaim = async (
    reference: string,
    status: 'pending' | 'verified' | 'rejected',
  ) => {
    setBusy(reference)
    setError('')
    try {
      const updated = await setClaimStatus(token, reference, status)
      setClaims((rows) => rows.map((row) => (row.reference === reference ? updated : row)))
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Could not update the claim.')
    } finally {
      setBusy('')
    }
  }

  if (!token) {
    return (
      <div className="section max-w-lg pt-16">
        <div className="card p-8">
          <span className="grid h-12 w-12 place-items-center rounded-2xl bg-deep text-sand">
            <Icon name="shield" size={22} />
          </span>
          <h1 className="mt-5 font-display text-2xl font-semibold text-ink">
            Team dashboard
          </h1>
          <p className="mt-2 text-sm leading-relaxed text-ink/60">
            Enter the admin token set on the API server. It is kept in this tab only and
            cleared when you close it.
          </p>
          <form onSubmit={signIn} className="mt-6 space-y-3">
            <label htmlFor="token" className="field-label">
              Admin token
            </label>
            <input
              id="token"
              type="password"
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              placeholder="ADMIN_TOKEN"
              className="field"
              autoComplete="off"
            />
            <button type="submit" className="btn-primary w-full justify-center">
              Open dashboard
              <Icon name="arrowRight" size={16} />
            </button>
          </form>
          {error && (
            <p className="mt-4 rounded-2xl bg-coral/10 px-4 py-3 text-sm font-semibold text-coral">
              {error}
            </p>
          )}
          <p className="mt-4 text-xs leading-relaxed text-ink/45">
            In development the server falls back to <code>dev-admin-token</code> unless
            you set <code>ADMIN_TOKEN</code>.
          </p>
        </div>
      </div>
    )
  }

  const pendingApplications = applications.filter((row) => row.status === 'pending').length
  const pendingClaims = claims.filter((row) => row.status === 'pending').length

  const counts: Record<Tab, number> = {
    applications: pendingApplications,
    claims: pendingClaims,
    bookings: bookings.filter((row) => row.status === 'pending').length,
  }

  return (
    <div className="section pt-10">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-lagoon">
            Team
          </p>
          <h1 className="mt-2 font-display text-3xl font-semibold text-ink">
            Operations dashboard
          </h1>
          <p className="mt-1 text-sm text-ink/55">
            {applications.length} applications · {claims.length} claims ·{' '}
            {bookings.length} bookings
          </p>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => void load(token)}
            disabled={loading}
            className="btn-outline gap-2 disabled:cursor-wait"
          >
            <Icon name="globe" size={16} />
            {loading ? 'Refreshing…' : 'Refresh'}
          </button>
          <button type="button" onClick={signOut} className="btn-outline">
            Sign out
          </button>
        </div>
      </div>

      <div className="mt-6 flex flex-wrap gap-2 border-b border-ink/10 pb-3">
        {TABS.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => setTab(item.id)}
            aria-pressed={tab === item.id}
            className={cn(
              'inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold transition',
              tab === item.id
                ? 'bg-deep text-sand shadow-card'
                : 'border border-ink/12 bg-white text-ink/60 hover:border-ink/30 hover:text-ink',
            )}
          >
            {item.label}
            {counts[item.id] > 0 && (
              <span
                className={cn(
                  'grid h-5 min-w-5 place-items-center rounded-full px-1.5 text-[11px] font-bold',
                  tab === item.id ? 'bg-sun text-ink' : 'bg-sun/30 text-ink/70',
                )}
              >
                {counts[item.id]}
              </span>
            )}
          </button>
        ))}
      </div>

      {error && (
        <p className="mt-4 rounded-2xl bg-coral/10 px-4 py-3 text-sm font-semibold text-coral">
          {error}
        </p>
      )}

      <div className="mt-6 space-y-4">
        {loading && !applications.length && !claims.length && !bookings.length && (
          <p className="text-sm text-ink/50">Loading the queue…</p>
        )}

        {tab === 'applications' &&
          (applications.length === 0 ? (
            <Empty tab="applications" />
          ) : (
            applications.map((row) => (
              <article key={row.reference} className="card p-5 sm:p-6">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="font-display text-xl font-semibold text-ink">
                        {row.property_name}
                      </h2>
                      <StatusPill status={row.status} />
                    </div>
                    <p className="mt-1 text-sm text-ink/55">
                      {row.type} · {row.area}, {row.island} · {row.country}
                    </p>
                  </div>
                  <p className="text-xs text-ink/40">{when(row.created_at)}</p>
                </div>

                <dl className="mt-4 grid gap-x-6 gap-y-2 text-sm sm:grid-cols-2">
                  <div className="flex justify-between gap-2 border-b border-ink/5 pb-1.5">
                    <dt className="text-ink/50">Rate</dt>
                    <dd className="font-semibold text-ink">
                      {row.currency} {row.nightly_rate.toLocaleString()} / night
                    </dd>
                  </div>
                  <div className="flex justify-between gap-2 border-b border-ink/5 pb-1.5">
                    <dt className="text-ink/50">Sleeps</dt>
                    <dd className="font-semibold text-ink">
                      {row.guests} guests · {row.bedrooms} bedroom
                      {row.bedrooms > 1 ? 's' : ''}
                    </dd>
                  </div>
                  <div className="flex justify-between gap-2 border-b border-ink/5 pb-1.5">
                    <dt className="text-ink/50">Contact</dt>
                    <dd className="font-semibold text-ink">{row.contact_name}</dd>
                  </div>
                  <div className="flex justify-between gap-2 border-b border-ink/5 pb-1.5">
                    <dt className="text-ink/50">Reference</dt>
                    <dd className="font-mono text-xs font-semibold text-ink">
                      {row.reference}
                    </dd>
                  </div>
                </dl>

                <p className="mt-3 text-sm leading-relaxed text-ink/65">{row.description}</p>
                {row.amenities && row.amenities !== '[]' && (
                  <p className="mt-2 text-xs text-ink/45">
                    Offers: {JSON.parse(row.amenities).join(', ')}
                  </p>
                )}

                <div className="mt-4 flex flex-wrap items-center gap-4 text-sm">
                  <a
                    href={`mailto:${row.email}`}
                    className="inline-flex items-center gap-1.5 font-semibold text-lagoon hover:text-ink"
                  >
                    <Icon name="mail" size={15} />
                    {row.email}
                  </a>
                  <a
                    href={`tel:${row.phone}`}
                    className="inline-flex items-center gap-1.5 font-semibold text-lagoon hover:text-ink"
                  >
                    <Icon name="phone" size={15} />
                    {row.phone}
                  </a>
                  {row.address && (
                    <span className="text-xs text-ink/45">{row.address}</span>
                  )}
                </div>

                <div className="mt-4 flex flex-wrap gap-2">
                  {row.status !== 'approved' && (
                    <button
                      type="button"
                      onClick={() => void patchApplication(row.reference, 'approved')}
                      disabled={busy === row.reference}
                      className="rounded-full bg-palm px-4 py-2 text-xs font-bold text-white transition hover:bg-ink disabled:cursor-wait"
                    >
                      Approve
                    </button>
                  )}
                  {row.status !== 'rejected' && (
                    <button
                      type="button"
                      onClick={() => void patchApplication(row.reference, 'rejected')}
                      disabled={busy === row.reference}
                      className="rounded-full border border-coral/40 px-4 py-2 text-xs font-bold text-coral transition hover:bg-coral/10 disabled:cursor-wait"
                    >
                      Reject
                    </button>
                  )}
                  {row.status !== 'pending' && (
                    <button
                      type="button"
                      onClick={() => void patchApplication(row.reference, 'pending')}
                      disabled={busy === row.reference}
                      className="rounded-full border border-ink/15 px-4 py-2 text-xs font-bold text-ink/60 transition hover:border-ink/35 disabled:cursor-wait"
                    >
                      Back to pending
                    </button>
                  )}
                </div>
              </article>
            ))
          ))}

        {tab === 'claims' &&
          (claims.length === 0 ? (
            <Empty tab="claims" />
          ) : (
            claims.map((row) => (
              <article key={row.reference} className="card p-5 sm:p-6">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="font-display text-xl font-semibold text-ink">
                        {row.listing_name}
                      </h2>
                      <StatusPill status={row.status} />
                    </div>
                    <p className="mt-1 text-sm text-ink/55">
                      {row.claimant_name} · {row.role}
                    </p>
                  </div>
                  <p className="text-xs text-ink/40">{when(row.created_at)}</p>
                </div>

                <div className="mt-4 flex flex-wrap gap-x-8 gap-y-2 text-sm">
                  <p>
                    <span className="text-ink/50">Reference </span>
                    <span className="font-mono text-xs font-semibold text-ink">
                      {row.reference}
                    </span>
                  </p>
                  <p>
                    <span className="text-ink/50">Proof offered </span>
                    <span className="font-semibold text-ink">{row.proof_type}</span>
                  </p>
                  <p>
                    <span className="text-ink/50">Listing </span>
                    <span className="font-mono text-xs font-semibold text-ink">
                      {row.listing_id}
                    </span>
                  </p>
                </div>

                {row.proof_detail && (
                  <p className="mt-3 rounded-xl bg-sand px-4 py-3 text-sm leading-relaxed text-ink/70">
                    {row.proof_detail}
                  </p>
                )}

                <div className="mt-4 flex flex-wrap items-center gap-4 text-sm">
                  <a
                    href={`mailto:${row.email}`}
                    className="inline-flex items-center gap-1.5 font-semibold text-lagoon hover:text-ink"
                  >
                    <Icon name="mail" size={15} />
                    {row.email}
                  </a>
                  <a
                    href={`tel:${row.phone}`}
                    className="inline-flex items-center gap-1.5 font-semibold text-lagoon hover:text-ink"
                  >
                    <Icon name="phone" size={15} />
                    {row.phone}
                  </a>
                  <Link
                    to={`/stays/${row.listing_id}`}
                    className="inline-flex items-center gap-1.5 text-xs font-semibold text-ink/50 hover:text-ink"
                  >
                    <Icon name="arrowRight" size={14} />
                    Open listing
                  </Link>
                </div>

                <div className="mt-4 flex flex-wrap gap-2">
                  {row.status !== 'verified' && (
                    <button
                      type="button"
                      onClick={() => void patchClaim(row.reference, 'verified')}
                      disabled={busy === row.reference}
                      className="rounded-full bg-palm px-4 py-2 text-xs font-bold text-white transition hover:bg-ink disabled:cursor-wait"
                    >
                      Verify owner
                    </button>
                  )}
                  {row.status !== 'rejected' && (
                    <button
                      type="button"
                      onClick={() => void patchClaim(row.reference, 'rejected')}
                      disabled={busy === row.reference}
                      className="rounded-full border border-coral/40 px-4 py-2 text-xs font-bold text-coral transition hover:bg-coral/10 disabled:cursor-wait"
                    >
                      Reject
                    </button>
                  )}
                  {row.status !== 'pending' && (
                    <button
                      type="button"
                      onClick={() => void patchClaim(row.reference, 'pending')}
                      disabled={busy === row.reference}
                      className="rounded-full border border-ink/15 px-4 py-2 text-xs font-bold text-ink/60 transition hover:border-ink/35 disabled:cursor-wait"
                    >
                      Back to pending
                    </button>
                  )}
                </div>
                <p className="mt-3 text-xs leading-relaxed text-ink/40">
                  Only verify after speaking to the property on a number you found
                  independently.
                </p>
              </article>
            ))
          ))}

        {tab === 'bookings' &&
          (bookings.length === 0 ? (
            <Empty tab="bookings" />
          ) : (
            bookings.map((row) => (
              <article key={row.reference} className="card p-5 sm:p-6">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="font-display text-xl font-semibold text-ink">
                        {row.listing_name}
                      </h2>
                      <StatusPill status={row.status} />
                    </div>
                    <p className="mt-1 text-sm text-ink/55">
                      {row.check_in} → {row.check_out} · {row.nights} night
                      {row.nights === 1 ? '' : 's'} · {row.guests} guest
                      {row.guests === 1 ? '' : 's'}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-mono text-xs font-semibold text-ink/60">
                      {row.reference}
                    </p>
                    <p className="text-xs text-ink/40">{when(row.created_at)}</p>
                  </div>
                </div>

                <dl className="mt-4 grid gap-x-6 gap-y-2 text-sm sm:grid-cols-2">
                  <div className="flex justify-between gap-2 border-b border-ink/5 pb-1.5">
                    <dt className="text-ink/50">Guest</dt>
                    <dd className="font-semibold text-ink">{row.guest_name}</dd>
                  </div>
                  <div className="flex justify-between gap-2 border-b border-ink/5 pb-1.5">
                    <dt className="text-ink/50">Value on arrival</dt>
                    <dd className="font-semibold text-ink">
                      {row.total > 0
                        ? `${row.currency} ${row.total.toLocaleString()}`
                        : 'Rate confirmed by property'}
                    </dd>
                  </div>
                  <div className="flex justify-between gap-2 border-b border-ink/5 pb-1.5">
                    <dt className="text-ink/50">Where</dt>
                    <dd className="font-semibold text-ink">{row.island}</dd>
                  </div>
                  <div className="flex justify-between gap-2 border-b border-ink/5 pb-1.5">
                    <dt className="text-ink/50">Email</dt>
                    <dd className="font-semibold text-ink">{row.guest_email}</dd>
                  </div>
                </dl>

                {row.notes && (
                  <p className="mt-3 rounded-xl bg-sand px-4 py-3 text-sm leading-relaxed text-ink/70">
                    {row.notes}
                  </p>
                )}

                <div className="mt-4 flex flex-wrap items-center gap-4 text-sm">
                  <a
                    href={`mailto:${row.guest_email}`}
                    className="inline-flex items-center gap-1.5 font-semibold text-lagoon hover:text-ink"
                  >
                    <Icon name="mail" size={15} />
                    Email guest
                  </a>
                  <a
                    href={`tel:${row.guest_phone}`}
                    className="inline-flex items-center gap-1.5 font-semibold text-lagoon hover:text-ink"
                  >
                    <Icon name="phone" size={15} />
                    {row.guest_phone}
                  </a>
                </div>
              </article>
            ))
          ))}
      </div>
    </div>
  )
}
