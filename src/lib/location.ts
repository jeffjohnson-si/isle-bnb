import type { Listing } from '../types'
import { countryByCode } from '../data/countries'

/**
 * Where the property sits.
 *
 * Properties with a province lead with island + province (Gizo · Western
 * Province, New Georgia · Western Province). Properties in a capital city lead
 * with the city (Honiara · Solomon Islands), so a card never reads
 * "Guadalcanal · Solomon Islands" for a hotel in town.
 */
export function listingRegion(listing: Listing): string {
  const country = countryByCode(listing.country)?.name
  return (listing.province ? [listing.island, listing.province] : [listing.area, country])
    .filter(Boolean)
    .join(' · ')
}

/** Full location line for the listing page: "Gizo, Western Province, Solomon Islands". */
export function listingLocation(listing: Listing): string {
  const country = countryByCode(listing.country)?.name
  const parts = listing.province
    ? [listing.island, listing.province, country]
    : [listing.area, country]
  return parts.filter(Boolean).join(', ')
}

/** Town and island, de-duplicated ("Gizo" rather than "Gizo, Gizo"). */
export function listingLocality(listing: Listing): string {
  return [...new Set([listing.area, listing.island])].filter(Boolean).join(', ')
}
