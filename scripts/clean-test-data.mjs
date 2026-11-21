/**
 * Removes rows created by the QA harness and earlier manual API tests so the
 * development database does not fill with fake bookings.
 *
 *   node scripts/clean-test-data.mjs
 */
import { DatabaseSync } from 'node:sqlite'

const db = new DatabaseSync('data/islebnb.db')
const count = (table) => db.prepare(`SELECT COUNT(*) AS n FROM ${table}`).get().n

const before = ['bookings', 'applications', 'claims'].map((table) => [table, count(table)])

db.prepare(`DELETE FROM bookings WHERE guest_email IN ('test@example.com', 'api@test.com', 'ui@test.com', 'ui2@test.com')`).run()
db.prepare(`DELETE FROM applications WHERE email IN ('host@example.com', 'host-ui@test.com')`).run()
db.prepare(`DELETE FROM claims WHERE email = 'owner@example.com'`).run()

console.log('table          before  after')
for (const [table, previous] of before) {
  console.log(`${table.padEnd(14)} ${String(previous).padStart(6)} ${String(count(table)).padStart(6)}`)
}
db.close()
