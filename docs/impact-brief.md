# Isle BnB — impact brief

*Pacific island stays, bookable without a card, with the money staying on the island.*

Prepared 21 November 2026 · v1 prototype, built and running.

---

## The problem we are solving

Small Pacific properties — a family guesthouse in Munda, a bungalow on Aitutaki, a
lodge on Tanna — are hard to find and harder to book. The big platforms take a
commission the margin cannot absorb, require card processing that many owners do not
have, and often do not list the property at all. Travellers planning a Pacific trip end
up on Facebook pages and unanswered emails.

Meanwhile most Pacific bookings are still **arranged by phone and settled in cash on
arrival**. A booking tool that refuses to work that way excludes the very properties it
should be helping.

## What Isle BnB is

A single place to find a place to stay across the Pacific, with no payment step. Guests
request dates, the property confirms by email or phone, and the guest pays the property
on arrival — the way most Pacific bookings already work.

- **No commission in v1.** Isle BnB takes no money from the guest and no cut from the
  property.
- **No card details, ever.** Nothing to charge back, no PCI burden, no processing fee
  taken out of a small property's nightly rate.
- **Built for the connection guests actually have.** Installable PWA, works on a cheap
  Android phone, serves saved pages offline.
- **Owned by the property.** Every listing can be claimed by its real owner and handed
  over, so the catalogue is not a scraped directory that nobody controls.

## What is built today

This is not a pitch deck of intentions. The product runs.

| | |
| --- | --- |
| Pacific nations mapped | **21**, each with capital, currency, languages and best season |
| Countries with live listings | **19** |
| Properties in the catalogue | **76** — 34 resorts, 26 hotels, 6 lodges, 5 guesthouses, 5 other |
| Listing photos, optimised for slow links | **388** (WebP, ~64 MB total) |
| Guest flow | search → listing → booking request → reference → pay on arrival |
| Host flow | self-service application form → team review → onboarding |
| Claim flow | owner claims a listing → team verifies by published phone number |
| Team dashboard | applications, claims and bookings in one screen |
| Transactional email | sent through Brevo, logs instead of failing when unconfigured |
| Data | SQLite on the server; the guest's reference list stays on their device |

Every listing page also states plainly that Isle BnB takes no payment and no card
details — there is no dark pattern and no "book now, pay later" surprise.

**What has not happened yet:** no property has been contacted or consented, no real
booking has been taken, and there is no public domain. The catalogue was built from
publicly available property information so that partners can see a real product rather
than a mock-up; the claim flow exists precisely so each owner decides whether to stay.

## Why fund this

The gap is not software — the software is built. The gap is the unglamorous work of
onboarding: visiting islands, meeting owners, correcting rates, taking photos, and
proving to travellers that the listings are real.

Funding for twelve months would pay for:

1. **Verification and consent (months 1–4)** — contact every property in the catalogue,
   confirm rates and rooms, remove anything the owner does not want listed, and record
   consent. Target: 76 listings verified, 60 with owner-set rates.
2. **Owner onboarding (months 2–8)** — in-country visits in Solomon Islands, Vanuatu,
   Fiji, Samoa and Tonga; train owners to keep rates and rooms current themselves
   through the claim flow.
3. **Public launch (month 5)** — a domain, a verified sending domain for email, and a
   small marketing push in the source markets that already fly these routes.
4. **Measurement (ongoing)** — bookings requested, properties confirmed, value settled
   on arrival, and share of that value retained locally.

## How we would measure impact

The number that matters is not page views. It is **value that reaches a Pacific
property** without a commission deducted. Each quarter we would report:

- properties verified and consenting, and properties actively managed by their owner
- booking requests passed to properties, and requests confirmed by them
- total value settled on arrival, by country
- commission and fees taken by Isle BnB (target: zero in v1)
- share of listings outside the capital city — the properties least visible today

## Cost of running it

v1 is deliberately cheap to operate: a static site, a single small API, a SQLite file
and a transactional email account. No card processing, no per-seat platform fees, no
image CDN. The recurring cost is hosting in the low tens of dollars a month, plus the
price of a domain. Almost all of any funding goes to people and travel, not
infrastructure.

## What we will not do

- We will not publish a rate a property has not given us. Unverified rates show as
  "rate on request".
- We will not publish a review or rating we cannot source. New listings say so.
- We will not take a commission from a booking in v1, and we will not add one later
  without telling every host.
- We will not list a property that has asked to be removed.

## Contact

Isle BnB — Pacific island stays.
Email: hosts@islebnb.com
Code and catalogue: available on request for review.
