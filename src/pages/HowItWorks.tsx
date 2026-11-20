import { Link } from 'react-router-dom'
import { Icon } from '../components/Icons'
import { usePageTitle } from '../lib/usePageTitle'

const promises = [
  {
    icon: 'wallet' as const,
    title: 'Pay on arrival',
    body: 'No card details, no deposit. You reserve online and settle with your host when you check in.',
  },
  {
    icon: 'globe' as const,
    title: 'Locally owned',
    body: 'Every stay is run by an island family or operator, so your money stays in the community.',
  },
  {
    icon: 'shield' as const,
    title: 'Checked before it goes live',
    body: 'We verify the property, the photos and the contact details before a stay is listed.',
  },
  {
    icon: 'wifi' as const,
    title: 'Built for island wifi',
    body: 'A light web app that keeps working on slow connections and installs to your home screen.',
  },
]


const sections = [
  {
    title: '1 · Find a stay',
    body: 'Browse by country, stay type or guest count. Every listing shows the nightly rate in the host country’s currency, plus a rough USD figure so you can compare across borders.',
  },
  {
    title: '2 · Send a request',
    body: 'Pick your dates and guests and send a booking request. We pass it to the property with your contact details. No payment method is required, because v1 does not take payments.',
  },
  {
    title: '3 · The property confirms',
    body: 'Most hosts reply within 24 hours by email or WhatsApp. If they cannot take your dates they will tell you directly, and you are free to request another stay.',
  },
  {
    title: '4 · Pay on arrival',
    body: 'Bring the total in local currency or USD and settle at check-in. Your confirmation shows exactly what to pay, and the rate you agreed.',
  },
]

const faqs = [
  {
    q: 'Why is there no online payment?',
    a: 'Most Pacific properties, especially family-run guesthouses, are paid in cash or by local transfer on arrival. Card processing is expensive and unreliable on many islands, so v1 keeps money between you and the host. Card payments are on the roadmap once host payouts are solved properly.',
  },
  {
    q: 'What does Isle BnB charge?',
    a: 'Nothing to travellers in v1, and no commission is taken from host bookings during the launch period. The rate you see is the rate you pay the property.',
  },
  {
    q: 'What if my plans change?',
    a: 'Cancel from My bookings as early as possible. Stays marked “free cancellation” can be cancelled up to 7 days before check-in. After that, contact the property directly — most hosts are flexible outside peak season.',
  },
  {
    q: 'Which currency will I pay in?',
    a: 'The local currency shown on the listing. US dollars are widely accepted in Palau, Micronesia, the Marshall Islands, Guam, American Samoa and the Northern Marianas; Australian dollars in Kiribati, Nauru and Tuvalu; New Zealand dollars in the Cook Islands and Niue. Bring some cash — ATMs are limited outside the capitals.',
  },
  {
    q: 'Is my booking guaranteed?',
    a: 'Your request is not a confirmed booking until the property accepts it. The confirmation email from the host is what guarantees your room.',
  },
]

export function HowItWorksPage() {
  usePageTitle('How booking works · Isle BnB')

  return (
    <div className="section max-w-4xl pt-10">
      <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-lagoon">
        Booking policy
      </p>
      <h1 className="mt-2 text-balance font-display text-3xl font-semibold leading-[1.1] text-ink sm:text-[2.8rem]">
        How booking works on Isle BnB
      </h1>
      <p className="mt-3 text-[15px] leading-relaxed text-ink/60">
        Version one is deliberately simple: we connect you with the people who run the
        place, and you pay them in person. Here is exactly what happens.
      </p>

      <div className="mt-8 grid gap-6 rounded-[1.75rem] border border-ink/10 bg-white p-6 shadow-card sm:grid-cols-2 sm:p-8">
        {promises.map((promise) => (
          <div key={promise.title} className="flex gap-3.5">
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-mist text-lagoon">
              <Icon name={promise.icon} size={18} />
            </span>
            <div>
              <h2 className="text-sm font-bold text-ink">{promise.title}</h2>
              <p className="mt-1 text-sm leading-relaxed text-ink/60">{promise.body}</p>
            </div>
          </div>
        ))}
      </div>


      <div className="mt-10 space-y-6">
        {sections.map((section) => (
          <section
            key={section.title}
            className="rounded-[1.5rem] border border-ink/10 bg-white p-6 shadow-card"
          >
            <h2 className="text-lg font-bold text-ink">{section.title}</h2>
            <p className="mt-2 text-sm leading-relaxed text-ink/65">{section.body}</p>
          </section>
        ))}
      </div>

      <h2 className="mt-14 font-display text-2xl font-semibold text-ink">
        Common questions
      </h2>
      <div className="mt-5 divide-y divide-ink/10 overflow-hidden rounded-[1.5rem] border border-ink/10 bg-white">
        {faqs.map((faq) => (
          <details key={faq.q} className="group px-5 py-4">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-sm font-semibold text-ink [&::-webkit-details-marker]:hidden">
              {faq.q}
              <Icon
                name="chevronDown"
                size={18}
                className="shrink-0 text-ink/40 transition group-open:rotate-180"
              />
            </summary>
            <p className="mt-3 text-sm leading-relaxed text-ink/65">{faq.a}</p>
          </details>
        ))}
      </div>

      <div className="mt-10 rounded-[1.5rem] bg-deep p-7 text-sand sm:p-9">
        <h2 className="font-display text-2xl font-semibold">Still stuck?</h2>
        <p className="mt-2 max-w-lg text-sm leading-relaxed text-sand/75">
          Email us and a human — usually someone in Honiara or Suva — will reply within a
          business day.
        </p>
        <div className="mt-5 flex flex-wrap gap-3">
          <a href="mailto:hello@islebnb.com" className="btn-primary">
            <Icon name="mail" size={16} />
            hello@islebnb.com
          </a>
          <Link to="/explore" className="btn-outline">
            Back to exploring
          </Link>
        </div>
      </div>
    </div>
  )
}
