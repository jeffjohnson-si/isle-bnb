import type { Experience } from '../types'

/**
 * V1 surfaces these as inspiration and points travellers at the host to arrange
 * them. The two reef experiences intentionally sit apart in this list — they
 * share the only underwater placeholder photo we have.
 */
export const experiences: Experience[] = [
  {
    id: 'yasawa-reef-snorkel',
    title: 'Reef snorkel & manta ray drift',
    country: 'FJ',
    location: 'Yasawa Islands',
    image: '/pics/experience-diving.webp',
    price: 185,
    currency: 'FJD',
    duration: 'Half day',
    blurb:
      'Drift over healthy hard coral with a local guide who has been diving these channels since he was nine.',
  },
  {
    id: 'samoa-fiafia',
    title: 'Fiafia night: fire knife & feast',
    country: 'WS',
    location: 'Upolu',
    image: '/pics/experience-fire-dance.webp',
    price: 95,
    currency: 'WST',
    duration: 'Evening',
    blurb:
      'Siva, fa’ataupati and the fire knife finale, followed by an umu feast eaten with the village.',
  },
  {
    id: 'aitutaki-umu',
    title: 'Island feast & umu demonstration',
    country: 'CK',
    location: 'Aitutaki',
    image: '/pics/experience-feast.webp',
    price: 79,
    currency: 'NZD',
    duration: 'Afternoon',
    blurb:
      'Watch the earth oven being opened, then eat what comes out of it. Bring an appetite and no plans.',
  },
  {
    id: 'santo-bonfire',
    title: 'Beach bonfire & reef fish BBQ',
    country: 'VU',
    location: 'Espiritu Santo',
    image: '/pics/bonfire-night.webp',
    price: 6500,
    currency: 'VUV',
    duration: '3 hours',
    blurb:
      'Torch-lit dinner on the sand, cooked over open fire, with kava for anyone who wants to try it.',
  },
  {
    id: 'marovo-carving',
    title: 'Village carving workshop',
    country: 'SB',
    location: 'Marovo Lagoon',
    image: '/pics/experience-island-dance.webp',
    price: 320,
    currency: 'SBD',
    duration: 'Half day',
    blurb:
      'Learn to shape a small bowl from kerosene wood with carvers whose work is in museums.',
  },
  {
    id: 'vavau-whale-swim',
    title: 'Swim with humpback whales',
    country: 'TO',
    location: 'Vava’u',
    image: '/pics/experience-diving.webp',
    price: 420,
    currency: 'TOP',
    duration: 'Full day',
    blurb:
      'July to October only. Licensed operators, maximum four swimmers per whale, no chasing.',
  },
]
