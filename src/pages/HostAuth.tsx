import { useState } from 'react'
import { Link, Navigate, useNavigate, useSearchParams } from 'react-router-dom'
import { Icon } from '../components/Icons'
import { activateHost, loginHost } from '../lib/api'
import { getHostToken, setHostToken } from '../lib/hostSession'
import { usePageTitle } from '../lib/usePageTitle'
import { cn } from '../lib/utils'

function Shell({
  title,
  lead,
  children,
}: {
  title: string
  lead: string
  children: React.ReactNode
}) {
  return (
    <div className="section max-w-lg pt-16">
      <div className="card p-8">
        <span className="grid h-12 w-12 place-items-center rounded-2xl bg-deep text-sand">
          <Icon name="shield" size={22} />
        </span>
        <h1 className="mt-5 font-display text-2xl font-semibold text-ink">{title}</h1>
        <p className="mt-2 text-sm leading-relaxed text-ink/60">{lead}</p>
        {children}
      </div>
    </div>
  )
}

export function HostLoginPage() {
  usePageTitle('Host sign in · Isle BnB')
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [sending, setSending] = useState(false)

  if (getHostToken()) return <Navigate to="/host" replace />

  const submit = async (event: React.FormEvent) => {
    event.preventDefault()
    setSending(true)
    setError('')
    try {
      const session = await loginHost(email.trim(), password)
      setHostToken(session.token)
      navigate('/host', { replace: true })
    } catch (loginError) {
      setError(loginError instanceof Error ? loginError.message : 'Could not sign in.')
    } finally {
      setSending(false)
    }
  }

  return (
    <Shell
      title="Host sign in"
      lead="For owners and managers of a property that has been verified on Isle BnB."
    >
      <form onSubmit={submit} className="mt-6 space-y-4">
        <div>
          <label htmlFor="hostEmail" className="field-label">
            Email
          </label>
          <input
            id="hostEmail"
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            autoComplete="email"
            className="field"
            required
          />
        </div>
        <div>
          <label htmlFor="hostPassword" className="field-label">
            Password
          </label>
          <input
            id="hostPassword"
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            autoComplete="current-password"
            className="field"
            required
          />
        </div>
        {error && (
          <p className="rounded-2xl bg-coral/10 px-4 py-3 text-sm font-semibold text-coral">
            {error}
          </p>
        )}
        <button type="submit" disabled={sending} className="btn-primary w-full justify-center">
          {sending ? 'Signing in…' : 'Sign in'}
          <Icon name="arrowRight" size={16} />
        </button>
      </form>

      <p className="mt-5 text-xs leading-relaxed text-ink/45">
        No password yet? Use the invitation link we emailed when we verified your
        property. Lost it? Write to{' '}
        <a href="mailto:hosts@islebnb.com" className="font-semibold text-lagoon">
          hosts@islebnb.com
        </a>{' '}
        and we will send a new one.
      </p>
      <p className="mt-4 text-xs text-ink/45">
        Not listed yet?{' '}
        <Link to="/list-your-place" className="font-semibold text-lagoon">
          Apply to list your place
        </Link>
        .
      </p>
    </Shell>
  )
}

export function HostActivatePage() {
  usePageTitle('Set your host password · Isle BnB')
  const [params] = useSearchParams()
  const token = params.get('token') ?? ''
  const navigate = useNavigate()
  const [form, setForm] = useState({ name: '', password: '', confirm: '' })
  const [fields, setFields] = useState<Record<string, string>>({})
  const [error, setError] = useState('')
  const [sending, setSending] = useState(false)

  const set = (key: 'name' | 'password' | 'confirm', value: string) => {
    setForm((current) => ({ ...current, [key]: value }))
    setFields((current) => ({ ...current, [key]: '' }))
  }

  if (!token) {
    return (
      <Shell
        title="Invitation needed"
        lead="This page needs the invitation link we emailed you. Open that link again, or ask us to send a new one."
      >
        <Link to="/host/login" className="btn-outline mt-6 inline-flex">
          Go to host sign in
        </Link>
      </Shell>
    )
  }

  const submit = async (event: React.FormEvent) => {
    event.preventDefault()
    const next: Record<string, string> = {}
    if (!form.name.trim()) next.name = 'Tell us your name'
    if (form.password.length < 8) next.password = 'Use at least 8 characters'
    if (form.password !== form.confirm) next.confirm = 'The two passwords do not match'
    setFields(next)
    if (Object.keys(next).length) return

    setSending(true)
    setError('')
    try {
      const session = await activateHost(token, form.name.trim(), form.password)
      setHostToken(session.token)
      navigate('/host', { replace: true })
    } catch (activateError) {
      setError(
        activateError instanceof Error ? activateError.message : 'Could not set up the account.',
      )
    } finally {
      setSending(false)
    }
  }

  return (
    <Shell
      title="Set your password"
      lead="Your property has been verified. Choose a password and you can publish your rate and see booking requests."
    >
      <form onSubmit={submit} className="mt-6 space-y-4" noValidate>
        <div>
          <label htmlFor="hostName" className="field-label">
            Your name
          </label>
          <input
            id="hostName"
            value={form.name}
            onChange={(event) => set('name', event.target.value)}
            autoComplete="name"
            className={cn('field', fields.name && 'border-coral')}
            aria-invalid={Boolean(fields.name)}
          />
          {fields.name && (
            <p className="mt-1 text-xs font-semibold text-coral">{fields.name}</p>
          )}
        </div>
        <div>
          <label htmlFor="hostNewPassword" className="field-label">
            Password
          </label>
          <input
            id="hostNewPassword"
            type="password"
            value={form.password}
            onChange={(event) => set('password', event.target.value)}
            autoComplete="new-password"
            className={cn('field', fields.password && 'border-coral')}
            aria-invalid={Boolean(fields.password)}
          />
          {fields.password ? (
            <p className="mt-1 text-xs font-semibold text-coral">{fields.password}</p>
          ) : (
            <p className="mt-1 text-xs text-ink/40">At least 8 characters.</p>
          )}
        </div>
        <div>
          <label htmlFor="hostConfirm" className="field-label">
            Password again
          </label>
          <input
            id="hostConfirm"
            type="password"
            value={form.confirm}
            onChange={(event) => set('confirm', event.target.value)}
            autoComplete="new-password"
            className={cn('field', fields.confirm && 'border-coral')}
            aria-invalid={Boolean(fields.confirm)}
          />
          {fields.confirm && (
            <p className="mt-1 text-xs font-semibold text-coral">{fields.confirm}</p>
          )}
        </div>
        {error && (
          <p className="rounded-2xl bg-coral/10 px-4 py-3 text-sm font-semibold text-coral">
            {error}
          </p>
        )}
        <button type="submit" disabled={sending} className="btn-primary w-full justify-center">
          {sending ? 'Setting up…' : 'Create my account'}
          <Icon name="arrowRight" size={16} />
        </button>
      </form>
      <p className="mt-5 text-xs leading-relaxed text-ink/45">
        This link works once. After this you sign in with your email and password.
      </p>
    </Shell>
  )
}
