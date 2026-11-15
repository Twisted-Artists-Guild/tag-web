import { isPlaceholderAddress, sanitizeDescription, toStateCode } from './venue-profile.js'
import { getActivePictureUrl } from './venue-form.js'
// A relative import, because the unit tests run in plain Node, which does not know the "@/" alias.
// eslint-disable-next-line import/no-relative-parent-imports
import { sanitizeCardHtml, stripHtmlText } from '../components/security/sanitize.js'

// Everything the public venue page shows is decided here, from what the API returns, so the page itself only draws it.
// All text from owners and contacts is kept as plain text for React to escape; only the venue name and description are
// HTML, and both go through the site's sanitizer. Links are only built from addresses that are safe to open.

const MAX_EVENTS = 10
const SEO_DESCRIPTION_LENGTH = 160

const text = (value) => String(value ?? '').trim()

// An http or https address, or '' when the value is not one. A bare "example.com" is read as https://example.com.
export function safeWebUrl(value) {
  const raw = text(value)
  if (!raw) return ''
  const candidate = /^[a-z][a-z0-9+.-]*:/i.test(raw) ? raw : `https://${raw}`
  try {
    const url = new URL(candidate)
    const isWeb = url.protocol === 'https:' || url.protocol === 'http:'
    return isWeb && url.hostname.includes('.') && !url.username && !url.password ? url.href : ''
  } catch {
    return ''
  }
}

// A short readable form of a web address, for link text.
export function displayUrl(href) {
  try {
    const url = new URL(href)
    const path = url.pathname === '/' ? '' : url.pathname.replace(/\/$/, '')
    return `${url.hostname.replace(/^www\./, '')}${path}`
  } catch {
    return text(href)
  }
}

export function safeTelHref(value) {
  const compact = text(value).replace(/[^\d+]/g, '')
  const digits = compact.replace(/\D/g, '')
  if (digits.length < 7 || digits.length > 15) return ''
  return `tel:${compact.startsWith('+') ? '+' : ''}${digits}`
}

export function safeMailtoHref(value) {
  const email = text(value)
  return /^[^\s@<>"']+@[^\s@<>"'.]+(\.[^\s@<>"'.]+)+$/.test(email) ? `mailto:${email}` : ''
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

// "Sat, Nov 14, 2026 · 7:30 PM" from the wall-clock time in the API value, without converting between time zones, so the
// server and the browser always show the same text.
export function formatEventWhen(value) {
  const match = /^(\d{4})-(\d{2})-(\d{2})[T ](\d{2}):(\d{2})/.exec(text(value))
  if (!match) return ''
  const [, year, month, day, hour, minute] = match.map(Number)
  if (month < 1 || month > 12 || day < 1 || day > 31 || hour > 23 || minute > 59) return ''
  const weekday = WEEKDAYS[new Date(Date.UTC(year, month - 1, day)).getUTCDay()]
  const hour12 = hour % 12 === 0 ? 12 : hour % 12
  return `${weekday}, ${MONTHS[month - 1]} ${day}, ${year} · ${hour12}:${String(minute).padStart(2, '0')} ${hour < 12 ? 'AM' : 'PM'}`
}

// Keeps only this venue's events that have not ended. The API already filters like this, but an older API ignores the
// filter and returns every venue's events, so the page checks again rather than show another venue's events.
// Times are compared as wall-clock text (YYYY-MM-DDTHH:mm), the same way they are shown.
export function selectVenueEvents(rows, venueId, now = new Date()) {
  const today = now.toISOString().slice(0, 16)
  const clock = (value) => (/^\d{4}-\d{2}-\d{2}[T ]\d{2}:\d{2}/.test(text(value)) ? text(value).replace(' ', 'T').slice(0, 16) : '')
  return (Array.isArray(rows) ? rows : []).filter((row) => {
    if (!row || Number(row.venueID ?? row.VenueID) !== Number(venueId)) return false
    const start = clock(row.startTime ?? row.StartTime)
    const end = clock(row.endTime ?? row.EndTime)
    // A zero or missing end time (before the start) means the event has no usable end, so its start decides.
    const finish = end && end >= start ? end : start
    return Boolean(finish) && finish >= today
  })
}

export function buildEventItems(rows) {
  const list = Array.isArray(rows) ? rows : []
  return list
    .map((row) => ({
      id: row?.eventID ?? row?.EventID ?? null,
      title: text(row?.title ?? row?.Title),
      startTime: text(row?.startTime ?? row?.StartTime),
      artistName: text(row?.artist?.title ?? row?.Artist?.Title ?? row?.artist?.Title ?? row?.Artist?.title),
    }))
    .filter((item) => item.title && item.id !== null)
    .map((item) => ({ ...item, when: formatEventWhen(item.startTime) }))
    .sort((left, right) => left.startTime.localeCompare(right.startTime))
    .slice(0, MAX_EVENTS)
}

// Sorts the public contact rows from the contacts API into phones, emails, websites and social links. Only rows that are
// safe to show are kept, and every row is shown at most once.
export function groupVenueContacts(rows) {
  const grouped = { phones: [], emails: [], websites: [], social: [], hours: '' }
  const seen = new Set()
  const keep = (key) => {
    if (seen.has(key)) return false
    seen.add(key)
    return true
  }

  for (const row of Array.isArray(rows) ? rows : []) {
    if (!row || row.isPrivate === true) continue
    const type = text(row.contactType).toLowerCase()
    const value = text(row.value)

    if (type === 'phone' && value) {
      if (keep(`phone:${value.replace(/\D/g, '')}`)) grouped.phones.push({ label: text(row.phoneLabel || row.label) || 'Phone', text: value, href: safeTelHref(value) })
    } else if (type === 'email' && value) {
      if (keep(`email:${value.toLowerCase()}`)) grouped.emails.push({ label: text(row.label) || 'Email', text: value, href: safeMailtoHref(value) })
    } else if (type === 'url') {
      const href = safeWebUrl(value)
      if (!href || !keep(`url:${href}`)) continue
      const isWebsite = text(row.category).toLowerCase() === 'website'
      const label = isWebsite ? (text(row.label) || 'Website') : (text(row.label) || text(row.category) || displayUrl(href))
      const item = { label, text: text(row.handle) || displayUrl(href), href }
      ;(isWebsite ? grouped.websites : grouped.social).push(item)
    } else if (type === 'address' && !grouped.hours) {
      grouped.hours = text(row.address?.hours)
    }
  }

  return grouped
}

// The street address of the venue, or null while it is still the placeholder from slug reservation.
export function buildVenueAddress(venue) {
  const address = venue?.address ?? venue?.Address
  if (!address || isPlaceholderAddress(address)) return null

  const line1 = text(address.addressLine1 ?? address.AddressLine1)
  const line2 = text(address.addressLine2 ?? address.AddressLine2)
  const city = text(address.city ?? address.City)
  const rawState = text(address.state ?? address.State)
  const state = toStateCode(rawState) || rawState
  const zip = text(address.zipCode ?? address.ZipCode)
  if (!line1 && !city) return null

  const cityLine = [city, [state, zip].filter(Boolean).join(' ')].filter(Boolean).join(', ')
  const full = [line1, line2, cityLine].filter(Boolean).join(', ')
  return {
    line1,
    line2,
    cityLine,
    city,
    state,
    zip,
    full,
    hours: text(address.operationHours ?? address.OperationHours),
    mapUrl: `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(full)}`,
  }
}

function namedItems(raw) {
  return (Array.isArray(raw) ? raw : [])
    .map((item) => ({ name: text(item?.name ?? item?.Name), slug: text(item?.slug ?? item?.Slug) }))
    .filter((item) => item.name)
}

function truncate(value, length) {
  const plain = text(value).replace(/\s+/g, ' ')
  if (plain.length <= length) return plain
  return `${plain.slice(0, length - 1).trimEnd()}…`
}

// Page title, description and the image to share, for search results and link previews.
export function buildVenueSeo(view) {
  const where = view.address?.cityLine ? ` in ${view.address.cityLine}` : ''
  const kind = view.categories.length > 0 ? view.categories.map((category) => category.name).join(', ') : 'Event space'
  const description = view.descriptionText
    ? truncate(view.descriptionText, SEO_DESCRIPTION_LENGTH)
    : truncate(`${view.name}: ${kind}${where}. See the venue's amenities, location and contact details on the Twisted Artists Guild.`, SEO_DESCRIPTION_LENGTH)

  return { title: view.name, description, image: view.images.cover || view.images.profile || view.images.logo || '' }
}

// schema.org data for search engines. Only for venues the public can see, and only with facts the venue has entered.
export function buildVenueJsonLd(view, { siteUrl = '' } = {}) {
  if (!view.isPublic) return null

  const data = { '@context': 'https://schema.org', '@type': 'EventVenue', name: view.name }
  if (siteUrl) data.url = `${String(siteUrl).replace(/\/$/, '')}/venue/${view.slug}`
  if (view.descriptionText) data.description = truncate(view.descriptionText, 300)
  if (view.seo.image) data.image = view.seo.image
  if (view.address) {
    data.address = {
      '@type': 'PostalAddress',
      streetAddress: [view.address.line1, view.address.line2].filter(Boolean).join(', '),
      addressLocality: view.address.city,
      addressRegion: view.address.state,
      postalCode: view.address.zip,
      addressCountry: 'US',
    }
  }
  const phone = view.contacts.phones[0]
  if (phone) data.telephone = phone.text
  const sameAs = [...view.contacts.websites, ...view.contacts.social].map((item) => item.href)
  if (sameAs.length > 0) data.sameAs = sameAs
  return data
}

// JSON for a <script type="application/ld+json"> tag. "<" is escaped so no text can close the tag early.
export function serializeJsonLd(data) {
  return data ? JSON.stringify(data).replace(/</g, '\\u003c') : ''
}

// The images to show: the active pictures the owner chose, or the newest file in the folder for venues that have not
// chosen. `folderMedia` is what the media folders listing found (profile, cover and gallery files).
export function resolveVenueImages(venue, folderMedia = {}, name = 'Venue') {
  const gallery = (Array.isArray(folderMedia.gallery) ? folderMedia.gallery : [])
    .filter((item) => text(item?.url))
    .map((item, index) => ({ url: text(item.url), alt: `${name} photo ${index + 1}` }))

  return {
    cover: getActivePictureUrl(venue, 'cover') || text(folderMedia.cover?.url),
    profile: getActivePictureUrl(venue, 'profile') || text(folderMedia.profile?.url),
    logo: text(venue?.logoPic?.url ?? venue?.logoPic?.URL ?? venue?.LogoPic?.url ?? venue?.LogoPic?.URL),
    gallery,
  }
}

// The whole page, as plain data. `contacts` are the rows of the public contacts call, `events` the upcoming events.
export function buildVenueProfileView({ venue, contacts, events, folderMedia, siteUrl = '' } = {}) {
  const data = venue || {}
  const name = stripHtmlText(data.name ?? data.Name) || 'Venue'
  const nameRichtext = text(data.nameRichtext ?? data.NameRichtext) || name
  const isPublished = Boolean(data.isPublished ?? data.IsPublished)
  const isBlocked = Boolean(data.isModerationBlocked ?? data.IsModerationBlocked)
  const descriptionHtml = sanitizeDescription(data.descriptionRichtext ?? data.DescriptionRichtext)
  const address = buildVenueAddress(data)
  const grouped = groupVenueContacts(contacts)
  const hasOwner = data.hasOwner ?? data.HasOwner

  const view = {
    venueId: Number(data.venueID ?? data.VenueID ?? 0) || 0,
    slug: text(data.slug ?? data.Slug) || name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''),
    name,
    nameHtml: sanitizeCardHtml(nameRichtext),
    isPublic: isPublished && !isBlocked,
    // Only the venue's owners and staff can open a venue that is not public; they see it as a preview.
    isPreview: !(isPublished && !isBlocked),
    previewNote: isBlocked
      ? 'This venue is blocked by moderation, so the public cannot see it.'
      : (isPublished ? '' : 'This venue is not published yet, so the public cannot see it.'),
    descriptionHtml,
    descriptionText: stripHtmlText(descriptionHtml),
    categories: namedItems(data.categories ?? data.Categories),
    tags: (Array.isArray(data.tags ?? data.Tags) ? (data.tags ?? data.Tags) : []).map(text).filter(Boolean),
    regions: namedItems(data.regions ?? data.Regions),
    address,
    contacts: grouped,
    hours: address?.hours || grouped.hours,
    events: buildEventItems(events),
    // Unknown (an older API) counts as owned, so nobody is asked to get in touch by mistake.
    showClaimPrompt: hasOwner === false,
    images: resolveVenueImages(data, folderMedia, name),
  }

  view.hasContacts = view.contacts.phones.length + view.contacts.emails.length + view.contacts.websites.length + view.contacts.social.length > 0
  view.seo = buildVenueSeo(view)
  view.jsonLd = buildVenueJsonLd(view, { siteUrl })
  return view
}
