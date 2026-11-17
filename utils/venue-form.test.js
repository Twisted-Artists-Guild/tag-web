import { test } from 'node:test'
import assert from 'node:assert/strict'
import { toNullableId, mapVenueOptionalFields, buildVenueOptionalPayload, getSessionTokenFromRequest, fetchVenueForPage, fetchJsonWithSession, fetchVenueAccess, getEditRedirect, getActivePictureUrl, splitVenueMedia, getApiErrorMessage } from './venue-form.js'

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

test('session chunks are joined numerically for both NextRequest and server-side cookie objects', () => {
  for (const name of ['next-auth.session-token', '__Secure-next-auth.session-token']) {
    const entries = Array.from({ length: 12 }, (_, index) => ({
      name: `${name}.${index}`,
      value: `${index}-`,
    })).reverse()
    const expected = '0-1-2-3-4-5-6-7-8-9-10-11-'
    assert.equal(getSessionTokenFromRequest({ cookies: { getAll: () => entries } }), expected)
    assert.equal(getSessionTokenFromRequest({ cookies: Object.fromEntries(entries.map(({ name, value }) => [name, value])) }), expected)
  }
})

test('session cookie families are never mixed and incomplete chunks are not forwarded', () => {
  assert.equal(getSessionTokenFromRequest({ cookies: {
    '__Secure-next-auth.session-token.0': 'secure-',
    '__Secure-next-auth.session-token.1': 'token',
    'next-auth.session-token': 'plain',
  } }), 'secure-token')
  assert.equal(getSessionTokenFromRequest({ cookies: {
    'next-auth.session-token.0': 'first',
    'next-auth.session-token.2': 'third',
  } }), '')
  assert.equal(getSessionTokenFromRequest({ cookies: { 'next-auth.session-token.1': 'missing-first' } }), '')
  assert.equal(getSessionTokenFromRequest({ cookies: { 'next-auth.session-token.invalid': 'ignored' } }), '')
})

test('venue access forwards a chunked session as a complete bearer token', async () => {
  const req = { cookies: {
    'next-auth.session-token.1': 'signature',
    'next-auth.session-token.0': 'header.payload.',
  } }
  const access = await fetchVenueAccess({ req, id: 25, fetchApi: async (path, options) => {
    assert.equal(path, '/venue/25/access')
    assert.equal(options.headers.Authorization, 'Bearer header.payload.signature')
    return okResponse({ canManage: true, isOwner: true })
  } })
  assert.equal(access.isOwner, true)
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

test('venue lookup for a signed-out visitor uses only the slug and sends no token', async () => {
  const calls = []
  const fetchApi = async (path, options) => {
    calls.push({ path, options })
    return okResponse({ venueID: 7 })
  }

  assert.deepEqual(await fetchVenueForPage({ req: { cookies: {} }, id: 1, slug: ' Test-Hall ', fetchApi }), { venueID: 7 })
  assert.deepEqual(calls, [{ path: '/venue/by-slug/test-hall', options: undefined }])
})

test('venue lookup for a signed-out visitor returns null for a missing slug, a failed response or a thrown error', async () => {
  let called = false
  const never = async () => { called = true; return okResponse({}) }
  assert.equal(await fetchVenueForPage({ req: { cookies: {} }, id: 1, slug: '  ', fetchApi: never }), null)
  assert.equal(called, false)

  assert.equal(await fetchVenueForPage({ req: undefined, slug: 'draft-hall', fetchApi: async () => failResponse(404) }), null)
  assert.equal(await fetchVenueForPage({ req: undefined, slug: 'x', fetchApi: async () => { throw new Error('network down') } }), null)
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

test('the active picture comes from the venue record, in camelCase or PascalCase, or is empty', () => {
  assert.equal(getActivePictureUrl({ profilePic: { url: 'https://s/p.jpg' } }, 'profile'), 'https://s/p.jpg')
  assert.equal(getActivePictureUrl({ CoverPic: { URL: 'https://s/c.jpg' } }, 'cover'), 'https://s/c.jpg')
  assert.equal(getActivePictureUrl({ coverPic: { normalizedURL: ' https://s/n.jpg ' } }, 'cover'), 'https://s/n.jpg')
  assert.equal(getActivePictureUrl({ profilePic: { url: 'https://s/p.jpg' }, coverPic: { url: 'https://s/c.jpg' } }, 'cover'), 'https://s/c.jpg')
  for (const venue of [undefined, null, {}, { profilePic: null }, { profilePic: {} }, { coverPic: { url: 'https://s/c.jpg' } }]) {
    assert.equal(getActivePictureUrl(venue, 'profile'), '')
  }
})

test('API errors become readable messages for plain text, message, title and field validation bodies', () => {
  assert.equal(getApiErrorMessage('Slug is already in use.', 409), 'Slug is already in use.')
  assert.equal(getApiErrorMessage('{"message":"You are not allowed to edit this venue."}', 403), 'You are not allowed to edit this venue.')
  assert.equal(getApiErrorMessage('{"title":"One or more validation errors occurred.","status":400,"errors":{"Name":["The Name field is required."]}}', 400), 'The Name field is required.')
  assert.equal(getApiErrorMessage('{"title":"Bad Request","status":400}', 400), 'Bad Request')
  assert.equal(getApiErrorMessage('"EventSourceUrl must be an absolute http or https URL."', 400), 'EventSourceUrl must be an absolute http or https URL.')
})

test('API error messages fall back to the status when the body is empty or unusable', () => {
  assert.equal(getApiErrorMessage('', 500), 'Unable to save venue (500).')
  assert.equal(getApiErrorMessage(undefined, 401), 'Unable to save venue (401).')
  assert.equal(getApiErrorMessage('{}', 500), 'Unable to save venue (500).')
  assert.equal(getApiErrorMessage('{"errors":{"Name":[1]}}', 400), 'Unable to save venue (400).')
})

test('session fetch sends the token and returns the parsed JSON, including lists', async () => {
  const calls = []
  const fetchApi = async (path, options) => {
    calls.push({ path, auth: options.headers.Authorization })
    return okResponse([{ venueID: 13, slug: 'test-hall' }])
  }

  const venues = await fetchJsonWithSession({ req: reqWithCookie(), path: '/linker_usertovenue/byUserID/2', fetchApi })

  assert.deepEqual(venues, [{ venueID: 13, slug: 'test-hall' }])
  assert.deepEqual(calls, [{ path: '/linker_usertovenue/byUserID/2', auth: 'Bearer tok123' }])
})

test('session fetch returns null when signed out, on a failed response, or when the call throws', async () => {
  let called = false
  const countingFetch = async () => { called = true; return okResponse([]) }
  assert.equal(await fetchJsonWithSession({ req: { cookies: {} }, path: '/x', fetchApi: countingFetch }), null)
  assert.equal(called, false)

  assert.equal(await fetchJsonWithSession({ req: reqWithCookie(), path: '/x', fetchApi: async () => failResponse(401) }), null)
  assert.equal(await fetchJsonWithSession({ req: reqWithCookie(), path: '/x', fetchApi: async () => { throw new Error('network down') } }), null)
})

test('the edit access check asks the API about the venue as the signed-in user', async () => {
  const calls = []
  const fetchApi = async (path, options) => { calls.push({ path, auth: options.headers.Authorization }); return okResponse({ canManage: true, isStaff: false, isOwner: true }) }

  const access = await fetchVenueAccess({ req: reqWithCookie(), id: '13', fetchApi })

  assert.deepEqual(access, { canManage: true, isStaff: false, isOwner: true })
  assert.deepEqual(calls, [{ path: '/venue/13/access', auth: 'Bearer tok123' }])
})

test('the edit access check gives null, and sends no request, for a bad id or a signed-out visitor', async () => {
  let called = false
  const fetchApi = async () => { called = true; return okResponse({ canManage: true }) }

  for (const id of [undefined, null, '', 0, '0', -3, 'abc', 1.5]) {
    assert.equal(await fetchVenueAccess({ req: reqWithCookie(), id, fetchApi }), null)
  }
  assert.equal(await fetchVenueAccess({ req: { cookies: {} }, id: 13, fetchApi }), null)
  assert.equal(called, false)
})

test('the edit access check gives null when the API refuses or fails', async () => {
  assert.equal(await fetchVenueAccess({ req: reqWithCookie(), id: 13, fetchApi: async () => failResponse(404) }), null)
  assert.equal(await fetchVenueAccess({ req: reqWithCookie(), id: 13, fetchApi: async () => { throw new Error('down') } }), null)
})

test('only someone the API says can manage the venue stays on the edit page', () => {
  assert.equal(getEditRedirect({ canManage: true }), null)
  assert.equal(getEditRedirect({ canManage: true, isStaff: true }), null)
  assert.equal(getEditRedirect({ canManage: false }), '/portal/venue')
  assert.equal(getEditRedirect(null), '/portal/venue')
  assert.equal(getEditRedirect(undefined), '/portal/venue')
  assert.equal(getEditRedirect({}), '/portal/venue')
  assert.equal(getEditRedirect({ canManage: 'true' }), '/portal/venue')
  assert.equal(getEditRedirect({ canManage: false }, '/somewhere'), '/somewhere')
})
