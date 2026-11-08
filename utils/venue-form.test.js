import { test } from 'node:test'
import assert from 'node:assert/strict'
import { toNullableId, mapVenueOptionalFields, buildVenueOptionalPayload, getSessionTokenFromRequest, fetchVenueForPage, splitVenueMedia } from './venue-form.js'

test('missing, zero and invalid IDs become null instead of 0', () => {
  for (const value of [undefined, null, '', 0, '0', -1, 1.5, 'abc', NaN]) {
    assert.equal(toNullableId(value), null)
  }
  assert.equal(toNullableId(5), 5)
  assert.equal(toNullableId('7'), 7)
})

test('a venue with no website or phone maps to null contact IDs', () => {
  const mapped = mapVenueOptionalFields({ venueID: 1, name: 'Hall', externalLinkID: null, phoneContactID: null })
  assert.equal(mapped.externalLinkID, null)
  assert.equal(mapped.phoneContactID, null)
  assert.equal(mapped.description, '')
  assert.equal(mapped.eventSourceUrl, '')
})

test('API field names are read in camelCase or PascalCase, using the raw rich-text description', () => {
  assert.deepEqual(
    mapVenueOptionalFields({ externalLinkID: 3, phoneContactID: 4, descriptionRichtext: '<p>Hi</p>', description: 'Hi', eventSourceUrl: 'https://example.com/e' }),
    { externalLinkID: 3, phoneContactID: 4, description: '<p>Hi</p>', eventSourceUrl: 'https://example.com/e' }
  )
  const pascal = mapVenueOptionalFields({ ExternalLinkID: 8, PhoneContactID: 9, DescriptionRichtext: '<p>Yo</p>', EventSourceUrl: 'http://a.b/c' })
  assert.equal(pascal.externalLinkID, 8)
  assert.equal(pascal.description, '<p>Yo</p>')
})

test('save payload keeps null IDs null and round-trips the new fields', () => {
  assert.deepEqual(
    buildVenueOptionalPayload({ externalLinkID: null, phoneContactID: 0, description: '  ', eventSourceUrl: '' }),
    { externalLinkID: null, phoneContactID: null, description: null, eventSourceUrl: null }
  )
  assert.deepEqual(
    buildVenueOptionalPayload({ externalLinkID: 3, phoneContactID: 4, description: '<p>Hi</p>', eventSourceUrl: ' https://example.com/e ' }),
    { externalLinkID: 3, phoneContactID: 4, description: '<p>Hi</p>', eventSourceUrl: 'https://example.com/e' }
  )
})

const okResponse = (data) => ({ ok: true, json: async () => data })
const failResponse = (status = 404) => ({ ok: false, status, json: async () => ({}) })
const reqWithCookie = (name = 'next-auth.session-token') => ({ cookies: { [name]: 'tok123' } })

test('session token is read from the secure or plain next-auth cookie, and is empty when signed out', () => {
  assert.equal(getSessionTokenFromRequest(reqWithCookie()), 'tok123')
  assert.equal(getSessionTokenFromRequest(reqWithCookie('__Secure-next-auth.session-token')), 'tok123')
  assert.equal(getSessionTokenFromRequest({ cookies: {} }), '')
  assert.equal(getSessionTokenFromRequest(undefined), '')
})

test('venue lookup sends the session token and prefers the numeric id over a stale slug', async () => {
  const calls = []
  const fetchApi = async (path, options) => {
    calls.push({ path, auth: options.headers.Authorization })
    return okResponse({ venueID: 13, addressID: 16 })
  }

  const venue = await fetchVenueForPage({ req: reqWithCookie(), id: '13', slug: 'test-hall-1', fetchApi })

  assert.deepEqual(venue, { venueID: 13, addressID: 16 })
  assert.deepEqual(calls, [{ path: '/venue/byID/13', auth: 'Bearer tok123' }])
})

test('venue lookup falls back to the slug when the id lookup fails or no id is given', async () => {
  const paths = []
  const fetchApi = async (path) => {
    paths.push(path)
    return path.startsWith('/venue/byID') ? failResponse() : okResponse({ venueID: 7 })
  }

  assert.deepEqual(await fetchVenueForPage({ req: reqWithCookie(), id: 7, slug: ' Test-Hall ', fetchApi }), { venueID: 7 })
  assert.deepEqual(paths, ['/venue/byID/7', '/venue/by-slug/test-hall'])

  paths.length = 0
  await fetchVenueForPage({ req: reqWithCookie(), id: undefined, slug: 'a b', fetchApi })
  assert.deepEqual(paths, ['/venue/by-slug/a%20b'])
})

test('venue lookup returns null when signed out, without calling the API', async () => {
  let called = false
  const fetchApi = async () => { called = true; return okResponse({}) }
  assert.equal(await fetchVenueForPage({ req: { cookies: {} }, id: 1, slug: 'x', fetchApi }), null)
  assert.equal(called, false)
})

test('venue lookup ignores invalid ids and returns null when every lookup fails or throws', async () => {
  const paths = []
  const fetchApi = async (path) => { paths.push(path); throw new Error('network down') }

  assert.equal(await fetchVenueForPage({ req: reqWithCookie(), id: '0', slug: 'x', fetchApi }), null)
  assert.equal(await fetchVenueForPage({ req: reqWithCookie(), id: 'abc', slug: '', fetchApi }), null)
  assert.deepEqual(paths, ['/venue/by-slug/x'])
})

const blob = (name, lastModified) => ({ name, url: `https://store.example/tagpictures/${name}`, lastModified })

test('profile and cover are the newest file directly in their folder; gallery lists every gallery file', () => {
  const media = splitVenueMedia([
    blob('platformpics/venue/13/profile/old.jpeg', '2026-01-01T00:00:00Z'),
    blob('platformpics/venue/13/profile/new.jpeg', '2026-06-01T00:00:00Z'),
    blob('platformpics/venue/13/cover/cover.jpeg', '2026-03-01T00:00:00Z'),
    blob('platformpics/venue/13/gallery/a.jpeg', '2026-03-01T00:00:00Z'),
    blob('platformpics/venue/13/gallery/b.jpeg', '2026-03-02T00:00:00Z'),
    blob('platformpics/venue/13/logo/logo.jpeg', '2026-03-01T00:00:00Z'),
  ])

  assert.equal(media.profile.name, 'platformpics/venue/13/profile/new.jpeg')
  assert.equal(media.cover.name, 'platformpics/venue/13/cover/cover.jpeg')
  assert.deepEqual(media.gallery.map((file) => file.name), ['platformpics/venue/13/gallery/a.jpeg', 'platformpics/venue/13/gallery/b.jpeg'])
})

test('archived profile and cover versions in nested folders are not used as the active picture', () => {
  const media = splitVenueMedia([
    blob('platformpics/venue/13/profile/2026-10-27T01-20-11-501Z/archived.jpeg', '2026-12-01T00:00:00Z'),
    blob('platformpics/venue/13/cover/2026-10-27T01-20-11-501Z/archived.jpeg', '2026-12-01T00:00:00Z'),
  ])

  assert.equal(media.profile, undefined)
  assert.equal(media.cover, undefined)
})

test('media split tolerates empty, missing and malformed input', () => {
  for (const input of [undefined, null, [], [{}], [null], 'nope']) {
    const media = splitVenueMedia(input)
    assert.equal(media.profile, undefined)
    assert.equal(media.cover, undefined)
    assert.deepEqual(media.gallery, [])
  }
})
