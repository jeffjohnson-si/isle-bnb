import { useEffect, useState } from 'react'
import {
  HashRouter,
  Navigate,
  Route,
  Routes,
  useLocation,
  useParams,
} from 'react-router-dom'
import { Header } from './components/Header'
import { Footer } from './components/Footer'
import { Icon } from './components/Icons'
import { HomePage } from './pages/Home'
import { ExplorePage } from './pages/Explore'
import { StaysPage } from './pages/Stays'
import { RegionPage } from './pages/Region'
import { CountriesPage } from './pages/Countries'
import { CountryPage } from './pages/Country'
import { ExperiencesPage } from './pages/Experiences'
import { ListingPage } from './pages/Listing'
import { BookingsPage } from './pages/Bookings'
import { SavedPage } from './pages/Saved'
import { ListPropertyPage } from './pages/ListProperty'
import { HowItWorksPage } from './pages/HowItWorks'
import { ClaimPage } from './pages/Claim'
import { AdminPage } from './pages/Admin'
import { NotFoundPage } from './pages/NotFound'

/** /islands/:code was the old URL — keep it working. */
function IslandRedirect() {
  const { code = '' } = useParams()
  return <Navigate to={`/countries/${code}`} replace />
}

function ScrollToTop() {
  const { pathname } = useLocation()
  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'auto' })
  }, [pathname])
  return null
}

function OfflineNotice() {
  const [offline, setOffline] = useState(
    typeof navigator !== 'undefined' ? !navigator.onLine : false,
  )

  useEffect(() => {
    const online = () => setOffline(false)
    const down = () => setOffline(true)
    window.addEventListener('online', online)
    window.addEventListener('offline', down)
    return () => {
      window.removeEventListener('online', online)
      window.removeEventListener('offline', down)
    }
  }, [])

  if (!offline) return null

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-4 z-50 flex justify-center px-4">
      <p className="safe-bottom inline-flex items-center gap-2 rounded-full bg-ink/95 px-4 py-2.5 text-xs font-semibold text-sand shadow-lift">
        <Icon name="wifi" size={15} className="text-sun" />
        You are offline — saved pages still work
      </p>
    </div>
  )
}

export default function App() {
  return (
    <HashRouter>
      <ScrollToTop />
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-[60] focus:rounded-full focus:bg-white focus:px-4 focus:py-2 focus:text-sm focus:font-semibold"
      >
        Skip to content
      </a>
      <div className="flex min-h-screen flex-col">
        <Header />
        <main id="main" className="flex-1 pt-[68px]">
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/explore" element={<ExplorePage />} />
            <Route path="/explore/:region" element={<RegionPage />} />
            <Route path="/stays" element={<StaysPage />} />
            <Route path="/countries" element={<CountriesPage />} />
            <Route path="/countries/:code" element={<CountryPage />} />
            <Route path="/islands/:code" element={<IslandRedirect />} />
            <Route path="/experiences" element={<ExperiencesPage />} />
            <Route path="/stays/:id" element={<ListingPage />} />
            <Route path="/bookings" element={<BookingsPage />} />
            <Route path="/saved" element={<SavedPage />} />
            <Route path="/list-your-place" element={<ListPropertyPage />} />
            <Route path="/claim/:id" element={<ClaimPage />} />
            <Route path="/admin" element={<AdminPage />} />
            <Route path="/how-it-works" element={<HowItWorksPage />} />
            <Route path="*" element={<NotFoundPage />} />
          </Routes>
        </main>
        <Footer />
      </div>
      <OfflineNotice />
    </HashRouter>
  )
}
