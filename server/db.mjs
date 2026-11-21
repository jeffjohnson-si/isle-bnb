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

  CREATE INDEX IF NOT EXISTS bookings_created ON bookings (created_at DESC);
  CREATE INDEX IF NOT EXISTS applications_created ON applications (created_at DESC);
  CREATE INDEX IF NOT EXISTS claims_created ON claims (created_at DESC);
  CREATE INDEX IF NOT EXISTS claims_listing ON claims (listing_id);
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
