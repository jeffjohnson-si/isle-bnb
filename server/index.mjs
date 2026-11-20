/**
 * Isle BnB API — dependency-free Node service (node:http + node:sqlite).
 *
 *   npm run api          # http://localhost:8787
 *
 * Endpoints
 *   GET    /api/health
 *   POST   /api/bookings                     create a booking request
 *   GET    /api/bookings?refs=IB-A,IB-B      look up this device's requests
 *   DELETE /api/bookings/:reference          cancel a request
 *   POST   /api/applications                 create a host application
 *   GET    /api/admin/bookings               (x-admin-token)
 *   GET    /api/admin/applications           (x-admin-token)
 *   PATCH  /api/admin/applications/:reference (x-admin-token)
 */
import { createServer } from 'node:http'
import { randomInt } from 'node:crypto'
import {
  cancelBooking,
  getBooking,
  getBookingsByReferences,
  insertApplication,
  insertBooking,
  listApplications,
  listBookings,
  updateApplicationStatus,
} from './db.mjs'

const PORT = Number(process.env.PORT ?? 8787)
const ADMIN_TOKEN = process.env.ADMIN_TOKEN ?? 'dev-admin-token'
const ALLOWED_ORIGIN = process.env.ALLOWED_ORIGIN ?? ''

const BODY_LIMIT = 64 * 1024
const REFERENCE_ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'

const makeReference = (prefix) => {
  let code = ''
  for (let i = 0; i < 6; i += 1) {
    code += REFERENCE_ALPHABET[randomInt(REFERENCE_ALPHABET.length)]
  }
  return `${prefix}-${code}`
}

/** Crude per-IP write throttle: 20 writes per hour per address. */
const writes = new Map()
const WRITE_LIMIT = 20
const WRITE_WINDOW = 60 * 60 * 1000

function allowWrite(ip) {
  const now = Date.now()
  const entry = writes.get(ip) ?? { count: 0, since: now }
  if (now - entry.since > WRITE_WINDOW) {
    entry.count = 0
    entry.since = now
  }
  entry.count += 1
  writes.set(ip, entry)
  return entry.count <= WRITE_LIMIT
}

function corsHeaders(request) {
  const origin = request.headers.origin
  if (!origin) return {}
  const localhost = /^http:\/\/localhost(:\d+)?$/.test(origin)
  const allowed =
    localhost || (ALLOWED_ORIGIN && origin === ALLOWED_ORIGIN)
  if (!allowed) return {}
  return {
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Headers': 'content-type, x-admin-token',
    'Access-Control-Allow-Methods': 'GET, POST, DELETE, PATCH, OPTIONS',
    Vary: 'Origin',
  }
}

const json = (response, status, payload, extra = {}) => {
  const body = JSON.stringify(payload)
  response.writeHead(status, {
    'content-type': 'application/json; charset=utf-8',
    'content-length': Buffer.byteLength(body),
    'cache-control': 'no-store',
    ...extra,
  })
  response.end(body)
}

async function readBody(request) {
  const chunks = []
  let size = 0
  for await (const chunk of request) {
    size += chunk.length
    if (size > BODY_LIMIT) throw new Error('Request body too large')
    chunks.push(chunk)
  }
  if (!chunks.length) return {}
  return JSON.parse(Buffer.concat(chunks).toString('utf8'))
}

const text = (value) => (typeof value === 'string' ? value.trim() : '')
const isEmail = (value) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(value)
const isIsoDate = (value) => /^\d{4}-\d{2}-\d{2}$/.test(value)

function validateBooking(input) {
  const fields = {}
  const listingId = text(input.listingId)
  const listingName = text(input.listingName)
  const country = text(input.country)
  const island = text(input.island)
  const checkIn = text(input.checkIn)
  const checkOut = text(input.checkOut)
  const guests = Number(input.guests)
  const total = Number(input.total)
  const currency = text(input.currency)
  const guestName = text(input.guestName)
  const guestEmail = text(input.guestEmail)
  const guestPhone = text(input.guestPhone)

  if (!listingId) fields.listingId = 'Missing listing'
  if (!listingName) fields.listingName = 'Missing listing name'
  if (!country) fields.country = 'Missing country'
  if (!island) fields.island = 'Missing island'
  if (!isIsoDate(checkIn)) fields.checkIn = 'Invalid check-in date'
  if (!isIsoDate(checkOut)) fields.checkOut = 'Invalid check-out date'
  if (isIsoDate(checkIn) && isIsoDate(checkOut) && checkOut <= checkIn) {
    fields.checkOut = 'Check-out must be after check-in'
  }
  if (!Number.isInteger(guests) || guests < 1 || guests > 20) {
    fields.guests = 'Guests must be between 1 and 20'
  }
  if (!Number.isFinite(total) || total < 0) fields.total = 'Invalid total'
  if (!/^[A-Z]{3}$/.test(currency)) fields.currency = 'Invalid currency'
  if (!guestName) fields.guestName = 'Missing guest name'
  if (!isEmail(guestEmail)) fields.guestEmail = 'Invalid email'
  if (guestPhone.replace(/[^\d]/g, '').length < 6) {
    fields.guestPhone = 'Invalid phone number'
  }

  if (Object.keys(fields).length) return { fields }

  const nights = Math.round(
    (new Date(`${checkOut}T00:00:00Z`) - new Date(`${checkIn}T00:00:00Z`)) / 86_400_000,
  )

  return {
    record: {
      reference: makeReference('IB'),
      listing_id: listingId,
      listing_name: listingName,
      country,
      island,
      region: text(input.region) || null,
      check_in: checkIn,
      check_out: checkOut,
      guests,
      nights,
      guest_name: guestName,
      guest_email: guestEmail,
      guest_phone: guestPhone,
      notes: text(input.notes) || null,
      total: Math.round(total),
      currency,
      status: 'pending',
      created_at: new Date().toISOString(),
    },
  }
}

function validateApplication(input) {
  const fields = {}
  const propertyName = text(input.propertyName)
  const type = text(input.type)
  const country = text(input.country)
  const island = text(input.island)
  const area = text(input.area)
  const nightlyRate = Number(input.nightlyRate)
  const currency = text(input.currency)
  const guests = Number(input.guests)
  const bedrooms = Number(input.bedrooms)
  const description = text(input.description)
  const contactName = text(input.contactName)
  const email = text(input.email)
  const phone = text(input.phone)

  if (!propertyName) fields.propertyName = 'Missing property name'
  if (!type) fields.type = 'Missing property type'
  if (!country) fields.country = 'Missing country'
  if (!island) fields.island = 'Missing island'
  if (!area) fields.area = 'Missing area'
  if (!Number.isFinite(nightlyRate) || nightlyRate <= 0) fields.nightlyRate = 'Invalid rate'
  if (!/^[A-Z]{3}$/.test(currency)) fields.currency = 'Invalid currency'
  if (!Number.isInteger(guests) || guests < 1) fields.guests = 'Invalid guest count'
  if (!Number.isInteger(bedrooms) || bedrooms < 1) fields.bedrooms = 'Invalid bedrooms'
  if (description.length < 40) fields.description = 'Description too short'
  if (!contactName) fields.contactName = 'Missing contact name'
  if (!isEmail(email)) fields.email = 'Invalid email'
  if (phone.replace(/[^\d]/g, '').length < 6) fields.phone = 'Invalid phone number'

  if (Object.keys(fields).length) return { fields }

  return {
    record: {
      reference: makeReference('HOST'),
      property_name: propertyName,
      type,
      country,
      island,
      area,
      address: text(input.address) || null,
      nightly_rate: Math.round(nightlyRate),
      currency,
      guests,
      bedrooms,
      description,
      amenities: JSON.stringify(Array.isArray(input.amenities) ? input.amenities : []),
      contact_name: contactName,
      email,
      phone,
      status: 'pending',
      created_at: new Date().toISOString(),
    },
  }
}

const server = createServer(async (request, response) => {
  const url = new URL(request.url ?? '/', `http://${request.headers.host}`)
  const cors = corsHeaders(request)

  if (request.method === 'OPTIONS') {
    response.writeHead(204, cors)
    response.end()
    return
  }

  const ip =
    request.socket.remoteAddress ??
    request.headers['x-forwarded-for']?.toString() ??
    'unknown'

  const isAdmin = request.headers['x-admin-token'] === ADMIN_TOKEN

  try {
    if (request.method === 'GET' && url.pathname === '/api/health') {
      return json(response, 200, { ok: true }, cors)
    }

    if (request.method === 'POST' && url.pathname === '/api/bookings') {
      if (!allowWrite(ip)) {
        return json(response, 429, { error: 'Too many requests, try again later' }, cors)
      }
      const body = await readBody(request)
      const { fields, record } = validateBooking(body)
      if (fields) {
        return json(response, 400, { error: 'Invalid booking', fields }, cors)
      }
      const saved = insertBooking(record)
      console.log(`booking ${saved.reference} — ${saved.listing_name} (${saved.check_in} → ${saved.check_out})`)
      return json(response, 201, { booking: saved }, cors)
    }

    if (request.method === 'GET' && url.pathname === '/api/bookings') {
      const refs = (url.searchParams.get('refs') ?? '')
        .split(',')
        .map((value) => value.trim().toUpperCase())
        .filter(Boolean)
        .slice(0, 50)
      return json(response, 200, { bookings: getBookingsByReferences(refs) }, cors)
    }

    if (request.method === 'DELETE' && url.pathname.startsWith('/api/bookings/')) {
      const reference = decodeURIComponent(url.pathname.split('/').pop() ?? '')
      if (!getBooking(reference)) {
        return json(response, 404, { error: 'Booking not found' }, cors)
      }
      return json(response, 200, { booking: cancelBooking(reference) }, cors)
    }

    if (request.method === 'POST' && url.pathname === '/api/applications') {
      if (!allowWrite(ip)) {
        return json(response, 429, { error: 'Too many requests, try again later' }, cors)
      }
      const body = await readBody(request)
      const { fields, record } = validateApplication(body)
      if (fields) {
        return json(response, 400, { error: 'Invalid application', fields }, cors)
      }
      const saved = insertApplication(record)
      console.log(`application ${saved.reference} — ${saved.property_name}`)
      return json(response, 201, { application: saved }, cors)
    }

    if (request.method === 'GET' && url.pathname === '/api/admin/bookings') {
      if (!isAdmin) return json(response, 401, { error: 'Unauthorised' }, cors)
      return json(response, 200, { bookings: listBookings() }, cors)
    }

    if (request.method === 'GET' && url.pathname === '/api/admin/applications') {
      if (!isAdmin) return json(response, 401, { error: 'Unauthorised' }, cors)
      return json(response, 200, { applications: listApplications() }, cors)
    }

    if (
      request.method === 'PATCH' &&
      url.pathname.startsWith('/api/admin/applications/')
    ) {
      if (!isAdmin) return json(response, 401, { error: 'Unauthorised' }, cors)
      const reference = decodeURIComponent(url.pathname.split('/').pop() ?? '')
      const body = await readBody(request)
      const status = text(body.status)
      if (!['pending', 'approved', 'rejected'].includes(status)) {
        return json(response, 400, { error: 'Invalid status' }, cors)
      }
      const updated = updateApplicationStatus(reference, status)
      if (!updated) return json(response, 404, { error: 'Not found' }, cors)
      return json(response, 200, { application: updated }, cors)
    }

    return json(response, 404, { error: 'Not found' }, cors)
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unexpected error'
    console.error('request failed:', message)
    return json(response, 400, { error: message }, cors)
  }
})

server.listen(PORT, () => {
  console.log(`Isle BnB API listening on http://localhost:${PORT}`)
})
