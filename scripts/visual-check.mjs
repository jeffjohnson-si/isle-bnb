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
  await desktop.click('form button[type="submit"]')
  await desktop.waitForSelector('text/Application received', { timeout: 8000 })
  await shot(desktop, 'd-host-confirmed.png')

  const hostReference = await desktop.evaluate(
    () => (document.body.innerText.match(/HOST-[A-Z0-9]{6}/) ?? [null])[0],
  )
  const adminList = await fetch(`${API}/api/admin/applications`, {
    headers: { 'x-admin-token': ADMIN_TOKEN },
  }).then((res) => res.json())
  if (!adminList.applications.some((row) => row.reference === hostReference)) {
    throw new Error(`application ${hostReference} was not stored on the server`)
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

  await mobile.goto(`${BASE}/#/bookings`, { waitUntil: 'networkidle2' })
  await shot(mobile, 'm-bookings.png')

  if (consoleErrors.length) {
    console.error('Console errors:\n' + consoleErrors.join('\n'))
    process.exitCode = 1
  } else {
    console.log(
      bookingVerified
        ? 'OK — screenshots in .shots/, booking + host flows verified, no console errors'
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
