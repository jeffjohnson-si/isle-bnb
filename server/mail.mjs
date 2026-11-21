/**
 * Outbound email.
 *
 * Without BREVO_API_KEY this logs instead of sending, so development and demos
 * work offline and nothing is silently dropped — every message is printed with
 * its recipient and subject.
 *
 * With BREVO_API_KEY set it posts to Brevo's transactional endpoint. MAIL_FROM
 * must be a sender Brevo has verified (an address, or a domain with DKIM).
 */
const API_KEY = process.env.BREVO_API_KEY ?? ''
const MAIL_FROM = process.env.MAIL_FROM ?? 'Isle BnB <bookings@islebnb.local>'
const OPS_INBOX = process.env.OPS_INBOX ?? ''
const SITE_URL = process.env.SITE_URL ?? 'http://localhost:5180'

const enabled = Boolean(API_KEY)

function parseFrom(value) {
  const match = value.match(/^(.*)<(.+)>$/)
  if (!match) return { name: 'Isle BnB', email: value.trim() }
  return { name: match[1].trim() || 'Isle BnB', email: match[2].trim() }
}

async function sendBrevo({ to, subject, text, html }) {
  const response = await fetch('https://api.brevo.com/v3/smtp/email', {
    method: 'POST',
    headers: {
      'api-key': API_KEY,
      'content-type': 'application/json',
      accept: 'application/json',
    },
    body: JSON.stringify({
      sender: parseFrom(MAIL_FROM),
      to: to.map((address) => ({ email: address })),
      subject,
      textContent: text,
      htmlContent: html,
    }),
  })

  if (!response.ok) {
    const detail = await response.text().catch(() => '')
    throw new Error(`Brevo rejected the message (${response.status}): ${detail.slice(0, 200)}`)
  }
}

/**
 * Never throws: a failed notification must not fail the booking that caused it.
 * Failures are logged so they can be retried or chased.
 */
export async function sendMail({ to, subject, text, html }) {
  const recipients = (Array.isArray(to) ? to : [to]).filter(Boolean)
  if (!recipients.length) return { sent: false, reason: 'no recipient' }

  if (!enabled) {
    console.log(`[mail:dev] to=${recipients.join(',')} subject="${subject}"`)
    return { sent: false, reason: 'no api key' }
  }

  try {
    await sendBrevo({ to: recipients, subject, text, html: html ?? `<pre>${text}</pre>` })
    console.log(`[mail] sent to=${recipients.join(',')} subject="${subject}"`)
    return { sent: true }
  } catch (error) {
    console.error(`[mail] failed to=${recipients.join(',')}:`, error.message)
    return { sent: false, reason: error.message }
  }
}

export const mailConfig = {
  enabled,
  from: MAIL_FROM,
  opsInbox: OPS_INBOX,
  siteUrl: SITE_URL,
}

const layout = (body) => `<!doctype html><html><body style="margin:0;background:#faf6ef;padding:24px;font-family:system-ui,-apple-system,'Segoe UI',sans-serif;color:#07262a">
  <div style="max-width:560px;margin:0 auto;background:#fff;border-radius:16px;padding:28px">
    ${body}
    <p style="margin-top:28px;font-size:12px;color:#07262a66">Isle BnB — island stays across the Pacific. Guests pay the property on arrival.</p>
  </div></body></html>`

const row = (label, value) =>
  `<tr><td style="padding:4px 12px 4px 0;color:#07262a88;font-size:14px">${label}</td><td style="padding:4px 0;font-size:14px;font-weight:600">${value}</td></tr>`

export function bookingEmails(booking) {
  const nights = `${booking.nights} night${booking.nights === 1 ? '' : 's'}`
  const total =
    booking.total > 0
      ? `${booking.currency} ${booking.total.toLocaleString('en-US')} due on arrival`
      : 'Rate confirmed by the property'

  const summary = `<table style="border-collapse:collapse">
    ${row('Stay', booking.listing_name)}
    ${row('Where', `${booking.island}`)}
    ${row('Dates', `${booking.check_in} → ${booking.check_out} (${nights})`)}
    ${row('Guests', booking.guests)}
    ${row('Total', total)}
    ${row('Reference', booking.reference)}
  </table>`

  return [
    {
      to: booking.guest_email,
      subject: `Booking request sent — ${booking.listing_name} (${booking.reference})`,
      text: `Thanks ${booking.guest_name}, your request is with ${booking.listing_name}.\n\n${booking.listing_name}\n${booking.check_in} to ${booking.check_out} (${nights})\n${booking.guests} guests\n${total}\nReference ${booking.reference}\n\nYou have not been charged. The property will confirm by email or phone.`,
      html: layout(
        `<h1 style="font-size:20px;margin:0 0 12px">Booking request sent</h1>
         <p style="font-size:14px;line-height:1.6">Thanks ${booking.guest_name}, your request is with <strong>${booking.listing_name}</strong>. You have not been charged — the property will confirm by email or phone.</p>
         ${summary}`,
      ),
    },
    OPS_INBOX && {
      to: OPS_INBOX,
      subject: `New booking — ${booking.listing_name} (${booking.reference})`,
      text: `New booking request.\n\n${booking.listing_name}\n${booking.check_in} to ${booking.check_out} (${nights})\n${booking.guests} guests\n${total}\nGuest: ${booking.guest_name} <${booking.guest_email}> ${booking.guest_phone}\nNotes: ${booking.notes ?? 'none'}`,
      html: layout(
        `<h1 style="font-size:20px;margin:0 0 12px">New booking request</h1>${summary}
         <p style="font-size:14px;line-height:1.6">Guest: ${booking.guest_name} — ${booking.guest_email} · ${booking.guest_phone}<br/>Notes: ${booking.notes ?? 'none'}</p>`,
      ),
    },
  ].filter(Boolean)
}

export function applicationEmails(application) {
  return [
    {
      to: application.email,
      subject: `We have your application — ${application.property_name}`,
      text: `Thanks ${application.contact_name}. We have your listing for ${application.property_name} (${application.island}). Reference ${application.reference}. Our team will review it and get back to you.`,
      html: layout(
        `<h1 style="font-size:20px;margin:0 0 12px">Application received</h1>
         <p style="font-size:14px;line-height:1.6">Thanks ${application.contact_name}. We have your listing for <strong>${application.property_name}</strong>.</p>
         <table style="border-collapse:collapse">${row('Reference', application.reference)}${row('Island', application.island)}${row('Rate', `${application.currency} ${application.nightly_rate}`)}</table>`,
      ),
    },
    OPS_INBOX && {
      to: OPS_INBOX,
      subject: `Host application — ${application.property_name} (${application.reference})`,
      text: `Host application.\n\n${application.property_name} (${application.type})\n${application.island} — ${application.area}\nRate ${application.currency} ${application.nightly_rate}\nContact: ${application.contact_name} ${application.email} ${application.phone}\n${application.description}`,
      html: layout(
        `<h1 style="font-size:20px;margin:0 0 12px">Host application</h1>
         <table style="border-collapse:collapse">${row('Property', application.property_name)}${row('Type', application.type)}${row('Island', application.island)}${row('Rate', `${application.currency} ${application.nightly_rate}`)}${row('Reference', application.reference)}</table>
         <p style="font-size:14px;line-height:1.6">Contact: ${application.contact_name} — ${application.email} · ${application.phone}</p>`,
      ),
    },
  ].filter(Boolean)
}

export function claimEmails(claim) {
  return [
    {
      to: claim.email,
      subject: `Claim received — ${claim.listing_name} (${claim.reference})`,
      text: `Thanks ${claim.claimant_name}. We have your claim for ${claim.listing_name}. Reference ${claim.reference}. We verify claims by calling the property on its public number, so expect a call before the listing is handed over.`,
      html: layout(
        `<h1 style="font-size:20px;margin:0 0 12px">Claim received</h1>
         <p style="font-size:14px;line-height:1.6">Thanks ${claim.claimant_name}. We have your claim for <strong>${claim.listing_name}</strong>. We verify claims by calling the property on its public number, so expect a call before the listing is handed over.</p>
         <table style="border-collapse:collapse">${row('Reference', claim.reference)}${row('Role', claim.role)}</table>`,
      ),
    },
    OPS_INBOX && {
      to: OPS_INBOX,
      subject: `Listing claim — ${claim.listing_name} (${claim.reference})`,
      text: `Claim for ${claim.listing_name}.\n\n${claim.claimant_name} (${claim.role})\n${claim.email} ${claim.phone}\nProof: ${claim.proof_type} — ${claim.proof_detail ?? 'none given'}\nReference ${claim.reference}`,
      html: layout(
        `<h1 style="font-size:20px;margin:0 0 12px">Listing claim</h1>
         <table style="border-collapse:collapse">${row('Listing', claim.listing_name)}${row('Claimant', claim.claimant_name)}${row('Role', claim.role)}${row('Proof', claim.proof_type)}${row('Reference', claim.reference)}</table>
         <p style="font-size:14px;line-height:1.6">${claim.email} · ${claim.phone}<br/>${claim.proof_detail ?? ''}</p>`,
      ),
    },
  ].filter(Boolean)
}

/**
 * Sent when the team verifies a claim: the owner sets a password and can then
 * publish rates, copy and rooms for their property.
 */
export function hostInviteEmails(host, claim) {
  const link = `${SITE_URL.replace(/\/$/, '')}/#/host/activate?token=${host.invite_token}`
  const listingName = claim.listing_name ?? 'your property'

  return [
    {
      to: host.email,
      subject: `${listingName} is yours to manage on Isle BnB`,
      text: `Hello ${host.name || 'there'}. We have verified that you look after ${listingName}, so the listing is now yours.\n\nSet your password here (the link is single use):\n${link}\n\nOnce you are in you can publish your nightly rate, update the description and see booking requests. Guests still pay you on arrival — Isle BnB takes no commission and no card details.`,
      html: layout(
        `<h1 style="font-size:20px;margin:0 0 12px">${listingName} is yours to manage</h1>
         <p style="font-size:14px;line-height:1.6">Hello ${host.name || 'there'}. We have verified that you look after <strong>${listingName}</strong>, so the listing is now yours.</p>
         <p style="margin:18px 0"><a href="${link}" style="background:#0b3f42;color:#faf6ef;padding:12px 20px;border-radius:999px;text-decoration:none;font-size:14px;font-weight:600">Set your password</a></p>
         <p style="font-size:13px;line-height:1.6;color:#07262a99">This link can be used once. You can then publish your rate, update the description and see booking requests. Guests pay you on arrival — no commission, no card details.</p>
         <p style="font-size:12px;color:#07262a66;word-break:break-all">${link}</p>`,
      ),
    },
    OPS_INBOX && {
      to: OPS_INBOX,
      subject: `Host access granted — ${listingName} (${host.email})`,
      text: `Host access granted for ${listingName}.\n\n${host.name ?? ''} <${host.email}>\nInvitation: ${link}`,
      html: layout(
        `<h1 style="font-size:20px;margin:0 0 12px">Host access granted</h1>
         <p style="font-size:14px;line-height:1.6"><strong>${listingName}</strong> is now managed by ${host.name ?? host.email} (${host.email}).</p>
         <p style="font-size:12px;color:#07262a66;word-break:break-all">${link}</p>`,
      ),
    },
  ].filter(Boolean)
}

/** Sent when an owner submits a listing they created themselves. */
export function listingSubmittedEmails(listing, host) {
  const detail = `${listing.name} — ${listing.area}, ${listing.island} (${listing.currency} ${listing.price || 'rate on request'})`

  return [
    {
      to: host.email,
      subject: `We have your listing — ${listing.name}`,
      text: `Thanks ${host.name ?? ''}. ${detail} is with our team for review.\n\nWe check that the photos and details match the property, usually within two business days. You can keep editing it in your dashboard while it is in review.`,
      html: layout(
        `<h1 style="font-size:20px;margin:0 0 12px">Listing received</h1>
         <p style="font-size:14px;line-height:1.6">Thanks ${host.name ?? ''}. <strong>${listing.name}</strong> is with our team for review — usually within two business days. You can keep editing it in your dashboard while it is in review.</p>
         <table style="border-collapse:collapse">${row('Where', `${listing.area}, ${listing.island}`)}${row('Rate', `${listing.currency} ${listing.price || 'on request'}`)}${row('Photos', `${JSON.parse(listing.images).length}`)}</table>`,
      ),
    },
    OPS_INBOX && {
      to: OPS_INBOX,
      subject: `Listing to review — ${listing.name} (${host.email})`,
      text: `New host listing.\n\n${detail}\nPhotos: ${listing.images}\nSubmitted by ${host.name ?? ''} <${host.email}>\n\nReview it in the team dashboard.`,
      html: layout(
        `<h1 style="font-size:20px;margin:0 0 12px">Listing to review</h1>
         <p style="font-size:14px;line-height:1.6"><strong>${listing.name}</strong> — ${listing.area}, ${listing.island}<br/>${listing.currency} ${listing.price || 'rate on request'} · submitted by ${host.name ?? ''} (${host.email})</p>`,
      ),
    },
  ].filter(Boolean)
}

/** Sent when the team approves a listing the owner created. */
export function listingLiveEmails(listing, host) {
  return [
    {
      to: host.email,
      subject: `${listing.name} is live on Isle BnB`,
      text: `Good news — ${listing.name} is now live and guests can request it. You can update rates, photos and text in your dashboard at any time. Guests pay you on arrival; Isle BnB takes no commission.`,
      html: layout(
        `<h1 style="font-size:20px;margin:0 0 12px">${listing.name} is live</h1>
         <p style="font-size:14px;line-height:1.6">Guests can now find and request it. You can change rates, photos and text in your dashboard at any time.</p>`,
      ),
    },
  ].filter(Boolean)
}
