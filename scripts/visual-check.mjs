/**
 * Visual + flow check for Isle BnB against the production build.
 *
 *   npm run preview          (in another shell)
 *   node scripts/visual-check.mjs
 *
 * Screenshots land in .shots/. Any console error fails the run.
 */
import { mkdir } from 'node:fs/promises'
import { spawn } from 'node:child_process'
import path from 'node:path'
import process from 'node:process'
import puppeteer from 'puppeteer-core'

const BASE = process.env.BASE_URL ?? 'http://localhost:4173'
const API = process.env.API_URL ?? 'http://localhost:8787'
const ADMIN_TOKEN = process.env.ADMIN_TOKEN ?? 'dev-admin-token'
const CHROME =
  process.env.CHROME_PATH ??
  'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe'
const SHOTS = path.resolve('.shots')

const consoleErrors = []

async function newPage(browser, { width, height, isMobile }) {
  const page = await browser.newPage()
  await page.setViewport({ width, height, isMobile, deviceScaleFactor: 1 })
  page.setDefaultTimeout(10000)
  page.setDefaultNavigationTimeout(20000)
  page.on('console', (message) => {
    if (message.type() === 'error') consoleErrors.push(message.text())
  })
  page.on('pageerror', (error) => consoleErrors.push(String(error)))
  return page
}

const shot = (page, name) => page.screenshot({ path: path.join(SHOTS, name) })

const setValue = (page, selector, value) =>
  page.evaluate(
    (sel, val) => {
      const el = document.querySelector(sel)
      if (!el) throw new Error(`missing ${sel}`)
      const proto =
        el.tagName === 'TEXTAREA'
          ? window.HTMLTextAreaElement.prototype
          : window.HTMLInputElement.prototype
      Object.getOwnPropertyDescriptor(proto, 'value').set.call(el, val)
      el.dispatchEvent(new Event('input', { bubbles: true }))
    },
    selector,
    value,
  )

const setSelect = (page, selector, value) =>
  page.evaluate(
    (sel, val) => {
      const el = document.querySelector(sel)
      if (!el) throw new Error(`missing ${sel}`)
      el.value = val
      el.dispatchEvent(new Event('change', { bubbles: true }))
    },
    selector,
    value,
  )

async function apiIsRunning() {
  try {
    const response = await fetch(`${API}/api/health`)
    return response.ok
  } catch {
    return false
  }
}

async function main() {
  await mkdir(SHOTS, { recursive: true })

  let apiProcess = null
  if (!(await apiIsRunning())) {
    apiProcess = spawn(process.execPath, ['server/index.mjs'], {
      env: { ...process.env, ADMIN_TOKEN },
      stdio: 'ignore',
    })
    for (let attempt = 0; attempt < 40; attempt += 1) {
      await new Promise((resolve) => setTimeout(resolve, 150))
      if (await apiIsRunning()) break
    }
    if (!(await apiIsRunning())) throw new Error('could not start the API')
    console.log('· started the API for this run')
  }

  const browser = await puppeteer.launch({
    executablePath: CHROME,
    headless: 'new',
    args: ['--hide-scrollbars'],
  })
  try {
    await runChecks(browser)
  } finally {
    await browser.close()
    if (apiProcess) apiProcess.kill()
  }
}

async function runChecks(browser) {
  const step = (name) => console.log(`· ${name}`)
  let bookingVerified = false
  const desktop = await newPage(browser, { width: 1440, height: 900 })

  step('home')

  await desktop.goto(`${BASE}/#/`, { waitUntil: 'networkidle2' })
  await shot(desktop, 'd-home.png')
  await shot(desktop, 'd-home-full.png')

  // The landing page is the hero only — sections now live on their own routes.
  const landing = await desktop.evaluate(() => ({
    mainHeight: document.querySelector('main')?.scrollHeight ?? 0,
    viewport: window.innerHeight,
    hasSections: Boolean(document.querySelector('#experiences, #how-it-works')),
  }))
  if (landing.hasSections) throw new Error('landing page still contains routed sections')
  if (landing.mainHeight > landing.viewport + 40) {
    throw new Error(`landing main is ${landing.mainHeight}px tall, expected hero only`)
  }

  // Nav links must actually navigate.
  step('nav')
  await desktop.click('header nav a[href="#/countries"]')
  await desktop.waitForSelector('text/Twenty-one nations. One ocean.', { timeout: 4000 })
  await shot(desktop, 'd-countries.png')

  await desktop.click('header nav a[href="#/experiences"]')
  await desktop.waitForSelector('text/Things the guidebooks miss', { timeout: 4000 })
  await shot(desktop, 'd-experiences.png')

  await desktop.click('header nav a[href="#/how-it-works"]')
  await desktop.waitForSelector('text/How booking works on Isle BnB', { timeout: 4000 })
  await shot(desktop, 'd-how.png')

  await desktop.click('header nav a[href="#/explore"]')
  await desktop.waitForSelector('text/Where are you headed?', { timeout: 4000 })
  await shot(desktop, 'd-explore.png')

  // Explore must be a region picker: three region cards, no country or stay cards.
  const explore = await desktop.evaluate(() => ({
    regions: [...document.querySelectorAll('main a[href*="#/explore/"]')].length,
    countries: document.querySelectorAll('main a[href*="#/countries/"]').length,
    listsStays: document.body.innerText.includes('Every stay in the Pacific'),
  }))
  if (explore.regions !== 3) {
    throw new Error(`explore shows ${explore.regions} region cards, expected 3`)
  }
  if (explore.countries > 0) throw new Error('explore still shows country cards')
  if (explore.listsStays) throw new Error('explore still lists individual stays')

  // Drilling into a region must reveal its countries.
  await desktop.click('main a[href="#/explore/melanesia"]')
  await desktop.waitForSelector('text/Melanesia', { timeout: 4000 })
  const regionCountries = await desktop.evaluate(
    () => document.querySelectorAll('main a[href*="#/countries/"]').length,
  )
  if (regionCountries < 3) {
    throw new Error(`Melanesia shows ${regionCountries} country cards, expected several`)
  }
  await shot(desktop, 'd-region.png')

  await desktop.goto(`${BASE}/#/stays`, { waitUntil: 'networkidle2' })
  await desktop.waitForSelector('text/Every stay in the Pacific', { timeout: 4000 })
  await shot(desktop, 'd-stays.png')

  // The destination filter is labelled "countries" everywhere now.
  const filterLabels = await desktop.evaluate(() => ({
    firstOption: document.querySelector('select')?.options[0]?.textContent ?? '',
    strayIslands: document.body.innerText.includes('All islands'),
  }))
  if (filterLabels.firstOption.trim() !== 'All countries') {
    throw new Error(`country filter reads "${filterLabels.firstOption}"`)
  }
  if (filterLabels.strayIslands) throw new Error('stays page still says "All islands"')


  await desktop.goto(`${BASE}/#/stays?country=SB`, { waitUntil: 'networkidle2' })
  await shot(desktop, 'd-stays-filtered.png')


  await desktop.goto(`${BASE}/#/countries/ws`, { waitUntil: 'networkidle2' })
  await shot(desktop, 'd-country.png')

  // Old island URLs should still land on the country page.
  await desktop.goto(`${BASE}/#/islands/ws`, { waitUntil: 'networkidle2' })
  await desktop.waitForSelector('text/Samoa', { timeout: 4000 })
  const redirected = await desktop.evaluate(() => window.location.hash)
  if (!redirected.includes('/countries/ws')) {
    throw new Error(`legacy /islands/ws did not redirect (${redirected})`)
  }

  await desktop.goto(`${BASE}/#/list-your-place`, { waitUntil: 'networkidle2' })
  await shot(desktop, 'd-host.png')


  // ---- booking flow -------------------------------------------------------
  step('booking')
  await desktop.goto(`${BASE}/#/stays`, { waitUntil: 'networkidle2' })
  const firstStay = await desktop.$$eval(
    'a[href*="#/stays/"]',
    (links) => links[0]?.getAttribute('href') ?? null,
  )

  if (!firstStay) {
    console.log('  no stays in the catalogue — skipping the booking flow')
  } else {
    await desktop.goto(`${BASE}/${firstStay.replace(/^\//, '')}`, {
      waitUntil: 'networkidle2',
    })
    await shot(desktop, 'd-listing.png')

    // Empty submit must surface validation, not a booking.
    await desktop.click('button[type="submit"]')
    await desktop.waitForSelector('text/Choose a check-in date', { timeout: 3000 })
    const afterInvalid = await desktop.evaluate(() => window.localStorage.length)
    if (afterInvalid !== 0) throw new Error('invalid booking was persisted')

    const nightlyRate = await desktop.$eval('[data-nightly-rate]', (el) =>
      Number(el.getAttribute('data-nightly-rate')),
    )
    const showsRateOnRequest = await desktop.evaluate(() =>
      document.body.innerText.includes('Rate on request'),
    )
    if (showsRateOnRequest !== (nightlyRate === 0)) {
      throw new Error(
        `rate-on-request state (${showsRateOnRequest}) does not match nightly rate ${nightlyRate}`,
      )
    }

    await setValue(desktop, '#checkIn', '2026-12-04')
    await setValue(desktop, '#checkOut', '2026-12-08')
    await setValue(desktop, '#guestName', 'Test Traveller')
    await setValue(desktop, '#guestEmail', 'test@example.com')
    await setValue(desktop, '#guestPhone', '+61 400 111 222')
    await setValue(desktop, '#notes', 'Arriving on the afternoon flight.')
    await shot(desktop, 'd-listing-filled.png')

    await desktop.click('button[type="submit"]')
    await desktop.waitForSelector('text/Booking request saved', { timeout: 5000 })
    await shot(desktop, 'd-booking-confirmed.png')

    // The booking must exist in the API database, not just in the browser.
    const reference = await desktop.evaluate(
      () => (document.body.innerText.match(/IB-[A-Z0-9]{6}/) ?? [null])[0],
    )
    if (!reference) throw new Error('no booking reference was shown')

    const lookup = await fetch(`${API}/api/bookings?refs=${reference}`).then((res) =>
      res.json(),
    )
    if (lookup.bookings.length !== 1) {
      throw new Error(`booking ${reference} was not stored on the server`)
    }
    const booking = lookup.bookings[0]
    if (booking.nights !== 4) throw new Error(`expected 4 nights, got ${booking.nights}`)
    const expectedTotal = booking.nights * nightlyRate
    if (booking.total !== expectedTotal) {
      throw new Error(`expected total ${expectedTotal}, got ${booking.total}`)
    }

    await desktop.goto(`${BASE}/#/bookings`, { waitUntil: 'networkidle2' })
    await desktop.waitForSelector('text/Awaiting host confirmation', { timeout: 6000 })
    await shot(desktop, 'd-bookings.png')
    bookingVerified = true
  }



  // ---- host application ---------------------------------------------------
  step('host')
  await desktop.goto(`${BASE}/#/list-your-place`, { waitUntil: 'networkidle2' })
  await setValue(desktop, '#propertyName', 'Test Lagoon Lodge')
  await setSelect(desktop, '#country', 'SB')
  await setValue(desktop, '#island', 'New Georgia')
  await setValue(desktop, '#area', 'Munda')
  await setValue(desktop, '#nightlyRate', '640')
  await setValue(
    desktop,
    '#description',
    'A small family lodge on the waterfront in Munda with four rooms, a shared kitchen and dive tanks on site.',
  )
  await setValue(desktop, '#contactName', 'Test Host')
  await setValue(desktop, '#email', 'host@example.com')
  await setValue(desktop, '#phone', '+677 12345')

  // Photos are part of the submission now; the team reviews them with it.
  const publicPhoto = await desktop.$('input[type="file"]')
  if (!publicPhoto) throw new Error('photo input missing on the application form')
  await publicPhoto.uploadFile(path.resolve('public/pics/hero-pavilion.webp'))
  await desktop.waitForFunction(
    () => {
      const img = document.querySelector('img[alt="Listing photo 1"]')
      return Boolean(img?.getAttribute('src')?.startsWith('/api/uploads/'))
    },
    { timeout: 20000 },
  )

  await desktop.click('form button[type="submit"]')
  await desktop.waitForSelector('text/Application received', { timeout: 8000 })
  await shot(desktop, 'd-host-confirmed.png')

  const hostReference = await desktop.evaluate(
    () => (document.body.innerText.match(/HOST-[A-Z0-9]{6}/) ?? [null])[0],
  )
  const adminList = await fetch(`${API}/api/admin/applications`, {
    headers: { 'x-admin-token': ADMIN_TOKEN },
  }).then((res) => res.json())
  const storedApplication = adminList.applications.find((row) => row.reference === hostReference)
  if (!storedApplication) {
    throw new Error(`application ${hostReference} was not stored on the server`)
  }
  if (JSON.parse(storedApplication.images ?? '[]').length !== 1) {
    throw new Error('the application photos were not saved with the submission')
  }

  // Approving is the publishing step: the listing goes live with those photos
  // and the owner gets an account to manage it.
  const approval = await fetch(`${API}/api/admin/applications/${hostReference}`, {
    method: 'PATCH',
    headers: { 'content-type': 'application/json', 'x-admin-token': ADMIN_TOKEN },
    body: JSON.stringify({ status: 'approved' }),
  }).then((res) => res.json())
  if (!approval.host?.email) throw new Error('approving an application created no host account')
  if (!approval.invitePath) throw new Error('approved applicant got no invitation link')
  if (!approval.listing) throw new Error('approval did not publish a listing')

  const catalogue = await fetch(`${API}/api/listings/created`).then((res) => res.json())
  const liveRow = catalogue.listings.find((row) => row.id === approval.listing.listingId)
  if (!liveRow) throw new Error('the approved listing is missing from the public catalogue')
  if (liveRow.images.length === 0) throw new Error('the approved listing has no photos')
  if (liveRow.name !== 'Test Lagoon Lodge') {
    throw new Error(`published listing is named "${liveRow.name}"`)
  }

  const applicantHosts = await fetch(`${API}/api/admin/hosts`, {
    headers: { 'x-admin-token': ADMIN_TOKEN },
  }).then((res) => res.json())
  const applicant = applicantHosts.hosts.find((row) => row.email === 'host@example.com')
  if (!applicant) throw new Error('approved applicant is missing from the host accounts list')

  // The published listing must appear on the public site after approval.
  await desktop.goto(`${BASE}/#/stays`, { waitUntil: 'networkidle2' })
  await desktop.reload({ waitUntil: 'networkidle2' })
  await desktop.waitForFunction(
    () => document.body.innerText.includes('Test Lagoon Lodge'),
    { timeout: 6000 },
  )

  await fetch(`${API}/api/admin/hosts/${applicant.id}`, {
    method: 'DELETE',
    headers: { 'x-admin-token': ADMIN_TOKEN },
  })



  // ---- claim flow ----------------------------------------------------------
  step('claim')
  let claimReference = null
  let claimedListingId = null
  let hostId = null
  if (firstStay) {
    await desktop.goto(`${BASE}/${firstStay.replace(/^\//, '')}`, {
      waitUntil: 'networkidle2',
    })
    claimedListingId = firstStay.replace(/^.*#\/stays\//, '')
    await desktop.click('main a[href*="#/claim/"]')
    await desktop.waitForSelector('text/Is this your property?', { timeout: 4000 })
    await shot(desktop, 'd-claim.png')

    await setValue(desktop, '#claimantName', 'Test Owner')
    await setValue(desktop, '#claimEmail', 'owner@example.com')
    await setValue(desktop, '#claimPhone', '+677 70000')
    await setValue(desktop, '#proofDetail', 'Call the front desk during office hours.')
    await desktop.click('form button[type="submit"]')
    await desktop.waitForSelector('text/Claim received', { timeout: 8000 })
    // The page smooth-scrolls to the top on success; let it land first.
    await new Promise((resolve) => setTimeout(resolve, 600))
    await shot(desktop, 'd-claim-confirmed.png')

    claimReference = await desktop.evaluate(
      () => (document.body.innerText.match(/CLAIM-[A-Z0-9]{6}/) ?? [null])[0],
    )
    if (!claimReference) throw new Error('no claim reference was shown')

    const storedClaims = await fetch(`${API}/api/admin/claims`, {
      headers: { 'x-admin-token': ADMIN_TOKEN },
    }).then((res) => res.json())
    const stored = storedClaims.claims.find((row) => row.reference === claimReference)
    if (!stored) throw new Error(`claim ${claimReference} was not stored on the server`)
    if (stored.listing_id !== claimedListingId) {
      throw new Error(`claim stored against ${stored.listing_id}, expected ${claimedListingId}`)
    }

    // ---- admin dashboard ---------------------------------------------------
    try {
      step('admin')
      await desktop.goto(`${BASE}/#/admin`, { waitUntil: 'networkidle2' })
      await desktop.waitForSelector('text/Team dashboard', { timeout: 4000 })
      await shot(desktop, 'd-admin-gate.png')

      await setValue(desktop, '#token', ADMIN_TOKEN)
      await desktop.click('form button[type="submit"]')
      await desktop.waitForSelector('text/Operations dashboard', { timeout: 6000 })

      // The new claim must be in the queue.
      await desktop.evaluate(() => {
        const tab = [...document.querySelectorAll('button')].find((button) =>
          button.textContent?.startsWith('Listing claims'),
        )
        if (!tab) throw new Error('claims tab missing')
        tab.click()
      })
      await desktop.waitForSelector(`text/${claimReference}`, { timeout: 4000 })
      // Let the tab's colour transition settle before the screenshot.
      await new Promise((resolve) => setTimeout(resolve, 400))
      await shot(desktop, 'd-admin-claims.png')

      // Verify it, which hands the listing over to the owner.
      await desktop.evaluate((reference) => {
        const card = [...document.querySelectorAll('article')].find((el) =>
          el.textContent?.includes(reference),
        )
        if (!card) throw new Error(`claim card ${reference} missing`)
        const button = [...card.querySelectorAll('button')].find(
          (el) => el.textContent?.trim() === 'Verify owner',
        )
        if (!button) throw new Error('verify button missing')
        button.click()
      }, claimReference)
      await desktop.waitForSelector('text/verified', { timeout: 6000 })

      const verified = await fetch(`${API}/api/claims/verified`).then((res) => res.json())
      if (!verified.listingIds.includes(claimedListingId)) {
        throw new Error(`listing ${claimedListingId} was not marked owner-managed`)
      }

      // Verifying must leave an invited account in the Host accounts tab.
      await desktop.evaluate(() => {
        const tab = [...document.querySelectorAll('button')].find((button) =>
          button.textContent?.startsWith('Host accounts'),
        )
        if (!tab) throw new Error('host accounts tab missing')
        tab.click()
      })
      await desktop.waitForSelector('text/Send a new invitation', { timeout: 4000 })
      await new Promise((resolve) => setTimeout(resolve, 400))
      await shot(desktop, 'd-admin-hosts.png')


      await desktop.goto(`${BASE}/${firstStay.replace(/^\//, '')}`, {
        waitUntil: 'networkidle2',
      })
      await desktop.waitForSelector('text/Managed by the owner', { timeout: 6000 })
      const claimLinkGone = await desktop.$('main a[href*="#/claim/"]')
      if (claimLinkGone) throw new Error('verified listing still offers "Claim this listing"')
      await shot(desktop, 'd-listing-managed.png')

      // ---- host onboarding -------------------------------------------------
      step('host')
      const hostList = await fetch(`${API}/api/admin/hosts`, {
        headers: { 'x-admin-token': ADMIN_TOKEN },
      }).then((res) => res.json())
      const hostAccount = hostList.hosts.find((row) => row.email === 'owner@example.com')
      if (!hostAccount) throw new Error('verifying the claim did not create a host account')
      hostId = hostAccount.id
      if (!hostAccount.listings.some((row) => row.listingId === claimedListingId)) {
        throw new Error('the new host account has no listing attached')
      }
      if (!hostAccount.inviteUrl) throw new Error('no invitation link was issued')

      // Follow the emailed link (rebuilt against this origin, not SITE_URL).
      const inviteToken = hostAccount.inviteUrl.split('token=')[1]
      await desktop.goto(`${BASE}/#/host/activate?token=${inviteToken}`, {
        waitUntil: 'networkidle2',
      })
      await desktop.waitForSelector('text/Set your password', { timeout: 4000 })
      await shot(desktop, 'd-host-activate.png')

      await setValue(desktop, '#hostName', 'Test Owner')
      await setValue(desktop, '#hostNewPassword', 'islandstay2026')
      await setValue(desktop, '#hostConfirm', 'islandstay2026')
      await desktop.click('form button[type="submit"]')
      await desktop.waitForSelector('text/Booking requests', { timeout: 8000 })
      await shot(desktop, 'd-host-dashboard.png')

      if (bookingVerified) {
        const seesBooking = await desktop.evaluate(() =>
          document.body.innerText.includes('Test Traveller'),
        )
        if (!seesBooking) throw new Error('host dashboard does not show the booking request')
      }

      // Publish a rate, then check a visitor sees it.
      await setValue(desktop, '#hostRate', '875')
      await desktop.click('form button[type="submit"]')
      await desktop.waitForSelector('text/Published — visitors see this', { timeout: 6000 })

      await desktop.goto(`${BASE}/${firstStay.replace(/^\//, '')}`, {
        waitUntil: 'networkidle2',
      })
      await desktop.waitForSelector('text/875', { timeout: 6000 })
      await shot(desktop, 'd-listing-owner-rate.png')

      // Answer the booking; the guest must see the property's answer.
      if (bookingVerified) {
        await desktop.goto(`${BASE}/#/host`, { waitUntil: 'networkidle2' })
        await desktop.waitForSelector('text/Booking requests', { timeout: 6000 })
        await desktop.evaluate(() => {
          const button = [...document.querySelectorAll('button')].find(
            (el) => el.textContent?.trim() === 'Confirm',
          )
          if (!button) throw new Error('confirm button missing on the host dashboard')
          button.click()
        })
        await desktop.waitForSelector('text/Confirmed', { timeout: 6000 })

        await desktop.goto(`${BASE}/#/bookings`, { waitUntil: 'networkidle2' })
        await desktop.waitForSelector('text/Confirmed by the property', { timeout: 6000 })
        await shot(desktop, 'd-bookings-confirmed.png')
      }

      // ---- owner creates their own listing ---------------------------------
      step('new listing')
      await desktop.goto(`${BASE}/#/host/new`, { waitUntil: 'networkidle2' })
      await desktop.waitForSelector('text/Tell travellers about your place', {
        timeout: 4000,
      })

      const listingName = 'Check Lagoon Bungalows'
      await setValue(desktop, '#newName', listingName)
      await setValue(desktop, '#newIsland', 'New Georgia')
      await setValue(desktop, '#newArea', 'Munda')
      await setValue(desktop, '#newPrice', '390')
      await setValue(desktop, '#newSummary', 'Two bungalows on the lagoon')
      await setValue(
        desktop,
        '#newDescription',
        'Two bungalows on the lagoon with a shared deck, breakfast included and a boat transfer from Munda town.',
      )
      await setSelect(desktop, '#newCountry', 'SB')

      const photoInput = await desktop.$('input[type="file"]')
      if (!photoInput) throw new Error('photo input missing on the new listing form')
      await photoInput.uploadFile(
        path.resolve('public/pics/hero-pavilion.webp'),
      )
      await desktop.waitForFunction(
        () => {
          const img = document.querySelector('img[alt="Listing photo 1"]')
          return Boolean(img?.getAttribute('src')?.startsWith('/api/uploads/'))
        },
        { timeout: 20000 },
      )

      // A second photo, so the preview and "make main" can be exercised.
      await photoInput.uploadFile(path.resolve('public/pics/bonfire-night.webp'))
      await desktop.waitForFunction(
        () => document.querySelectorAll('img[alt^="Listing photo"]').length === 2,
        { timeout: 20000 },
      )
      const orderBefore = await desktop.$$eval('img[alt^="Listing photo"]', (imgs) =>
        imgs.map((img) => img.getAttribute('src')),
      )

      await desktop.click('button[aria-label="Preview photo 2"]')
      await desktop.waitForSelector('[role="dialog"]', { timeout: 4000 })
      await shot(desktop, 'd-photo-preview.png')
      await desktop.evaluate(() => {
        const button = [...document.querySelectorAll('[role="dialog"] button')].find((el) =>
          el.textContent?.includes('Use as the main photo'),
        )
        if (!button) throw new Error('preview has no "use as main" action')
        button.click()
      })
      await new Promise((resolve) => setTimeout(resolve, 400))
      const orderAfter = await desktop.$$eval('img[alt^="Listing photo"]', (imgs) =>
        imgs.map((img) => img.getAttribute('src')),
      )
      if (orderAfter[0] !== orderBefore[1] || orderAfter[1] !== orderBefore[0]) {
        throw new Error('choosing a main photo did not reorder the gallery')
      }
      await desktop.keyboard.press('Escape')
      await new Promise((resolve) => setTimeout(resolve, 300))
      if (await desktop.$('[role="dialog"]')) {
        throw new Error('the photo preview did not close on Escape')
      }
      await shot(desktop, 'd-host-new.png')

      await desktop.click('form button[type="submit"]')
      await desktop.waitForSelector('text/is with our team', { timeout: 10000 })
      await shot(desktop, 'd-host-new-submitted.png')

      const submitted = await fetch(`${API}/api/listings/created`).then((res) => res.json())
      if (submitted.listings.some((row) => row.name === listingName)) {
        throw new Error('an unapproved listing was published to the catalogue')
      }

      // The team reviews it before it appears anywhere public.
      await desktop.goto(`${BASE}/#/admin`, { waitUntil: 'networkidle2' })
      await desktop.waitForSelector('text/Operations dashboard', { timeout: 6000 })
      await desktop.evaluate(() => {
        const tab = [...document.querySelectorAll('button')].find((button) =>
          button.textContent?.startsWith('Listing reviews'),
        )
        if (!tab) throw new Error('listing reviews tab missing')
        tab.click()
      })
      await desktop.waitForSelector(`text/${listingName}`, { timeout: 5000 })
      await shot(desktop, 'd-admin-listings.png')

      await desktop.evaluate((name) => {
        const card = [...document.querySelectorAll('article')].find((el) =>
          el.textContent?.includes(name),
        )
        if (!card) throw new Error(`review card for ${name} missing`)
        const button = [...card.querySelectorAll('button')].find(
          (el) => el.textContent?.trim() === 'Approve and publish',
        )
        if (!button) throw new Error('approve button missing')
        button.click()
      }, listingName)
      await desktop.waitForFunction(
        (name) =>
          [...document.querySelectorAll('article[data-status="live"]')].some((el) =>
            el.textContent?.includes(name),
          ),
        { timeout: 8000 },
        listingName,
      )

      const published = await fetch(`${API}/api/listings/created`).then((res) => res.json())
      const publishedRow = published.listings.find((row) => row.name === listingName)
      if (!publishedRow) throw new Error('approved listing is missing from the catalogue')

      // It must be findable and openable as a normal stay on a fresh visit.
      await desktop.goto(`${BASE}/#/stays`, { waitUntil: 'networkidle2' })
      await desktop.reload({ waitUntil: 'networkidle2' })
      await desktop.waitForFunction(
        (name) => document.body.innerText.includes(name),
        { timeout: 6000 },
        listingName,
      )

      await desktop.goto(`${BASE}/#/stays/${publishedRow.id}`, {
        waitUntil: 'networkidle2',
      })
      await desktop.waitForSelector('text/Check Lagoon Bungalows', { timeout: 6000 })
      await desktop.waitForSelector('text/SBD 390', { timeout: 6000 })
      await shot(desktop, 'd-listing-host-created.png')

      // Sign the test host out before the account is deleted, so the mobile pass
      // does not fire a dashboard request with a dead token.
      await desktop.evaluate(() => window.localStorage.removeItem('islebnb.hosttoken.v1'))
    } finally {
      // Never leave the catalogue claiming a real property after a failed run.
      await fetch(`${API}/api/admin/claims/${encodeURIComponent(claimReference)}`, {
        method: 'DELETE',
        headers: { 'x-admin-token': ADMIN_TOKEN },
      }).catch(() => {})
      if (hostId) {
        await fetch(`${API}/api/admin/hosts/${hostId}`, {
          method: 'DELETE',
          headers: { 'x-admin-token': ADMIN_TOKEN },
        }).catch(() => {})
      }
    }

    const leftovers = await fetch(`${API}/api/claims/verified`).then((res) => res.json())
    if (leftovers.listingIds.includes(claimedListingId)) {
      throw new Error(`test claim ${claimReference} was not removed`)
    }
    const published = await fetch(`${API}/api/listings/overrides`).then((res) => res.json())
    if (published.overrides.some((row) => row.listingId === claimedListingId)) {
      throw new Error('the test rate was left published on a real listing')
    }
    const afterCleanup = await fetch(`${API}/api/listings/created`).then((res) => res.json())
    if (afterCleanup.listings.some((row) => row.name === 'Check Lagoon Bungalows')) {
      throw new Error('the approved test listing was not removed with its account')
    }
  } else {
    console.log('  no stays in the catalogue — skipping the claim and admin checks')
  }

  // ---- mobile -------------------------------------------------------------
  step('mobile')
  const mobile = await newPage(browser, {
    width: 390,
    height: 844,
    isMobile: true,
  })
  await mobile.goto(`${BASE}/#/`, { waitUntil: 'networkidle2' })
  await shot(mobile, 'm-home.png')

  const overflow = await mobile.evaluate(
    () => document.documentElement.scrollWidth - window.innerWidth,
  )
  if (overflow > 1) throw new Error(`mobile layout overflows by ${overflow}px`)

  await mobile.click('button[aria-label="Open menu"]')
  await shot(mobile, 'm-menu.png')
  await mobile.click('button[aria-label="Close menu"]')

  if (firstStay) {
    await mobile.goto(`${BASE}/${firstStay.replace(/^\//, '')}`, {
      waitUntil: 'networkidle2',
    })
    await shot(mobile, 'm-listing.png')
  }

  await mobile.goto(`${BASE}/#/stays`, { waitUntil: 'networkidle2' })
  await shot(mobile, 'm-explore.png')

  await mobile.goto(`${BASE}/#/list-your-place`, { waitUntil: 'networkidle2' })
  await shot(mobile, 'm-host.png')

  if (claimedListingId) {
    await mobile.goto(`${BASE}/#/claim/${claimedListingId}`, { waitUntil: 'networkidle2' })
    await shot(mobile, 'm-claim.png')
    const claimOverflow = await mobile.evaluate(
      () => document.documentElement.scrollWidth - window.innerWidth,
    )
    if (claimOverflow > 1) {
      throw new Error(`claim page overflows mobile by ${claimOverflow}px`)
    }
  }

  await mobile.goto(`${BASE}/#/admin`, { waitUntil: 'networkidle2' })
  await shot(mobile, 'm-admin.png')

  await mobile.goto(`${BASE}/#/host/login`, { waitUntil: 'networkidle2' })
  await shot(mobile, 'm-host-login.png')


  await mobile.goto(`${BASE}/#/bookings`, { waitUntil: 'networkidle2' })
  await shot(mobile, 'm-bookings.png')

  if (consoleErrors.length) {
    console.error('Console errors:\n' + consoleErrors.join('\n'))
    process.exitCode = 1
  } else {
    console.log(
      bookingVerified
        ? 'OK — screenshots in .shots/, booking + host + claim + host dashboard flows verified, no console errors'
        : 'OK — screenshots in .shots/, host flow verified (empty catalogue, booking skipped), no console errors',
    )
  }
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
  // Never leave a headless Chrome running behind a failed assertion.
  setTimeout(() => process.exit(1), 500).unref()
})
