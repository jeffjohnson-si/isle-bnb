import { useEffect, useState } from 'react'
import { Link, NavLink, useLocation } from 'react-router-dom'
import { Icon, IsleMark } from './Icons'
import { cn } from '../lib/utils'
import { useInstallPrompt } from '../lib/pwa'

const navLinks = [
  { to: '/explore', label: 'Explore' },
  { to: '/countries', label: 'Countries' },
  { to: '/experiences', label: 'Experiences' },
  { to: '/how-it-works', label: 'How it works' },
]

export function Header() {
  const [scrolled, setScrolled] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const { pathname } = useLocation()
  const { canInstall, install } = useInstallPrompt()

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  useEffect(() => {
    setMenuOpen(false)
  }, [pathname])

  useEffect(() => {
    document.body.style.overflow = menuOpen ? 'hidden' : ''
    return () => {
      document.body.style.overflow = ''
    }
  }, [menuOpen])

  return (
    <>
      <header
        className={cn(
          'fixed inset-x-0 top-0 z-50 transition-all duration-300',
          scrolled || menuOpen
            ? 'border-b border-ink/10 bg-sand/90 backdrop-blur-md'
            : 'bg-gradient-to-b from-sand/95 to-sand/0',
        )}
      >
        <div className="section flex h-[68px] items-center justify-between gap-4">
          <Link to="/" className="flex items-center gap-2.5" aria-label="Isle BnB home">
            <IsleMark className="h-9 w-9 text-deep" />
            <span className="font-display text-[1.35rem] font-semibold leading-none tracking-tight">
              isle<span className="text-coral">bnb</span>
            </span>
          </Link>

          <nav className="hidden items-center gap-1 md:flex" aria-label="Main">
            {navLinks.map((link) => (
              <NavLink
                key={link.to}
                to={link.to}
                className={({ isActive }) =>
                  cn(
                    'rounded-full px-3.5 py-2 text-sm font-medium transition',
                    isActive
                      ? 'bg-white text-ink shadow-card'
                      : 'text-ink/70 hover:bg-ink/5 hover:text-ink',
                  )
                }
              >
                {link.label}
              </NavLink>
            ))}
          </nav>

          <div className="flex items-center gap-2">
            {canInstall && (
              <button
                type="button"
                onClick={() => void install()}
                className="hidden items-center gap-1.5 rounded-full border border-ink/15 px-3.5 py-2 text-sm font-semibold text-deep transition hover:border-ink/35 lg:inline-flex"
              >
                <Icon name="download" size={16} />
                Install app
              </button>
            )}
            <Link
              to="/bookings"
              className="hidden items-center gap-1.5 rounded-full px-3 py-2 text-sm font-semibold text-ink/75 transition hover:bg-ink/5 hover:text-ink sm:inline-flex"
            >
              <Icon name="calendar" size={17} />
              My bookings
            </Link>
            <Link to="/list-your-place" className="btn-primary hidden sm:inline-flex">
              List your place
            </Link>
            <button
              type="button"
              onClick={() => setMenuOpen((open) => !open)}
              className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-ink/15 text-ink md:hidden"
              aria-expanded={menuOpen}
              aria-label={menuOpen ? 'Close menu' : 'Open menu'}
            >
              <Icon name={menuOpen ? 'close' : 'menu'} size={22} />
            </button>
          </div>
        </div>
      </header>

      {menuOpen && (
        <div className="fixed inset-0 top-[68px] z-40 overflow-y-auto bg-sand px-5 pb-10 pt-4 md:hidden">
          <nav className="flex flex-col gap-1" aria-label="Mobile">
            {navLinks.map((link) => (
              <Link
                key={link.to}
                to={link.to}
                className="rounded-2xl px-4 py-3.5 text-lg font-semibold text-ink hover:bg-white"
              >
                {link.label}
              </Link>
            ))}
            <Link
              to="/bookings"
              className="rounded-2xl px-4 py-3.5 text-lg font-semibold text-ink hover:bg-white"
            >
              My bookings
            </Link>
            <Link
              to="/saved"
              className="rounded-2xl px-4 py-3.5 text-lg font-semibold text-ink hover:bg-white"
            >
              Saved stays
            </Link>
          </nav>
          <div className="mt-6 flex flex-col gap-3">
            <Link to="/list-your-place" className="btn-primary w-full">
              List your place
            </Link>
            {canInstall && (
              <button
                type="button"
                onClick={() => void install()}
                className="btn-outline w-full"
              >
                <Icon name="download" size={18} />
                Install Isle BnB
              </button>
            )}
          </div>
          <p className="mt-8 text-sm leading-relaxed text-ink/55">
            Pay on arrival. No card needed to book — a first for the Pacific.
          </p>
        </div>
      )}
    </>
  )
}
