import { DatabaseSync } from 'node:sqlite'
import { mkdirSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const here = path.dirname(fileURLToPath(import.meta.url))
const dataDir = process.env.DATA_DIR ?? path.join(here, '..', 'data')
mkdirSync(dataDir, { recursive: true })

export const db = new DatabaseSync(path.join(dataDir, 'islebnb.db'))

db.exec(`
  PRAGMA journal_mode = WAL;

  CREATE TABLE IF NOT EXISTS bookings (
    reference      TEXT PRIMARY KEY,
    listing_id     TEXT NOT NULL,
    listing_name   TEXT NOT NULL,
    country        TEXT NOT NULL,
    island         TEXT NOT NULL,
    region         TEXT,
    check_in       TEXT NOT NULL,
    check_out      TEXT NOT NULL,
    guests         INTEGER NOT NULL,
    nights         INTEGER NOT NULL,
    guest_name     TEXT NOT NULL,
    guest_email    TEXT NOT NULL,
    guest_phone    TEXT NOT NULL,
    notes          TEXT,
    total          INTEGER NOT NULL,
    currency       TEXT NOT NULL,
    status         TEXT NOT NULL DEFAULT 'pending',
    created_at     TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS applications (
    reference      TEXT PRIMARY KEY,
    property_name  TEXT NOT NULL,
    type           TEXT NOT NULL,
    country        TEXT NOT NULL,
    island         TEXT NOT NULL,
    area           TEXT NOT NULL,
    address        TEXT,
    nightly_rate   INTEGER NOT NULL,
    currency       TEXT NOT NULL,
    guests         INTEGER NOT NULL,
    bedrooms       INTEGER NOT NULL,
    description    TEXT NOT NULL,
    amenities      TEXT NOT NULL,
    contact_name   TEXT NOT NULL,
    email          TEXT NOT NULL,
    phone          TEXT NOT NULL,
    status         TEXT NOT NULL DEFAULT 'pending',
    created_at     TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS claims (
    reference      TEXT PRIMARY KEY,
    listing_id     TEXT NOT NULL,
    listing_name   TEXT NOT NULL,
    claimant_name  TEXT NOT NULL,
    role           TEXT NOT NULL,
    email          TEXT NOT NULL,
    phone          TEXT NOT NULL,
    proof_type     TEXT NOT NULL,
    proof_detail   TEXT,
    status         TEXT NOT NULL DEFAULT 'pending',
    created_at     TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS host_accounts (
    id             INTEGER PRIMARY KEY AUTOINCREMENT,
    email          TEXT NOT NULL UNIQUE COLLATE NOCASE,
    name           TEXT,
    password_hash  TEXT,
    invite_token   TEXT UNIQUE,
    status         TEXT NOT NULL DEFAULT 'invited',
    created_at     TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS host_sessions (
    token          TEXT PRIMARY KEY,
    host_id        INTEGER NOT NULL,
    created_at     TEXT NOT NULL,
    expires_at     TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS host_listings (
    host_id        INTEGER NOT NULL,
    listing_id     TEXT NOT NULL,
    listing_name   TEXT NOT NULL,
    granted_at     TEXT NOT NULL,
    PRIMARY KEY (host_id, listing_id)
  );

  CREATE TABLE IF NOT EXISTS listing_overrides (
    listing_id     TEXT PRIMARY KEY,
    price          INTEGER,
    summary        TEXT,
    description    TEXT,
    guests         INTEGER,
    bedrooms       INTEGER,
    beds           INTEGER,
    baths          INTEGER,
    amenities      TEXT,
    updated_at     TEXT NOT NULL,
    updated_by     TEXT
  );

  CREATE INDEX IF NOT EXISTS bookings_created ON bookings (created_at DESC);
  CREATE INDEX IF NOT EXISTS applications_created ON applications (created_at DESC);
  CREATE INDEX IF NOT EXISTS claims_created ON claims (created_at DESC);
  CREATE INDEX IF NOT EXISTS claims_listing ON claims (listing_id);
  CREATE INDEX IF NOT EXISTS host_sessions_host ON host_sessions (host_id);
  CREATE INDEX IF NOT EXISTS host_listings_listing ON host_listings (listing_id);
`)

const bookingColumns = [
  'reference', 'listing_id', 'listing_name', 'country', 'island', 'region',
  'check_in', 'check_out', 'guests', 'nights', 'guest_name', 'guest_email',
  'guest_phone', 'notes', 'total', 'currency', 'status', 'created_at',
]

const claimColumns = [
  'reference', 'listing_id', 'listing_name', 'claimant_name', 'role', 'email',
  'phone', 'proof_type', 'proof_detail', 'status', 'created_at',
]

const applicationColumns = [
  'reference', 'property_name', 'type', 'country', 'island', 'area', 'address',
  'nightly_rate', 'currency', 'guests', 'bedrooms', 'description', 'amenities',
  'contact_name', 'email', 'phone', 'status', 'created_at',
]

export function insertBooking(record) {
  const placeholders = bookingColumns.map(() => '?').join(', ')
  db.prepare(
    `INSERT INTO bookings (${bookingColumns.join(', ')}) VALUES (${placeholders})`,
  ).run(...bookingColumns.map((column) => record[column]))
  return getBooking(record.reference)
}

export function getBooking(reference) {
  return db
    .prepare('SELECT * FROM bookings WHERE reference = ?')
    .get(reference)
}

export function getBookingsByReferences(references) {
  if (!references.length) return []
  const placeholders = references.map(() => '?').join(', ')
  return db
    .prepare(
      `SELECT * FROM bookings WHERE reference IN (${placeholders}) ORDER BY created_at DESC`,
    )
    .all(...references)
}

export function listBookings(limit = 200) {
  return db
    .prepare('SELECT * FROM bookings ORDER BY created_at DESC LIMIT ?')
    .all(limit)
}

export function cancelBooking(reference) {
  const existing = getBooking(reference)
  if (!existing) return null
  db.prepare('UPDATE bookings SET status = ? WHERE reference = ?').run(
    'cancelled',
    reference,
  )
  return getBooking(reference)
}

export function insertApplication(record) {
  const placeholders = applicationColumns.map(() => '?').join(', ')
  db.prepare(
    `INSERT INTO applications (${applicationColumns.join(', ')}) VALUES (${placeholders})`,
  ).run(...applicationColumns.map((column) => record[column]))
  return db
    .prepare('SELECT * FROM applications WHERE reference = ?')
    .get(record.reference)
}

export function listApplications(limit = 200) {
  return db
    .prepare('SELECT * FROM applications ORDER BY created_at DESC LIMIT ?')
    .all(limit)
}

export function updateApplicationStatus(reference, status) {
  db.prepare('UPDATE applications SET status = ? WHERE reference = ?').run(
    status,
    reference,
  )
  return db.prepare('SELECT * FROM applications WHERE reference = ?').get(reference)
}

export function insertClaim(record) {
  const placeholders = claimColumns.map(() => '?').join(', ')
  db.prepare(
    `INSERT INTO claims (${claimColumns.join(', ')}) VALUES (${placeholders})`,
  ).run(...claimColumns.map((column) => record[column]))
  return db.prepare('SELECT * FROM claims WHERE reference = ?').get(record.reference)
}

export function listClaims(limit = 200) {
  return db
    .prepare('SELECT * FROM claims ORDER BY created_at DESC LIMIT ?')
    .all(limit)
}

export function updateClaimStatus(reference, status) {
  db.prepare('UPDATE claims SET status = ? WHERE reference = ?').run(status, reference)
  return db.prepare('SELECT * FROM claims WHERE reference = ?').get(reference)
}

export function getClaim(reference) {
  return db.prepare('SELECT * FROM claims WHERE reference = ?').get(reference)
}

export function deleteClaim(reference) {
  const result = db.prepare('DELETE FROM claims WHERE reference = ?').run(reference)
  return result.changes > 0
}

/** Listing ids that a verified owner has claimed. */
export function verifiedListingIds() {
  return db
    .prepare("SELECT DISTINCT listing_id FROM claims WHERE status = 'verified'")
    .all()
    .map((row) => row.listing_id)
}

/* ── host accounts ──────────────────────────────────────────────────────── */

export function insertHost({ email, name, inviteToken }) {
  db.prepare(
    `INSERT INTO host_accounts (email, name, invite_token, status, created_at)
     VALUES (?, ?, ?, 'invited', ?)`,
  ).run(email.toLowerCase(), name ?? null, inviteToken, new Date().toISOString())
  return findHostByEmail(email)
}

export function findHostByEmail(email) {
  return db
    .prepare('SELECT * FROM host_accounts WHERE email = ? COLLATE NOCASE')
    .get(email)
}

export function getHost(id) {
  return db.prepare('SELECT * FROM host_accounts WHERE id = ?').get(id)
}

export function findHostByInvite(inviteToken) {
  return db
    .prepare('SELECT * FROM host_accounts WHERE invite_token = ?')
    .get(inviteToken)
}

export function activateHost(id, { name, passwordHash }) {
  db.prepare(
    `UPDATE host_accounts
     SET name = ?, password_hash = ?, invite_token = NULL, status = 'active'
     WHERE id = ?`,
  ).run(name, passwordHash, id)
  return getHost(id)
}

export function setHostInvite(id, inviteToken) {
  db.prepare(
    `UPDATE host_accounts
     SET invite_token = ?, password_hash = NULL, status = 'invited'
     WHERE id = ?`,
  ).run(inviteToken, id)
  return getHost(id)
}

export function setHostStatus(id, status) {
  db.prepare('UPDATE host_accounts SET status = ? WHERE id = ?').run(status, id)
  return getHost(id)
}

export function listHosts() {
  return db.prepare('SELECT * FROM host_accounts ORDER BY created_at DESC').all()
}

export function linkHostListing(hostId, listingId, listingName) {
  db.prepare(
    `INSERT INTO host_listings (host_id, listing_id, listing_name, granted_at)
     VALUES (?, ?, ?, ?)
     ON CONFLICT (host_id, listing_id) DO UPDATE SET listing_name = excluded.listing_name`,
  ).run(hostId, listingId, listingName, new Date().toISOString())
}

export function hostListings(hostId) {
  return db
    .prepare('SELECT * FROM host_listings WHERE host_id = ? ORDER BY granted_at')
    .all(hostId)
}

export function hostListingIds(hostId) {
  return hostListings(hostId).map((row) => row.listing_id)
}

/**
 * Removes an account, its sessions and its listing links, and drops any content
 * that owner published — once the account is gone we can no longer attribute it.
 */
export function deleteHost(id) {
  const host = getHost(id)
  if (!host) return null
  db.prepare('DELETE FROM host_sessions WHERE host_id = ?').run(id)
  db.prepare('DELETE FROM host_listings WHERE host_id = ?').run(id)
  db.prepare('DELETE FROM listing_overrides WHERE updated_by = ?').run(host.email)
  db.prepare('DELETE FROM host_accounts WHERE id = ?').run(id)
  return host
}

/* ── host sessions ──────────────────────────────────────────────────────── */

export function insertHostSession({ token, hostId, expiresAt }) {
  db.prepare(
    'INSERT INTO host_sessions (token, host_id, created_at, expires_at) VALUES (?, ?, ?, ?)',
  ).run(token, hostId, new Date().toISOString(), expiresAt)
}

/** Returns the account for a live session, or null. Expired rows are dropped. */
export function hostBySession(token) {
  const row = db
    .prepare(
      `SELECT h.*, s.expires_at
       FROM host_sessions s JOIN host_accounts h ON h.id = s.host_id
       WHERE s.token = ?`,
    )
    .get(token)
  if (!row) return null
  if (row.expires_at <= new Date().toISOString() || row.status === 'suspended') {
    deleteHostSession(token)
    return null
  }
  return row
}

export function deleteHostSession(token) {
  db.prepare('DELETE FROM host_sessions WHERE token = ?').run(token)
}

export function deleteHostSessions(hostId) {
  db.prepare('DELETE FROM host_sessions WHERE host_id = ?').run(hostId)
}

/* ── listing overrides written by verified owners ───────────────────────── */

export function getOverride(listingId) {
  return db.prepare('SELECT * FROM listing_overrides WHERE listing_id = ?').get(listingId)
}

export function listOverrides() {
  return db.prepare('SELECT * FROM listing_overrides ORDER BY updated_at DESC').all()
}

export function upsertOverride(record) {
  db.prepare(
    `INSERT INTO listing_overrides
       (listing_id, price, summary, description, guests, bedrooms, beds, baths,
        amenities, updated_at, updated_by)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT (listing_id) DO UPDATE SET
       price = excluded.price,
       summary = excluded.summary,
       description = excluded.description,
       guests = excluded.guests,
       bedrooms = excluded.bedrooms,
       beds = excluded.beds,
       baths = excluded.baths,
       amenities = excluded.amenities,
       updated_at = excluded.updated_at,
       updated_by = excluded.updated_by`,
  ).run(
    record.listing_id,
    record.price,
    record.summary,
    record.description,
    record.guests,
    record.bedrooms,
    record.beds,
    record.baths,
    record.amenities,
    record.updated_at,
    record.updated_by,
  )
  return getOverride(record.listing_id)
}

export function bookingsForListings(listingIds) {
  if (!listingIds.length) return []
  const placeholders = listingIds.map(() => '?').join(', ')
  return db
    .prepare(
      `SELECT * FROM bookings WHERE listing_id IN (${placeholders})
       ORDER BY created_at DESC LIMIT 100`,
    )
    .all(...listingIds)
}

export function setBookingStatus(reference, status) {
  db.prepare('UPDATE bookings SET status = ? WHERE reference = ?').run(status, reference)
  return getBooking(reference)
}
