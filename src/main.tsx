import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import './index.css'
import { applyListingOverrides } from './data/listings'
import { fetchListingOverrides } from './lib/api'
import { registerServiceWorker } from './lib/pwa'

const container = document.getElementById('root')
if (!container) throw new Error('Root element #root was not found')

/**
 * Owners publish rates and copy through their dashboard; those edits live in the
 * API, not the bundle. They are applied before the first render so no page ever
 * flashes a stale rate. A slow or offline API falls back to the seed catalogue.
 */
async function loadOwnerEdits() {
  try {
    const overrides = await Promise.race([
      fetchListingOverrides(),
      new Promise<null>((resolve) => setTimeout(() => resolve(null), 2000)),
    ])
    if (overrides) applyListingOverrides(overrides)
  } catch {
    // Offline, or the API is not running: the catalogue is still usable.
  }
}

void loadOwnerEdits().then(() => {
  createRoot(container).render(
    <StrictMode>
      <App />
    </StrictMode>,
  )
  registerServiceWorker()
})
