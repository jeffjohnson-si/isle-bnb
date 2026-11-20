# Isle BnB

A PWA for booking island stays across the Pacific — resorts, hotels, lodges,
guesthouses and family homes in 21 island nations. Travellers reserve online and
**pay the property on arrival**; there is no online payment in v1.

Built with React 18 + TypeScript + Vite + Tailwind, installable on iOS/Android/desktop
and light enough for island connections (~83 kB gzipped JS).

## Quick start

```bash
npm install
npm run dev        # http://localhost:5180
```

| Script | What it does |
| --- | --- |
| `npm run dev` | Vite dev server on port 5180 |
| `npm run build` | Type-check (`tsc --noEmit`) then build to `dist/` |
| `npm run preview` | Serve the production build on port 4173 |
| `npm run check` | Headless Chrome pass over every page + the booking and host flows, writes screenshots to `.shots/` (needs Chrome; override with `CHROME_PATH`) |
| `npm run icons` | Regenerate the PWA icons from `scripts/make-icons.py` (Pillow) |
| `python scripts/optimise-photos.py` | Reprocess photos: upscale to 1200px, sharpen the luminance channel adaptively, save WebP (quality 76) and delete the JPEG. Add `--restore` to re-import originals from `Desktop/islebnb` first |

## What is in v1

Each area is its own page — the landing screen is the hero and search only.

- `/` — hero landing page with search (island, guests, stay type)
- `/explore` — destination picker: one card per country with stays, tap through to its listings
- `/stays` — searchable, filterable list of every stay across all countries
- `/countries` — directory of all 21 Pacific nations, grouped by region
- `/countries/:code` — one country: facts plus its stays
- `/stays/:id` — listing page with gallery, amenities, house rules, host details
- `/experiences` — reefs, fire knife nights, umu feasts and village workshops
- `/how-it-works` — booking policy, four-step flow, FAQ
- `/bookings` — booking requests with dates, totals and reference numbers
- `/saved` — wishlist of saved stays
- `/list-your-place` — host onboarding form and host standards

**Booking requests** collect dates, guests and contact details, show a night-by-night
total and a reference (`IB-7KQ4M9`), and never ask for a card. Requests and host
applications are written to a SQLite database by the API in `server/`; saved stays and this
device's list of booking references stay in `localStorage`.


## Backend

`server/index.mjs` is a dependency-free Node service (`node:http` + `node:sqlite`, Node 22+).
Data lives in `data/islebnb.db` (git-ignored).

| Endpoint | Purpose |
| --- | --- |
| `POST /api/bookings` | Create a booking request. Validated server-side; returns a reference |
| `GET /api/bookings?refs=IB-A,IB-B` | Look up this device's requests |
| `DELETE /api/bookings/:reference` | Cancel a request |
| `POST /api/applications` | Create a host application |
| `GET /api/admin/bookings` · `/api/admin/applications` | Admin list (requires `x-admin-token`) |
| `PATCH /api/admin/applications/:reference` | Set status `pending` / `approved` / `rejected` |

Environment variables (see `.env.example`): `PORT`, `ADMIN_TOKEN`, `ALLOWED_ORIGIN`,
`DATA_DIR`, and `VITE_API_BASE` for the front end. Vite proxies `/api` to `localhost:8787`
in both dev and preview, so the app and API can share an origin.

**Still missing:** email/WhatsApp delivery to properties, admin screens, host accounts and
the claim flow, reviews. The API stores and serves; it does not notify anyone yet.

## Project shape

```
public/
  pics/                  photos used across the site
  icons/                 generated PWA icons + favicon.svg
  manifest.webmanifest   install metadata
  sw.js                  app-shell service worker
src/
  data/
    countries.ts         21 Pacific nations: currency, languages, best season
    listings.ts          live catalogue — empty until properties are verified
    experiences.ts       things-to-do cards
  components/            Header, Footer, ListingCard, SearchBar, BookingCard, …
  pages/                 Home, Explore, Stays, Countries, Country, Experiences, Listing,
                         Bookings, Saved, ListProperty, HowItWorks, NotFound
  lib/                   money (local currency + USD estimate), storage, pwa hooks, utils
  types.ts               Country / Listing / Booking / HostApplication
```

## Editing content

Everything is data-driven, no CMS needed:

- **Add or change a stay** — copy the template comment at the top of
  `src/data/listings.ts` into the `listings` array. The catalogue ships empty on
  purpose: every entry is shown as a bookable rate paid on arrival, so it has to be a
  verified property.
  Prices are in the host country's currency; the USD estimate comes from the fixed rate
  table in `src/lib/money.ts`.
- **Add a nation** — append to `src/data/countries.ts`. Countries without listings show
  as "Hosts onboarding now" and still get a page.
- **Photos** — the eight images directly in `public/pics/` are stand-ins used for the
  hero and country headers. Real property photos live in `public/pics/<property>/` (see
  `king-solomon/`). Galleries expect 5 images per listing. Sources arrived through WeChat
  at 640–1024px, which is the ceiling on sharpness: `scripts/optimise-photos.py` upscales
  to 1200px (the largest size the layout displays), sharpens the luminance channel
  adaptively, and writes **WebP** — every file in `public/pics/` is `.webp`, so reference
  them that way. It cannot invent detail. When better originals arrive, drop them in
  `Desktop/islebnb/<property>/` and run `python scripts/optimise-photos.py --restore`.
- **Rate not confirmed yet** — set `price: 0`. Cards, the listing page and the booking
  form render "Rate on request" instead of a number and hide the total, so nothing
  invents a price. Replace 0 with the real figure once the property confirms it.
- **No reviews yet** — keep `reviews: 0` and `rating: 0`; the UI shows a "New" badge
  instead of a star rating rather than a made-up score.
- **Brand colours** — `tailwind.config.js` (`ink`, `deep`, `palm`, `lagoon`, `aqua`,
  `sand`, `coral`, `sun`).

## Routing

`HashRouter` (`/#/stays/…`) is intentional: the build works on any static host,
sub-folder or even opened from disk without server rewrite rules.

## Deploy

`npm run build` produces a fully static `dist/`. Upload it to Cloudflare Pages, Netlify,
Vercel or S3 — no server, no environment variables. Service worker and manifest assume
the site is served from the domain root (`base: '/'` in `vite.config.ts`); change that
to `'./'` and use relative asset paths if you deploy under a sub-path.

## Notes for whoever picks this up

- Date inputs use the browser's native picker; Safari and Chrome both behave.
- The USD figure is labelled "indicative" on purpose — never show it as a quote.
- `scripts/visual-check.mjs` fails on console errors and on horizontal overflow at
  390 px wide, so it catches most layout regressions in one command.
