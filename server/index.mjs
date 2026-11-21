/**
 * Isle BnB API — dependency-free Node service (node:http + node:sqlite).
 *
 *   npm run api          # http://localhost:8787
 *
 * Endpoints
 *   GET    /api/health                       { ok, mail: 'live' | 'log-only' }
 *   POST   /api/bookings                     create a booking request
 *   GET    /api/bookings?refs=IB-A,IB-B      look up this device's requests
 *   DELETE /api/bookings/:reference          cancel a request
 *   POST   /api/applications                 create a host application
 *   POST   /api/claims                       claim an existing listing
 *   GET    /api/claims/verified              listing ids verified to an owner
 *   GET    /api/listings/overrides           rates and copy published by owners
 *   POST   /api/host/activate                set a password from an invitation
 *   POST   /api/host/login                   email + password, returns a session
 *   POST   /api/host/logout                  (x-host-token)
 *   GET    /api/host/dashboard               listings, their edits, their bookings
 *   PATCH  /api/host/listings/:id            publish rate, copy and rooms
 *   PATCH  /api/host/bookings/:reference     confirm or decline a request
 *   GET    /api/admin/bookings               (x-admin-token)
 *   GET    /api/admin/applications           (x-admin-token)
 *   PATCH  /api/admin/applications/:reference (x-admin-token)
 *   GET    /api/admin/claims                 (x-admin-token)
 *   PATCH  /api/admin/claims/:reference      (x-admin-token)
 *   DELETE /api/admin/claims/:reference      (x-admin-token)
 *   GET    /api/admin/hosts                  (x-admin-token)
 *   POST   /api/admin/hosts/:id/reinvite     (x-admin-token)
 *   PATCH  /api/admin/hosts/:id              (x-admin-token)
 */
import { createServer } from 'node:http'
import { randomBytes, randomInt, scryptSync, timingSafeEqual } from 'node:crypto'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'
import {
  applicationEmails,
  bookingEmails,
  claimEmails,
  hostInviteEmails,
  listingSubmittedEmails,
  listingLiveEmails,
  mailConfig,
  sendMail,
} from './mail.mjs'
import {
  activateHost,
  bookingsForListings,
  cancelBooking,
  createdListingsForHost,
  dataDir,
  deleteClaim,
  deleteHost,
  deleteHostSession,
  deleteHostSessions,
  findHostByEmail,
  findHostByInvite,
  getBooking,
  getBookingsByReferences,
  getClaim,
  getCreatedListing,
  getHost,
  getOverride,
  hostBySession,
  hostListingIds,
  hostListings,
  insertApplication,
  insertBooking,
  insertClaim,
  insertCreatedListing,
  insertHost,
  insertHostSession,
  linkHostListing,
  listApplications,
  listBookings,
  listClaims,
  listCreatedListings,
  listHosts,
  listOverrides,
  setBookingStatus,
  setCreatedListingStatus,
  setHostInvite,
  setHostStatus,
  updateApplicationStatus,
  updateClaimStatus,
  updateCreatedListing,
  upsertOverride,
  verifiedListingIds,
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

/**
 * Per-IP write throttle, split by who is writing. Public writes are the ones an
 * anonymous visitor can make, so they are the tightest. Signed-in host actions
 * are already gated by a session and get room for real work — uploading eight
 * photos and editing a listing should not lock someone out. Login attempts get
 * their own small bucket so guessing a password is slow even behind a NAT.
 */
const BUCKETS = {
  public: { limit: 40, windowMs: 60 * 60 * 1000, hits: new Map() },
  auth: { limit: 200, windowMs: 60 * 60 * 1000, hits: new Map() },
  login: { limit: 10, windowMs: 15 * 60 * 1000, hits: new Map() },
}

function allowWrite(ip, bucket = 'public') {
  const { limit, windowMs, hits } = BUCKETS[bucket]
  const now = Date.now()
  const entry = hits.get(ip) ?? { count: 0, since: now }
  if (now - entry.since > windowMs) {
    entry.count = 0
    entry.since = now
  }
  entry.count += 1
  hits.set(ip, entry)
  return entry.count <= limit
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
    'Access-Control-Allow-Headers': 'content-type, x-admin-token, x-host-token',
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

const CLAIM_ROLES = ['Owner', 'Manager', 'Authorised representative']
const CLAIM_PROOFS = ['Published phone callback', 'Domain email', 'Business licence', 'Social media post']

function validateClaim(input) {
  const fields = {}
  const listingId = text(input.listingId)
  const listingName = text(input.listingName)
  const claimantName = text(input.claimantName)
  const role = text(input.role)
  const email = text(input.email)
  const phone = text(input.phone)
  const proofType = text(input.proofType)
  const proofDetail = text(input.proofDetail)

  if (!listingId) fields.listingId = 'Missing listing'
  if (!listingName) fields.listingName = 'Missing listing name'
  if (!claimantName) fields.claimantName = 'Tell us who you are'
  if (!CLAIM_ROLES.includes(role)) fields.role = 'Choose your role'
  if (!isEmail(email)) fields.email = 'Enter a valid email address'
  if (phone.replace(/[^\d]/g, '').length < 6) fields.phone = 'Enter a phone number'
  if (!CLAIM_PROOFS.includes(proofType)) fields.proofType = 'Choose how we can verify you'

  if (Object.keys(fields).length) return { fields }

  return {
    record: {
      reference: makeReference('CLAIM'),
      listing_id: listingId,
      listing_name: listingName,
      claimant_name: claimantName,
      role,
      email,
      phone,
      proof_type: proofType,
      proof_detail: proofDetail || null,
      status: 'pending',
      created_at: new Date().toISOString(),
    },
  }
}

/* ── host accounts ─────────────────────────────────────────────────────────
 * A verified owner signs in with an email address and a password they set from
 * an invitation. Sessions are opaque tokens kept in the host_sessions table, so
 * the team can end access at any time by suspending the account.
 */

const SESSION_DAYS = 30
const PASSWORD_MIN = 8

const hashPassword = (password) => {
  const salt = randomBytes(16).toString('hex')
  return `${salt}:${scryptSync(password, salt, 32).toString('hex')}`
}

const passwordMatches = (password, stored) => {
  if (!stored) return false
  const [salt, hash] = stored.split(':')
  if (!salt || !hash) return false
  const candidate = scryptSync(password, salt, 32)
  const expected = Buffer.from(hash, 'hex')
  return candidate.length === expected.length && timingSafeEqual(candidate, expected)
}

const sessionToken = () => randomBytes(24).toString('hex')
const inviteToken = () => randomBytes(18).toString('hex')

const inviteUrl = (token) => `${mailConfig.siteUrl.replace(/\/$/, '')}/#/host/activate?token=${token}`
/** Origin-independent link, so the team can hand it over from whatever host they are on. */
const invitePath = (token) => `/#/host/activate?token=${token}`

const publicHost = (host) => ({
  id: host.id,
  name: host.name,
  email: host.email,
  status: host.status,
})

function issueSession(hostId) {
  const token = sessionToken()
  const expires = new Date(Date.now() + SESSION_DAYS * 86_400_000).toISOString()
  insertHostSession({ token, hostId, expiresAt: expires })
  return { token, expiresAt: expires }
}

/**
 * Gives a verified claimant an account for the listing. An address that already
 * has an account simply gains the listing, so one owner can run several
 * properties from a single login.
 */
function grantHostAccess(claim) {
  const existing = findHostByEmail(claim.email)
  const host =
    existing ??
    insertHost({ email: claim.email, name: claim.claimant_name, inviteToken: inviteToken() })
  linkHostListing(host.id, claim.listing_id, claim.listing_name)
  return getHost(host.id)
}

/**
 * Approving an applicant gives them an account *and* a draft listing built from
 * what they already told us — so they never type the property twice. It has no
 * photos, so it cannot go live; their dashboard asks for those first.
 */
function grantApplicantAccess(application) {
  const existing = findHostByEmail(application.email)
  const host =
    existing ??
    insertHost({
      email: application.email,
      name: application.contact_name,
      inviteToken: inviteToken(),
    })
  const account = getHost(host.id)

  const alreadyListed = hostListings(account.id).some(
    (row) => row.listing_name.toLowerCase() === application.property_name.toLowerCase(),
  )
  if (alreadyListed) return { host: account, created: !existing, draft: null }

  const now = new Date().toISOString()
  let listingId = `host-${slugify(application.property_name)}-${randomInt(1000, 9999)}`
  while (getCreatedListing(listingId)) {
    listingId = `host-${slugify(application.property_name)}-${randomInt(1000, 9999)}`
  }

  const draft = insertCreatedListing({
    listing_id: listingId,
    host_id: account.id,
    name: application.property_name,
    type: application.type,
    country: application.country,
    island: application.island,
    area: application.area,
    province: null,
    currency: application.currency,
    price: application.nightly_rate,
    summary: '',
    description: application.description,
    guests: application.guests,
    bedrooms: application.bedrooms,
    beds: application.bedrooms,
    baths: 1,
    amenities: application.amenities,
    images: '[]',
    status: 'pending',
    created_at: now,
    updated_at: now,
  })
  linkHostListing(account.id, draft.listing_id, draft.name)
  return { host: account, created: !existing, draft }
}

/* ── photos ────────────────────────────────────────────────────────────────
 * Owners upload already-compressed images from the browser (canvas → WebP), so
 * the server only has to check what it was given and keep it on disk. The bytes
 * are served back from /api/uploads/<file>.
 */

const UPLOAD_DIR = path.join(dataDir, 'uploads')
const UPLOAD_LIMIT = 8 * 1024 * 1024
const UPLOAD_NAME = /^[a-f0-9]{32}\.(jpg|png|webp)$/
const IMAGE_TYPES = {
  jpg: 'image/jpeg',
  png: 'image/png',
  webp: 'image/webp',
}

const imageExtension = (buffer) => {
  if (buffer.length < 12) return null
  if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) return 'jpg'
  if (buffer.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) {
    return 'png'
  }
  if (
    buffer.subarray(0, 4).toString('ascii') === 'RIFF' &&
    buffer.subarray(8, 12).toString('ascii') === 'WEBP'
  ) {
    return 'webp'
  }
  return null
}

async function readBinary(request, limit) {
  const chunks = []
  let size = 0
  for await (const chunk of request) {
    size += chunk.length
    if (size > limit) throw new Error('That image is too large — keep it under 8 MB')
    chunks.push(chunk)
  }
  return Buffer.concat(chunks)
}

const isOwnImage = (value) => /^\/api\/uploads\/[a-f0-9]{32}\.(jpg|png|webp)$/.test(value)
const isAnyImage = (value) =>
  isOwnImage(value) || /^\/pics\/[\w./-]+\.(webp|jpe?g|png)$/i.test(value)

/* ── editable listing content ──────────────────────────────────────────────
 * Shared by "edit my listing" and "create a listing". Country and type are
 * fixed after creation: they decide currency and how the stay is classified.
 */

const STAY_TYPES = ['Resort', 'Hotel', 'Motel', 'Lodge', 'Bungalow', 'Beach house', 'Guesthouse', 'Villa']

function validateContent(input, { requireImages }) {
  const fields = {}
  const name = text(input.name)
  const island = text(input.island)
  const area = text(input.area)
  const province = text(input.province)
  const price = Number(input.price ?? 0)
  const summary = text(input.summary)
  const description = text(input.description)
  const guests = Number(input.guests)
  const bedrooms = Number(input.bedrooms)
  const beds = Number(input.beds)
  const baths = Number(input.baths)
  const amenities = Array.isArray(input.amenities) ? input.amenities.map(text).filter(Boolean) : []
  const images = Array.isArray(input.images) ? input.images.map(text).filter(Boolean) : []

  if (name.length < 2) fields.name = 'Add the property name'
  if (name.length > 120) fields.name = 'Keep the name under 120 characters'
  if (!island) fields.island = 'Which island is it on?'
  if (!area) fields.area = 'Add the town, village or area'
  if (!Number.isInteger(price) || price < 0 || price > 1_000_000) {
    fields.price = 'Enter a nightly rate, or 0 for “rate on request”'
  }
  if (summary.length > 200) fields.summary = 'Keep the summary under 200 characters'
  if (description.length < 40) fields.description = 'Write at least a couple of sentences'
  if (description.length > 4000) fields.description = 'That description is too long'
  if (!Number.isInteger(guests) || guests < 1 || guests > 50) fields.guests = 'Invalid guest count'
  if (!Number.isInteger(bedrooms) || bedrooms < 0 || bedrooms > 50) fields.bedrooms = 'Invalid bedroom count'
  if (!Number.isInteger(beds) || beds < 0 || beds > 100) fields.beds = 'Invalid bed count'
  if (!Number.isInteger(baths) || baths < 0 || baths > 50) fields.baths = 'Invalid bathroom count'
  if (amenities.length > 25) fields.amenities = 'Keep up to 25 amenities'
  if (amenities.some((item) => item.length > 40)) fields.amenities = 'Amenity names must be short'
  if (images.length > 8) fields.images = 'Up to 8 photos'
  if (images.some((image) => !isAnyImage(image))) fields.images = 'One of those photos is not valid'
  if (requireImages && images.length === 0) fields.images = 'Add at least one photo'

  if (Object.keys(fields).length) return { fields }

  return {
    record: {
      name,
      island,
      area,
      province: province || null,
      price,
      summary,
      description,
      guests,
      bedrooms,
      beds,
      baths,
      amenities: JSON.stringify(amenities.slice(0, 25)),
      images: JSON.stringify(images.slice(0, 8)),
      updated_at: new Date().toISOString(),
    },
  }
}

const parseList = (value) => {
  try {
    const parsed = JSON.parse(value ?? '[]')
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

/** The editable fields in the shape the dashboard form expects. */
const contentFromCreated = (row) => ({
  name: row.name,
  type: row.type,
  country: row.country,
  island: row.island,
  area: row.area,
  province: row.province,
  currency: row.currency,
  price: row.price,
  summary: row.summary,
  description: row.description,
  guests: row.guests,
  bedrooms: row.bedrooms,
  beds: row.beds,
  baths: row.baths,
  amenities: parseList(row.amenities),
  images: parseList(row.images),
  updatedAt: row.updated_at,
})

const contentFromOverride = (row) =>
  row
    ? {
        name: row.name,
        island: row.island,
        area: row.area,
        province: row.province,
        price: row.price,
        summary: row.summary,
        description: row.description,
        guests: row.guests,
        bedrooms: row.bedrooms,
        beds: row.beds,
        baths: row.baths,
        amenities: row.amenities ? parseList(row.amenities) : null,
        images: row.images ? parseList(row.images) : null,
        updatedAt: row.updated_at,
      }
    : null

/** A live listing created by a host, in the public `Listing` shape. */
const publicCreatedListing = (row) => ({
  id: row.listing_id,
  name: row.name,
  type: row.type,
  country: row.country,
  island: row.island,
  area: row.area,
  province: row.province ?? undefined,
  price: row.price,
  currency: row.currency,
  rating: 0,
  reviews: 0,
  guests: row.guests,
  bedrooms: row.bedrooms,
  beds: row.beds,
  baths: row.baths,
  images: parseList(row.images),
  summary: row.summary,
  description: row.description,
  amenities: parseList(row.amenities),
  highlights: [],
  host: { name: row.host_name ?? 'The property', since: Number(row.created_at.slice(0, 4)) },
  badge: 'Listed by the host',
  managedByHost: true,
})

const slugify = (value) =>
  value
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 36) || 'stay'

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
  const hostTokenHeader = request.headers['x-host-token']
  const hostToken = Array.isArray(hostTokenHeader) ? hostTokenHeader[0] : hostTokenHeader
  const host = hostToken ? hostBySession(hostToken) : null

  const publicOverride = (row) => {
    if (!row) return null
    let amenities = []
    try {
      amenities = JSON.parse(row.amenities ?? '[]')
    } catch {
      amenities = []
    }
    return {
      listingId: row.listing_id,
      name: row.name,
      island: row.island,
      area: row.area,
      province: row.province,
      price: row.price,
      summary: row.summary,
      description: row.description,
      guests: row.guests,
      bedrooms: row.bedrooms,
      beds: row.beds,
      baths: row.baths,
      amenities,
      images: row.images ? parseList(row.images) : null,
      updatedAt: row.updated_at,
    }
  }

  const requireHost = () => {
    if (!host) {
      json(response, 401, { error: 'Sign in to continue' }, cors)
      return false
    }
    return true
  }


  try {
    if (request.method === 'GET' && url.pathname === '/api/health') {
      return json(
        response,
        200,
        { ok: true, mail: mailConfig.enabled ? 'live' : 'log-only' },
        cors,
      )
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
      for (const message of bookingEmails(saved)) await sendMail(message)
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
      for (const message of applicationEmails(saved)) await sendMail(message)
      return json(response, 201, { application: saved }, cors)
    }

    if (request.method === 'GET' && url.pathname === '/api/claims/verified') {
      return json(response, 200, { listingIds: verifiedListingIds() }, cors)
    }

    // Public: the rates and copy verified owners have published themselves.
    if (request.method === 'GET' && url.pathname === '/api/listings/overrides') {
      return json(response, 200, { overrides: listOverrides().map(publicOverride) }, cors)
    }

    // Public: listings owners created through their dashboard and the team approved.
    if (request.method === 'GET' && url.pathname === '/api/listings/created') {
      return json(
        response,
        200,
        { listings: listCreatedListings({ status: 'live' }).map(publicCreatedListing) },
        cors,
      )
    }

    if (request.method === 'GET' && url.pathname.startsWith('/api/uploads/')) {
      const name = url.pathname.slice('/api/uploads/'.length)
      if (!UPLOAD_NAME.test(name)) {
        return json(response, 404, { error: 'Not found' }, cors)
      }
      try {
        const bytes = await readFile(path.join(UPLOAD_DIR, name))
        const extension = name.split('.').pop()
        response.writeHead(200, {
          'content-type': IMAGE_TYPES[extension],
          'content-length': bytes.length,
          'cache-control': 'public, max-age=31536000, immutable',
          ...cors,
        })
        response.end(bytes)
      } catch {
        return json(response, 404, { error: 'Not found' }, cors)
      }
      return
    }

    if (request.method === 'POST' && url.pathname === '/api/host/uploads') {
      if (!requireHost()) return
      if (!allowWrite(ip, 'auth')) {
        return json(response, 429, { error: 'Too many uploads, try again later' }, cors)
      }
      const bytes = await readBinary(request, UPLOAD_LIMIT)
      const extension = imageExtension(bytes)
      if (!extension) {
        return json(
          response,
          400,
          { error: 'That file is not a JPEG, PNG or WebP image' },
          cors,
        )
      }
      await mkdir(UPLOAD_DIR, { recursive: true })
      const name = `${randomBytes(16).toString('hex')}.${extension}`
      await writeFile(path.join(UPLOAD_DIR, name), bytes)
      console.log(`upload ${name} ${bytes.length}b for ${host.email}`)
      return json(response, 201, { url: `/api/uploads/${name}`, bytes: bytes.length }, cors)
    }

    if (request.method === 'POST' && url.pathname === '/api/host/listings') {
      if (!requireHost()) return
      if (!allowWrite(ip, 'auth')) {
        return json(response, 429, { error: 'Too many requests, try again later' }, cors)
      }
      const body = await readBody(request)
      const fields = {}
      const type = text(body.type)
      const country = text(body.country)
      const currency = text(body.currency)

      if (!STAY_TYPES.includes(type)) fields.type = 'Choose a property type'
      if (!country) fields.country = 'Choose the country'
      if (!/^[A-Z]{3}$/.test(currency)) fields.currency = 'Missing currency'

      const content = validateContent(body, { requireImages: true })
      if (Object.keys(content.fields ?? {}).length || Object.keys(fields).length) {
        return json(
          response,
          400,
          { error: 'Check the listing details', fields: { ...fields, ...content.fields } },
          cors,
        )
      }
      if (createdListingsForHost(host.id).length >= 20) {
        return json(
          response,
          400,
          { error: 'That is 20 listings already — talk to us about more' },
          cors,
        )
      }

      let listingId = `host-${slugify(content.record.name)}-${randomInt(1000, 9999)}`
      while (getCreatedListing(listingId)) {
        listingId = `host-${slugify(content.record.name)}-${randomInt(1000, 9999)}`
      }

      const now = new Date().toISOString()
      const saved = insertCreatedListing({
        listing_id: listingId,
        host_id: host.id,
        type,
        country,
        currency,
        ...content.record,
        status: 'pending',
        created_at: now,
      })
      linkHostListing(host.id, listingId, saved.name)
      console.log(`listing ${listingId} submitted by ${host.email}`)
      for (const message of listingSubmittedEmails(saved, host)) await sendMail(message)

      return json(
        response,
        201,
        {
          listing: { listingId: saved.listing_id, name: saved.name, status: saved.status },
          content: contentFromCreated(saved),
        },
        cors,
      )
    }


    if (request.method === 'POST' && url.pathname === '/api/host/activate') {
      if (!allowWrite(ip)) {
        return json(response, 429, { error: 'Too many requests, try again later' }, cors)
      }
      const body = await readBody(request)
      const token = text(body.token)
      const name = text(body.name)
      const password = typeof body.password === 'string' ? body.password : ''
      const account = token ? findHostByInvite(token) : null

      if (!account) {
        return json(
          response,
          404,
          { error: 'This invitation is no longer valid. Ask us for a new one.' },
          cors,
        )
      }
      const fields = {}
      if (!name) fields.name = 'Tell us your name'
      if (password.length < PASSWORD_MIN) {
        fields.password = `Use at least ${PASSWORD_MIN} characters`
      }
      if (Object.keys(fields).length) {
        return json(response, 400, { error: 'Check the form', fields }, cors)
      }

      const activated = activateHost(account.id, {
        name,
        passwordHash: hashPassword(password),
      })
      const session = issueSession(activated.id)
      console.log(`host activated ${activated.email}`)
      return json(
        response,
        200,
        { token: session.token, expiresAt: session.expiresAt, host: publicHost(activated) },
        cors,
      )
    }

    if (request.method === 'POST' && url.pathname === '/api/host/login') {
      if (!allowWrite(ip, 'login')) {
        return json(response, 429, { error: 'Too many attempts, try again later' }, cors)
      }
      const body = await readBody(request)
      const email = text(body.email)
      const password = typeof body.password === 'string' ? body.password : ''
      const account = email ? findHostByEmail(email) : null

      if (!account || !passwordMatches(password, account.password_hash)) {
        return json(response, 401, { error: 'Email or password is not correct' }, cors)
      }
      if (account.status === 'suspended') {
        return json(
          response,
          403,
          { error: 'This account is suspended. Contact the Isle BnB team.' },
          cors,
        )
      }
      if (!account.password_hash) {
        return json(
          response,
          403,
          { error: 'This account has not been set up yet. Use the invitation link we sent you.' },
          cors,
        )
      }

      const session = issueSession(account.id)
      return json(
        response,
        200,
        { token: session.token, expiresAt: session.expiresAt, host: publicHost(account) },
        cors,
      )
    }

    if (request.method === 'POST' && url.pathname === '/api/host/logout') {
      if (hostToken) deleteHostSession(hostToken)
      return json(response, 200, { ok: true }, cors)
    }

    if (request.method === 'GET' && url.pathname === '/api/host/dashboard') {
      if (!requireHost()) return
      const listings = hostListings(host.id)
      const bookings = bookingsForListings(listings.map((row) => row.listing_id))
      return json(
        response,
        200,
        {
          host: publicHost(host),
          listings: listings.map((row) => {
            const created = getCreatedListing(row.listing_id)
            return {
              listingId: row.listing_id,
              listingName: created?.name ?? row.listing_name,
              grantedAt: row.granted_at,
              origin: created ? 'host' : 'seed',
              status: created ? created.status : 'live',
              content: created
                ? contentFromCreated(created)
                : contentFromOverride(getOverride(row.listing_id)),
              bookings: bookings.filter((booking) => booking.listing_id === row.listing_id),
            }
          }),
        },
        cors,
      )
    }

    if (request.method === 'PATCH' && url.pathname.startsWith('/api/host/listings/')) {
      if (!requireHost()) return
      const listingId = decodeURIComponent(url.pathname.split('/').pop() ?? '')
      if (!hostListingIds(host.id).includes(listingId)) {
        return json(response, 403, { error: 'That listing is not on your account' }, cors)
      }
      const body = await readBody(request)
      const { fields, record } = validateContent(body, { requireImages: true })
      if (fields) {
        return json(response, 400, { error: 'Check the listing details', fields }, cors)
      }

      const created = getCreatedListing(listingId)
      if (created) {
        if (created.host_id !== host.id) {
          return json(response, 403, { error: 'That listing is not on your account' }, cors)
        }
        const updated = updateCreatedListing(listingId, record)
        linkHostListing(host.id, listingId, updated.name)
        console.log(`host ${host.email} updated ${listingId}`)
        return json(response, 200, { content: contentFromCreated(updated) }, cors)
      }

      const saved = upsertOverride({
        listing_id: listingId,
        ...record,
        updated_by: host.email,
      })
      console.log(`host ${host.email} updated ${listingId}`)
      return json(response, 200, { content: contentFromOverride(saved) }, cors)
    }


    if (request.method === 'PATCH' && url.pathname.startsWith('/api/host/bookings/')) {
      if (!requireHost()) return
      const reference = decodeURIComponent(url.pathname.split('/').pop() ?? '')
      const booking = getBooking(reference)
      if (!booking || !hostListingIds(host.id).includes(booking.listing_id)) {
        return json(response, 404, { error: 'Booking not found' }, cors)
      }
      if (booking.status === 'cancelled') {
        return json(response, 409, { error: 'The guest cancelled this request' }, cors)
      }
      const body = await readBody(request)
      const status = text(body.status)
      if (!['pending', 'confirmed', 'declined'].includes(status)) {
        return json(response, 400, { error: 'Invalid status' }, cors)
      }
      const updated = setBookingStatus(reference, status)
      console.log(`host ${host.email} marked ${reference} ${status}`)
      return json(response, 200, { booking: updated }, cors)
    }


    if (request.method === 'POST' && url.pathname === '/api/claims') {
      if (!allowWrite(ip)) {
        return json(response, 429, { error: 'Too many requests, try again later' }, cors)
      }
      const body = await readBody(request)
      const { fields, record } = validateClaim(body)
      if (fields) {
        return json(response, 400, { error: 'Invalid claim', fields }, cors)
      }
      const saved = insertClaim(record)
      console.log(`claim ${saved.reference} — ${saved.listing_name} by ${saved.claimant_name}`)
      for (const message of claimEmails(saved)) await sendMail(message)
      return json(response, 201, { claim: saved }, cors)
    }

    if (request.method === 'GET' && url.pathname === '/api/admin/claims') {
      if (!isAdmin) return json(response, 401, { error: 'Unauthorised' }, cors)
      return json(response, 200, { claims: listClaims() }, cors)
    }

    if (request.method === 'PATCH' && url.pathname.startsWith('/api/admin/claims/')) {
      if (!isAdmin) return json(response, 401, { error: 'Unauthorised' }, cors)
      const reference = decodeURIComponent(url.pathname.split('/').pop() ?? '')
      const body = await readBody(request)
      const status = text(body.status)
      if (!['pending', 'verified', 'rejected'].includes(status)) {
        return json(response, 400, { error: 'Invalid status' }, cors)
      }
      const before = getClaim(reference)
      const updated = updateClaimStatus(reference, status)
      if (!updated) return json(response, 404, { error: 'Not found' }, cors)

      // Verifying a claim hands the listing to its owner: their own login, and
      // permission to publish rates and copy for this property only.
      let hostAccount = null
      if (status === 'verified') {
        hostAccount = grantHostAccess(updated)
        if (before?.status !== 'verified' && hostAccount.status !== 'active') {
          console.log(`host invite ${hostAccount.email} — ${inviteUrl(hostAccount.invite_token)}`)
          for (const message of hostInviteEmails(hostAccount, updated)) {
            await sendMail(message)
          }
        }
      }

      return json(
        response,
        200,
        {
          claim: updated,
          host: hostAccount ? publicHost(hostAccount) : null,
          inviteUrl:
            hostAccount?.invite_token != null ? inviteUrl(hostAccount.invite_token) : null,
          invitePath:
            hostAccount?.invite_token != null ? invitePath(hostAccount.invite_token) : null,
        },
        cors,
      )
    }

    if (request.method === 'GET' && url.pathname === '/api/admin/listings') {
      if (!isAdmin) return json(response, 401, { error: 'Unauthorised' }, cors)
      return json(
        response,
        200,
        {
          listings: listCreatedListings().map((row) => ({
            listingId: row.listing_id,
            status: row.status,
            hostEmail: row.host_email,
            hostName: row.host_name,
            createdAt: row.created_at,
            content: contentFromCreated(row),
          })),
        },
        cors,
      )
    }

    if (request.method === 'PATCH' && url.pathname.startsWith('/api/admin/listings/')) {
      if (!isAdmin) return json(response, 401, { error: 'Unauthorised' }, cors)
      const listingId = decodeURIComponent(url.pathname.split('/').pop() ?? '')
      const existing = getCreatedListing(listingId)
      if (!existing) return json(response, 404, { error: 'Listing not found' }, cors)
      const body = await readBody(request)
      const status = text(body.status)
      if (!['pending', 'live', 'rejected'].includes(status)) {
        return json(response, 400, { error: 'Invalid status' }, cors)
      }
      if (status === 'live' && parseList(existing.images).length === 0) {
        return json(
          response,
          400,
          {
            error:
              'This listing has no photos yet — ask the owner to add at least one before publishing.',
          },
          cors,
        )
      }
      const updated = setCreatedListingStatus(listingId, status)
      console.log(`listing ${listingId} marked ${status}`)
      if (status === 'live' && existing.status !== 'live') {
        const account = getHost(updated.host_id)
        for (const message of listingLiveEmails(updated, account)) await sendMail(message)
      }
      return json(
        response,
        200,
        {
          listing: {
            listingId: updated.listing_id,
            status: updated.status,
            content: contentFromCreated(updated),
          },
        },
        cors,
      )
    }

    if (request.method === 'GET' && url.pathname === '/api/admin/hosts') {
      if (!isAdmin) return json(response, 401, { error: 'Unauthorised' }, cors)
      return json(
        response,
        200,
        {
          hosts: listHosts().map((row) => ({
            ...publicHost(row),
            createdAt: row.created_at,
            listings: hostListings(row.id).map((listing) => ({
              listingId: listing.listing_id,
              listingName: listing.listing_name,
              grantedAt: listing.granted_at,
            })),
            inviteUrl: row.invite_token ? inviteUrl(row.invite_token) : null,
            invitePath: row.invite_token ? invitePath(row.invite_token) : null,
          })),
        },
        cors,
      )
    }

    if (request.method === 'POST' && url.pathname.startsWith('/api/admin/hosts/')) {
      if (!isAdmin) return json(response, 401, { error: 'Unauthorised' }, cors)
      const [idPart, action] = url.pathname.split('/').slice(4)
      const id = Number(idPart)
      const account = Number.isInteger(id) ? getHost(id) : null
      if (!account) return json(response, 404, { error: 'Host not found' }, cors)
      if (action !== 'reinvite') return json(response, 404, { error: 'Not found' }, cors)

      const refreshed = setHostInvite(id, inviteToken())
      deleteHostSessions(id)
      const url = inviteUrl(refreshed.invite_token)
      console.log(`host re-invite ${refreshed.email} — ${url}`)
      for (const message of hostInviteEmails(refreshed, {
        listing_name: hostListings(id)[0]?.listing_name ?? 'your property',
      })) {
        await sendMail(message)
      }
      return json(response, 200, { host: publicHost(refreshed), inviteUrl: url, invitePath: invitePath(refreshed.invite_token) }, cors)
    }

    if (request.method === 'DELETE' && url.pathname.startsWith('/api/admin/hosts/')) {
      if (!isAdmin) return json(response, 401, { error: 'Unauthorised' }, cors)
      const id = Number(url.pathname.split('/').pop())
      const removed = Number.isInteger(id) ? deleteHost(id) : null
      if (!removed) return json(response, 404, { error: 'Host not found' }, cors)
      console.log(`host removed ${removed.email}`)
      return json(response, 200, { deleted: removed.email }, cors)
    }

    if (request.method === 'PATCH' && url.pathname.startsWith('/api/admin/hosts/')) {
      if (!isAdmin) return json(response, 401, { error: 'Unauthorised' }, cors)
      const id = Number(url.pathname.split('/').pop())
      const account = Number.isInteger(id) ? getHost(id) : null
      if (!account) return json(response, 404, { error: 'Host not found' }, cors)
      const body = await readBody(request)
      const status = text(body.status)
      if (!['active', 'suspended'].includes(status)) {
        return json(response, 400, { error: 'Invalid status' }, cors)
      }
      const updated = setHostStatus(id, status)
      if (status === 'suspended') deleteHostSessions(id)
      return json(response, 200, { host: publicHost(updated) }, cors)
    }


    if (request.method === 'DELETE' && url.pathname.startsWith('/api/admin/claims/')) {
      if (!isAdmin) return json(response, 401, { error: 'Unauthorised' }, cors)
      const reference = decodeURIComponent(url.pathname.split('/').pop() ?? '')
      if (!deleteClaim(reference)) {
        return json(response, 404, { error: 'Not found' }, cors)
      }
      return json(response, 200, { deleted: reference }, cors)
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
      const before = listApplications().find((row) => row.reference === reference)
      const updated = updateApplicationStatus(reference, status)
      if (!updated) return json(response, 404, { error: 'Not found' }, cors)

      // Approving an applicant is what gives them a dashboard. They start with
      // no listings, so the first thing they see is "Add a listing".
      let hostAccount = null
      if (status === 'approved') {
        const granted = grantApplicantAccess(updated)
        hostAccount = granted.host
        if (granted.created && before?.status !== 'approved') {
          console.log(`host invite ${hostAccount.email} — ${inviteUrl(hostAccount.invite_token)}`)
          for (const message of hostInviteEmails(
            hostAccount,
            { listing_name: updated.property_name },
            { draft: Boolean(granted.draft) },
          )) {
            await sendMail(message)
          }
        }
      }

      return json(
        response,
        200,
        {
          application: updated,
          host: hostAccount ? publicHost(hostAccount) : null,
          inviteUrl:
            hostAccount?.invite_token != null ? inviteUrl(hostAccount.invite_token) : null,
          invitePath:
            hostAccount?.invite_token != null ? invitePath(hostAccount.invite_token) : null,
        },
        cors,
      )
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
