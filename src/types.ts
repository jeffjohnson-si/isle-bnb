export type Region = 'Melanesia' | 'Polynesia' | 'Micronesia'

export type StayType =
  | 'Resort'
  | 'Hotel'
  | 'Motel'
  | 'Lodge'
  | 'Bungalow'
  | 'Beach house'
  | 'Guesthouse'
  | 'Villa'

export interface Country {
  /** ISO 3166-1 alpha-2 where one exists, otherwise a stable slug. */
  code: string
  name: string
  region: Region
  capital: string
  currency: string
  currencyName: string
  languages: string[]
  tagline: string
  blurb: string
  image?: string
  bestTime: string
}

export interface Listing {
  id: string
  name: string
  type: StayType
  country: string
  island: string
  area: string
  /** Province, when the property is outside Honiara. Shown instead of the town. */
  province?: string
  price: number
  currency: string
  rating: number
  reviews: number
  guests: number
  bedrooms: number
  beds: number
  baths: number
  images: string[]
  summary: string
  description: string
  amenities: string[]
  highlights: string[]
  host: { name: string; since: number; superhost?: boolean }
  transfer?: string
  freeCancellation?: boolean
  badge?: string
}

export interface Experience {
  id: string
  title: string
  country: string
  location: string
  image: string
  price: number
  currency: string
  duration: string
  blurb: string
}

export interface Booking {
  reference: string
  listingId: string
  listingName: string
  country: string
  island: string
  /** Snapshot of "Island · Province" (or · Country) at booking time. */
  region?: string
  checkIn: string
  checkOut: string
  guests: number
  nights: number
  guestName: string
  guestEmail: string
  guestPhone: string
  notes: string
  total: number
  currency: string
  createdAt: string
}

export interface HostApplication {
  reference: string
  propertyName: string
  type: StayType
  country: string
  island: string
  area: string
  address: string
  nightlyRate: number
  currency: string
  guests: number
  bedrooms: number
  description: string
  amenities: string[]
  contactName: string
  email: string
  phone: string
  createdAt: string
}
