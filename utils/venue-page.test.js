import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
  buildEventItems,
  buildVenueAddress,
  buildVenueJsonLd,
  buildVenueProfileView,
  displayUrl,
  formatEventWhen,
  groupVenueContacts,
  resolveVenueImages,
  safeMailtoHref,
  safeTelHref,
  safeWebUrl,
  selectVenueEvents,
  serializeJsonLd,
} from './venue-page.js'

const fullVenue = () => ({
  venueID: 7,
  slug: 'harbor-lights-theater',
  name: 'Harbor Lights Theater',
  nameRichtext: '<p>Harbor <strong>Lights</strong> Theater</p>',
  descriptionRichtext: '<p>A restored theater with <strong>a proscenium stage</strong> and a lobby bar.</p>',
  isPublished: true,
  isModerationBlocked: false,
  hasOwner: true,
  address: { addressLine1: '101 Bay Street', addressLine2: 'Suite 4', city: 'Savannah', state: 'Georgia', zipCode: '31401', operationHours: 'Mon-Fri 10am-6pm' },
  categories: [{ name: 'Theaters', slug: 'theaters' }, { name: 'Bars', slug: 'bars' }],
  tags: ['parking', 'stage'],
  regions: [{ name: 'Georgia', slug: 'georgia' }],
  profilePic: { url: 'https://store.example/p.jpg' },
  coverPic: { url: 'https://store.example/c.jpg' },
  logoPic: { url: 'https://store.example/l.png' },
})

const contactRows = () => [
  { contactType: 'phone', value: '(912) 555-0100', phoneLabel: 'Box office', isPrivate: false },
  { contactType: 'email', value: 'hello@example.com', label: 'Bookings', isPrivate: false },
  { contactType: 'url', category: 'website', value: 'https://example.com', isPrivate: false },
  { contactType: 'url', category: 'social', label: 'Instagram', value: 'https://instagram.com/harborlights', handle: '@harborlights', isPrivate: false },
  { contactType: 'address', address: { hours: 'Daily 9-5' }, isPrivate: false },
]

const eventRows = () => [
  { eventID: 2, title: 'Later show', startTime: '2026-12-01T20:00:00', artist: { title: 'Band B' } },
  { eventID: 1, title: 'Sooner show', startTime: '2026-11-20T19:30:00', artist: { title: 'Band A' } },
]

test('a full venue shows every section', () => {
  const view = buildVenueProfileView({ venue: fullVenue(), contacts: contactRows(), events: eventRows(), siteUrl: 'https://tag.example' })

  assert.equal(view.name, 'Harbor Lights Theater')
  assert.match(view.nameHtml, /<strong>Lights<\/strong>/)
  assert.match(view.descriptionHtml, /proscenium stage/)
  assert.deepEqual(view.categories.map((category) => category.slug), ['theaters', 'bars'])
  assert.deepEqual(view.tags, ['parking', 'stage'])
  assert.deepEqual(view.regions, [{ name: 'Georgia', slug: 'georgia' }])
  assert.equal(view.address.cityLine, 'Savannah, GA 31401')
  assert.equal(view.address.line2, 'Suite 4')
  assert.equal(view.hours, 'Mon-Fri 10am-6pm')
  assert.equal(view.hasContacts, true)
  assert.equal(view.events.length, 2)
  assert.equal(view.isPublic, true)
  assert.equal(view.isPreview, false)
  assert.equal(view.showClaimPrompt, false)
  assert.equal(view.images.cover, 'https://store.example/c.jpg')
  assert.equal(view.images.profile, 'https://store.example/p.jpg')
  assert.equal(view.images.logo, 'https://store.example/l.png')
  assert.ok(view.jsonLd)
})

test('a minimal venue with only a name shows nothing else and does not break', () => {
  const view = buildVenueProfileView({ venue: { venueID: 1, name: 'Bare Hall', isPublished: true } })

  assert.equal(view.name, 'Bare Hall')
  assert.equal(view.descriptionHtml, '')
  assert.deepEqual([view.categories, view.tags, view.regions, view.events], [[], [], [], []])
  assert.equal(view.address, null)
  assert.equal(view.hours, '')
  assert.equal(view.hasContacts, false)
  assert.deepEqual(view.images, { cover: '', profile: '', logo: '', gallery: [] })
  assert.equal(view.showClaimPrompt, false)
  assert.ok(view.seo.description.includes('Bare Hall'))
})

test('nothing at all still gives a safe page model', () => {
  for (const input of [undefined, {}, { venue: null }, { venue: {}, contacts: 'x', events: 5 }]) {
    const view = buildVenueProfileView(input)
    assert.equal(view.name, 'Venue')
    assert.equal(view.hasContacts, false)
    assert.deepEqual(view.events, [])
    assert.equal(view.isPublic, false)
  }
})

test('an unowned venue asks visitors to get in touch, and an unknown owner does not', () => {
  assert.equal(buildVenueProfileView({ venue: { ...fullVenue(), hasOwner: false } }).showClaimPrompt, true)
  const pascal = fullVenue()
  delete pascal.hasOwner
  assert.equal(buildVenueProfileView({ venue: { ...pascal, HasOwner: false } }).showClaimPrompt, true)
  assert.equal(buildVenueProfileView({ venue: { ...fullVenue(), hasOwner: true } }).showClaimPrompt, false)
  assert.equal(buildVenueProfileView({ venue: pascal }).showClaimPrompt, false)
})

test('a venue that is not public is a preview, with a reason', () => {
  const draft = buildVenueProfileView({ venue: { ...fullVenue(), isPublished: false } })
  assert.equal(draft.isPreview, true)
  assert.equal(draft.isPublic, false)
  assert.match(draft.previewNote, /not published yet/)

  const blocked = buildVenueProfileView({ venue: { ...fullVenue(), isModerationBlocked: true } })
  assert.equal(blocked.isPreview, true)
  assert.match(blocked.previewNote, /blocked by moderation/)

  const live = buildVenueProfileView({ venue: fullVenue() })
  assert.equal(live.previewNote, '')
})

test('no structured data is made for a venue the public cannot see', () => {
  assert.equal(buildVenueProfileView({ venue: { ...fullVenue(), isPublished: false }, siteUrl: 'https://tag.example' }).jsonLd, null)
  assert.equal(buildVenueProfileView({ venue: { ...fullVenue(), isModerationBlocked: true } }).jsonLd, null)
})

test('the description and the name are sanitized', () => {
  const view = buildVenueProfileView({
    venue: {
      name: 'Evil Hall',
      nameRichtext: '<p>Evil <script>alert(1)</script><img src=x onerror=alert(1)>Hall</p>',
      descriptionRichtext: '<p onclick="alert(1)">Hi <a href="javascript:alert(1)">link</a><iframe src="https://evil.example"></iframe><style>*{}</style></p>',
      isPublished: true,
    },
  })

  for (const html of [view.nameHtml, view.descriptionHtml]) {
    assert.doesNotMatch(html, /<script|<img|<iframe|<style|onerror|onclick|javascript:/i)
  }
  assert.match(view.descriptionHtml, /Hi/)
})

test('plain text fields are not changed into HTML, so React escapes them', () => {
  const venue = { ...fullVenue(), tags: ['<b>x</b>'], categories: [{ name: '<i>Cat</i>', slug: 'c' }], address: { addressLine1: '<script>1 Main</script>', city: 'A&B', state: 'GA', zipCode: '30301' } }
  const view = buildVenueProfileView({ venue })
  assert.deepEqual(view.tags, ['<b>x</b>'])
  assert.equal(view.categories[0].name, '<i>Cat</i>')
  assert.equal(view.address.line1, '<script>1 Main</script>')
})

test('the address hides the placeholder, turns a state name into its code and builds a map link', () => {
  assert.equal(buildVenueAddress({ address: { addressLine1: 'Pending venue address', city: 'Pending' } }), null)
  assert.equal(buildVenueAddress({ address: { addressLine1: '', city: '' } }), null)
  assert.equal(buildVenueAddress({}), null)
  const address = buildVenueAddress({ address: { addressLine1: '5 Oak Dr', city: 'Charlotte', state: 'north carolina', zipCode: '28202' } })
  assert.equal(address.cityLine, 'Charlotte, NC 28202')
  assert.equal(address.full, '5 Oak Dr, Charlotte, NC 28202')
  assert.equal(address.mapUrl, 'https://www.google.com/maps/search/?api=1&query=5%20Oak%20Dr%2C%20Charlotte%2C%20NC%2028202')
})

test('hours come from the venue address, then from a public address contact', () => {
  const withBoth = buildVenueProfileView({ venue: fullVenue(), contacts: contactRows() })
  assert.equal(withBoth.hours, 'Mon-Fri 10am-6pm')
  const venue = fullVenue()
  delete venue.address.operationHours
  assert.equal(buildVenueProfileView({ venue, contacts: contactRows() }).hours, 'Daily 9-5')
  assert.equal(buildVenueProfileView({ venue, contacts: [] }).hours, '')
})

test('contacts are grouped, labelled and linked', () => {
  const grouped = groupVenueContacts(contactRows())
  assert.deepEqual(grouped.phones, [{ label: 'Box office', text: '(912) 555-0100', href: 'tel:9125550100' }])
  assert.deepEqual(grouped.emails, [{ label: 'Bookings', text: 'hello@example.com', href: 'mailto:hello@example.com' }])
  assert.deepEqual(grouped.websites, [{ label: 'Website', text: 'example.com', href: 'https://example.com/' }])
  assert.deepEqual(grouped.social, [{ label: 'Instagram', text: '@harborlights', href: 'https://instagram.com/harborlights' }])
  assert.equal(grouped.hours, 'Daily 9-5')
})

test('private, empty, duplicate and unsafe contacts are left out', () => {
  const grouped = groupVenueContacts([
    { contactType: 'phone', value: '555-123-4567', isPrivate: true },
    { contactType: 'email', value: '', isPrivate: false },
    { contactType: 'url', category: 'website', value: 'javascript:alert(1)' },
    { contactType: 'url', category: 'website', value: 'data:text/html,<script>1</script>' },
    { contactType: 'url', category: 'website', value: 'https://user:pw@example.com' },
    { contactType: 'url', category: 'website', value: 'https://example.com' },
    { contactType: 'url', category: 'website', value: 'https://example.com/' },
    { contactType: 'phone', value: '(912) 555-0100' },
    { contactType: 'phone', value: '912.555.0100' },
    null,
    {},
  ])
  assert.equal(grouped.websites.length, 1)
  assert.equal(grouped.phones.length, 1)
  assert.deepEqual([grouped.emails.length, grouped.social.length], [0, 0])
})

test('a phone or email that cannot be linked is still shown as text', () => {
  const grouped = groupVenueContacts([{ contactType: 'phone', value: 'ask at the door' }, { contactType: 'email', value: 'not an email' }])
  assert.deepEqual(grouped.phones, [{ label: 'Phone', text: 'ask at the door', href: '' }])
  assert.deepEqual(grouped.emails, [{ label: 'Email', text: 'not an email', href: '' }])
})

test('web links only open http and https addresses', () => {
  assert.equal(safeWebUrl('https://example.com/a?b=1'), 'https://example.com/a?b=1')
  assert.equal(safeWebUrl('http://example.com'), 'http://example.com/')
  assert.equal(safeWebUrl('example.com/page'), 'https://example.com/page')
  assert.equal(safeWebUrl('www.example.com'), 'https://www.example.com/')
  for (const bad of ['', undefined, 'javascript:alert(1)', 'ftp://example.com', 'data:text/html,hi', 'mailto:a@b.co', 'https://localhost', 'https://', 'not a url', 'https://u:p@example.com']) {
    assert.equal(safeWebUrl(bad), '', String(bad))
  }
})

test('link text is the host and path without www', () => {
  assert.equal(displayUrl('https://www.example.com/'), 'example.com')
  assert.equal(displayUrl('https://example.com/events/'), 'example.com/events')
})

test('tel and mailto links are only made from plausible numbers and addresses', () => {
  assert.equal(safeTelHref('(912) 555-0100'), 'tel:9125550100')
  assert.equal(safeTelHref('+1 912 555 0100'), 'tel:+19125550100')
  for (const bad of ['', '123', 'call us', '1'.repeat(16)]) assert.equal(safeTelHref(bad), '', bad)
  assert.equal(safeMailtoHref('a@b.co'), 'mailto:a@b.co')
  for (const bad of ['', 'a@b', 'a b@c.com', '<x>@y.com', 'a@b..com', '"a@b.com']) assert.equal(safeMailtoHref(bad), '', bad)
})

test('event times are shown as the wall-clock time, the same on the server and in the browser', () => {
  assert.equal(formatEventWhen('2026-11-14T19:30:00'), 'Sat, Nov 14, 2026 · 7:30 PM')
  assert.equal(formatEventWhen('2026-11-14T00:05:00'), 'Sat, Nov 14, 2026 · 12:05 AM')
  assert.equal(formatEventWhen('2026-11-14T12:00:00Z'), 'Sat, Nov 14, 2026 · 12:00 PM')
  for (const bad of ['', undefined, 'soon', '2026-13-01T10:00', '2026-11-14']) assert.equal(formatEventWhen(bad), '', String(bad))
})

test('only this venue\'s events that have not ended are kept, even if the API returned more', () => {
  const now = new Date('2026-11-14T18:00:00Z')
  const rows = [
    { eventID: 1, venueID: 7, title: 'On now', startTime: '2026-11-14T16:00:00', endTime: '2026-11-14T20:00:00' },
    { eventID: 2, venueID: 7, title: 'Later', startTime: '2026-12-01T20:00:00', endTime: '2026-12-01T23:00:00' },
    { eventID: 3, venueID: 7, title: 'Over', startTime: '2026-11-10T20:00:00', endTime: '2026-11-10T23:00:00' },
    { eventID: 4, venueID: 8, title: 'Other venue', startTime: '2026-12-01T20:00:00', endTime: '2026-12-01T23:00:00' },
    { eventID: 5, VenueID: 7, Title: 'No end time', StartTime: '2026-12-05T20:00:00', EndTime: '0001-01-01T00:00:00' },
    { eventID: 6, venueID: 7, title: 'Bad time', startTime: 'soon' },
    null,
  ]
  assert.deepEqual(selectVenueEvents(rows, 7, now).map((row) => row.eventID), [1, 2, 5])
  assert.deepEqual(selectVenueEvents(rows, '7', now).map((row) => row.eventID), [1, 2, 5])
  assert.deepEqual(selectVenueEvents(undefined, 7, now), [])
  assert.deepEqual(selectVenueEvents(rows, 99, now), [])
})

test('events are listed soonest first, without untitled ones, up to ten', () => {
  const items = buildEventItems(eventRows())
  assert.deepEqual(items.map((item) => item.title), ['Sooner show', 'Later show'])
  assert.equal(items[0].when, 'Fri, Nov 20, 2026 · 7:30 PM')
  assert.equal(items[0].artistName, 'Band A')

  assert.deepEqual(buildEventItems([{ eventID: 1, title: '' }, { title: 'No id' }, null]), [])
  assert.deepEqual(buildEventItems(undefined), [])
  const many = Array.from({ length: 15 }, (_, index) => ({ eventID: index + 1, title: `Show ${index + 1}`, startTime: `2026-12-${String(index + 1).padStart(2, '0')}T20:00:00` }))
  assert.equal(buildEventItems(many).length, 10)
})

test('images prefer the active pictures and fall back to the newest file in the folder', () => {
  const folderMedia = { cover: { url: 'https://store.example/folder-c.jpg' }, profile: { url: 'https://store.example/folder-p.jpg' }, gallery: [{ url: 'https://store.example/g1.jpg' }, { url: 'https://store.example/g2.jpg' }, {}] }

  const chosen = resolveVenueImages(fullVenue(), folderMedia, 'Hall')
  assert.equal(chosen.cover, 'https://store.example/c.jpg')
  assert.equal(chosen.profile, 'https://store.example/p.jpg')

  const fallback = resolveVenueImages({ name: 'Hall' }, folderMedia, 'Hall')
  assert.equal(fallback.cover, 'https://store.example/folder-c.jpg')
  assert.equal(fallback.profile, 'https://store.example/folder-p.jpg')
  assert.deepEqual(fallback.gallery, [{ url: 'https://store.example/g1.jpg', alt: 'Hall photo 1' }, { url: 'https://store.example/g2.jpg', alt: 'Hall photo 2' }])
})

test('search and sharing text comes from the description, or from the facts when there is none', () => {
  const full = buildVenueProfileView({ venue: fullVenue() })
  assert.equal(full.seo.title, 'Harbor Lights Theater')
  assert.match(full.seo.description, /^A restored theater with a proscenium stage/)
  assert.equal(full.seo.image, 'https://store.example/c.jpg')

  const plain = buildVenueProfileView({ venue: { ...fullVenue(), descriptionRichtext: '' } })
  assert.match(plain.seo.description, /Harbor Lights Theater: Theaters, Bars in Savannah, GA 31401/)

  const long = buildVenueProfileView({ venue: { ...fullVenue(), descriptionRichtext: `<p>${'word '.repeat(100)}</p>` } })
  assert.ok(long.seo.description.length <= 160 && long.seo.description.endsWith('…'))
})

test('structured data describes the venue with only the facts it has', () => {
  const view = buildVenueProfileView({ venue: fullVenue(), contacts: contactRows(), siteUrl: 'https://tag.example/' })
  const data = view.jsonLd

  assert.equal(data['@type'], 'EventVenue')
  assert.equal(data.url, 'https://tag.example/venue/harbor-lights-theater')
  assert.deepEqual(data.address, { '@type': 'PostalAddress', streetAddress: '101 Bay Street, Suite 4', addressLocality: 'Savannah', addressRegion: 'GA', postalCode: '31401', addressCountry: 'US' })
  assert.equal(data.telephone, '(912) 555-0100')
  assert.deepEqual(data.sameAs, ['https://example.com/', 'https://instagram.com/harborlights'])

  const bare = buildVenueJsonLd(buildVenueProfileView({ venue: { name: 'Bare', isPublished: true } }))
  assert.deepEqual(Object.keys(bare).sort(), ['@context', '@type', 'name'])
})

test('structured data cannot close its script tag early', () => {
  const view = buildVenueProfileView({ venue: { name: 'Hall', isPublished: true, address: { addressLine1: '</script><script>alert(1)</script>', city: 'Macon', state: 'GA', zipCode: '31201' } } })
  const json = serializeJsonLd(view.jsonLd)
  assert.doesNotMatch(json, /<\/script/i)
  assert.match(json, /\\u003c/)
  assert.equal(serializeJsonLd(null), '')
})

test('markup in the venue name is removed from the plain name', () => {
  const view = buildVenueProfileView({ venue: { name: '</script><script>alert(1)</script>', isPublished: true } })
  assert.doesNotMatch(view.name, /</)
  assert.doesNotMatch(serializeJsonLd(view.jsonLd), /<\/script/i)
})
