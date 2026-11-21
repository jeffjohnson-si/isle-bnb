/**
 * Removes rows created by the QA harness and earlier manual API tests so the
 * development database does not fill with fake bookings or stray photos.
 *
 *   node scripts/clean-test-data.mjs
 */
import { DatabaseSync } from 'node:sqlite'
import { readdir, unlink } from 'node:fs/promises'
import path from 'node:path'

const db = new DatabaseSync('data/islebnb.db')
const count = (table) => db.prepare(`SELECT COUNT(*) AS n FROM ${table}`).get().n

const before = ['bookings', 'applications', 'claims', 'created_listings', 'host_accounts'].map(
  (table) => [table, count(table)],
)

db.prepare(
  `DELETE FROM bookings WHERE guest_email IN ('test@example.com', 'api@test.com', 'ui@test.com', 'ui2@test.com')`,
).run()
db.prepare(
  `DELETE FROM applications WHERE email IN ('host@example.com', 'host-ui@test.com')`,
).run()
db.prepare(`DELETE FROM claims WHERE email = 'owner@example.com'`).run()

// Uploaded photos nothing points at any more.
const referenced = new Set()
for (const table of ['created_listings', 'listing_overrides']) {
  for (const row of db.prepare(`SELECT images FROM ${table} WHERE images IS NOT NULL`).all()) {
    try {
      for (const url of JSON.parse(row.images)) referenced.add(path.basename(url))
    } catch {
      // Ignore rows written before images became JSON.
    }
  }
}

const uploadDir = path.join('data', 'uploads')
let removedFiles = 0
for (const file of await readdir(uploadDir).catch(() => [])) {
  if (referenced.has(file)) continue
  await unlink(path.join(uploadDir, file)).catch(() => {})
  removedFiles += 1
}

console.log('table              before  after')
for (const [table, previous] of before) {
  console.log(`${table.padEnd(18)} ${String(previous).padStart(6)} ${String(count(table)).padStart(6)}`)
}
console.log(`\nunused uploads removed: ${removedFiles}`)
db.close()
