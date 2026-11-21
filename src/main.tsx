import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import './index.css'
import { applyHostListings, applyListingOverrides } from './data/listings'
import { fetchCreatedListings, fetchListingOverrides } from './lib/api'
import { registerServiceWorker } from './lib/pwa'

const container = document.getElementById('root')
if (!container) throw new Error('Root element #root was not found')

const withTimeout = <T,>(promise: Promise<T>, ms: number) =>
  Promise.race([promise, new Promise<null>((resolve) => setTimeout(() => resolve(null), ms))])

/**
 * Owners publish rates, copy and photos through their dashboard; those edits and
 * any listings they created live in the API, not the bundle. They are applied
 * before the first render so no page ever flashes a stale rate or misses a stay.
 * A slow or offline API falls back to the seed catalogue.
 */
async function loadOwnerContent() {
  try {
    const result = await withTimeout(
      Promise.all([fetchListingOverrides(), fetchCreatedListings()]),
      2000,
    )
    if (!result) return
    const [overrides, created] = result
    applyListingOverrides(overrides)
    applyHostListings(created)
  } catch {
    // Offline, or the API is not running: the catalogue is still usable.
  }
}

void loadOwnerContent().then(() => {
  createRoot(container).render(
    <StrictMode>
      <App />
    </StrictMode>,
  )
  registerServiceWorker()
})
