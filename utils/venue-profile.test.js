import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
  buildAddressPayload,
  buildVenuePayload,
  firstErrorField,
  formatAddress,
  getPublishProblems,
  isEmptyRichText,
  isPlaceholderAddress,
  mapVenueToProfile,
  mergeCategoryChoices,
  publishVenue,
  sanitizeDescription,
  saveVenueDiscoverability,
  saveVenueProfile,
  summarizeDescription,
  toStateCode,
  toggleId,
  validateVenueDiscoverability,
  validateVenueProfile,
} from './venue-profile.js'

const validForm = () => ({
  venueID: 7,
  addressID: 70,
  name: 'Harbor Lights Theater',
  description: '<p>A restored theater.</p>',
  addressLine1: '101 Bay Street',
  addressLine2: '',
  city: 'Savannah',
  state: 'GA',
  zipCode: '31401',
  eventSourceUrl: '',
})

// A fetch that records its calls and answers from a script of [status, body] pairs (or a function).
function fakeFetch(responses = []) {
  const calls = []
  const fetchFn = async (url, options = {}) => {
    calls.push({ url, method: options.method || 'GET', body: options.body ? JSON.parse(options.body) : undefined })
    const next = typeof responses === 'function' ? responses(url, options) : responses[calls.length - 1]
    if (next instanceof Error) throw next
    const [status, body] = next || [204, '']
    return { ok: status >= 200 && status < 300, status, text: async () => (typeof body === 'string' ? body : JSON.stringify(body)), json: async () => body }
  }
  return { fetchFn, calls }
}

test('a complete profile is valid', () => {
  assert.deepEqual(validateVenueProfile(validForm()), {})
})

test('each required field gets its own error message', () => {
  const errors = validateVenueProfile({})
  assert.deepEqual(Object.keys(errors).sort(), ['addressLine1', 'city', 'name', 'state', 'zipCode'])
  assert.match(errors.name, /venue name/i)
  assert.match(errors.addressLine1, /street address/i)
  assert.match(errors.city, /city/i)
  assert.match(errors.state, /state/i)
  assert.match(errors.zipCode, /zip/i)
})

test('whitespace only does not count as an answer', () => {
  const errors = validateVenueProfile({ ...validForm(), name: '   ', addressLine1: '  ', city: ' ' })
  assert.deepEqual(Object.keys(errors).sort(), ['addressLine1', 'city', 'name'])
})

test('zip codes: 5 digits, or ZIP+4', () => {
  for (const zip of ['31401', '31401-1234']) assert.equal(validateVenueProfile({ ...validForm(), zipCode: zip }).zipCode, undefined, zip)
  for (const zip of ['3140', '314011', '31401-12', 'ABCDE', '31401 1234', '31401-']) assert.ok(validateVenueProfile({ ...validForm(), zipCode: zip }).zipCode, zip)
})

test('the state must be a US state or DC, as a code or a name', () => {
  assert.equal(validateVenueProfile({ ...validForm(), state: 'georgia' }).state, undefined)
  assert.equal(validateVenueProfile({ ...validForm(), state: 'DC' }).state, undefined)
  assert.match(validateVenueProfile({ ...validForm(), state: 'Atlantis' }).state, /list/i)
  assert.match(validateVenueProfile({ ...validForm(), state: '' }).state, /choose/i)
})

test('the events page must be a full http or https address, and is optional', () => {
  assert.equal(validateVenueProfile({ ...validForm(), eventSourceUrl: '' }).eventSourceUrl, undefined)
  assert.equal(validateVenueProfile({ ...validForm(), eventSourceUrl: 'https://example.com/events' }).eventSourceUrl, undefined)
  assert.equal(validateVenueProfile({ ...validForm(), eventSourceUrl: ' http://example.com ' }).eventSourceUrl, undefined)
  for (const url of ['example.com/events', 'ftp://example.com', 'javascript:alert(1)', 'not a url', 'https://']) {
    assert.match(validateVenueProfile({ ...validForm(), eventSourceUrl: url }).eventSourceUrl, /http/i, url)
  }
})

test('length limits match the API', () => {
  assert.ok(validateVenueProfile({ ...validForm(), name: 'a'.repeat(1001) }).name)
  assert.equal(validateVenueProfile({ ...validForm(), name: 'a'.repeat(1000) }).name, undefined)
  assert.ok(validateVenueProfile({ ...validForm(), addressLine1: 'a'.repeat(256) }).addressLine1)
  assert.ok(validateVenueProfile({ ...validForm(), addressLine2: 'a'.repeat(256) }).addressLine2)
  assert.ok(validateVenueProfile({ ...validForm(), city: 'a'.repeat(101) }).city)
  assert.ok(validateVenueProfile({ ...validForm(), eventSourceUrl: `https://example.com/${'a'.repeat(2048)}` }).eventSourceUrl)
  assert.ok(validateVenueProfile({ ...validForm(), description: `<p>${'a'.repeat(20001)}</p>` }).description)
})

test('the first error field follows the order of the form', () => {
  assert.equal(firstErrorField({ city: 'x', name: 'y', zipCode: 'z' }), 'name')
  assert.equal(firstErrorField({ zipCode: 'z', city: 'x' }), 'city')
  assert.equal(firstErrorField({}), null)
})

test('publish problems list every missing field, and nothing for a complete venue', () => {
  assert.deepEqual(getPublishProblems(validForm()), [])
  assert.deepEqual(getPublishProblems({ ...validForm(), city: '', zipCode: '' }).map((problem) => problem.field), ['city', 'zipCode'])
})

test('the description keeps simple formatting and drops anything unsafe', () => {
  const clean = sanitizeDescription('<p>Hello <strong>world</strong></p><script>alert(1)</script><img src="x" onerror="alert(1)"><a href="javascript:alert(1)">bad</a>')
  assert.match(clean, /<strong>world<\/strong>/)
  assert.doesNotMatch(clean, /script|onerror|javascript:|<img/i)
})

test('links in the description keep safe schemes and get noopener', () => {
  const clean = sanitizeDescription('<p><a href="https://example.com" target="_blank">site</a></p>')
  assert.match(clean, /href="https:\/\/example\.com"/)
  assert.match(clean, /rel="noopener noreferrer"/)
})

test('a blank rich-text description is saved as nothing', () => {
  assert.equal(sanitizeDescription(''), '')
  assert.equal(sanitizeDescription('<p></p>'), '')
  assert.equal(sanitizeDescription('<p> &nbsp; </p><p><br></p>'), '')
  assert.equal(isEmptyRichText('<p></p>'), true)
  assert.equal(isEmptyRichText('<p>text</p>'), false)
  assert.equal(buildVenuePayload({ ...validForm(), description: '<p></p>' }).description, null)
})

test('the address payload is trimmed, with the state as a code and an empty second line as null', () => {
  assert.deepEqual(buildAddressPayload({ addressLine1: ' 101 Bay Street ', addressLine2: '  ', city: ' Savannah ', state: 'georgia', zipCode: ' 31401 ' }), {
    addressLine1: '101 Bay Street',
    addressLine2: null,
    city: 'Savannah',
    state: 'GA',
    zipCode: '31401',
  })
})

test('the venue payload sends the whole record back, keeping the flags it does not edit', () => {
  const payload = buildVenuePayload({ ...validForm(), externalLinkID: 5, phoneContactID: null, isPublished: true, isModerationBlocked: false, eventSourceUrl: ' https://example.com/e ' })
  assert.deepEqual(payload, {
    venueID: 7,
    name: 'Harbor Lights Theater',
    addressID: 70,
    externalLinkID: 5,
    phoneContactID: null,
    description: '<p>A restored theater.</p>',
    eventSourceUrl: 'https://example.com/e',
    isPublished: true,
    isModerationBlocked: false,
  })
  assert.equal(buildVenuePayload(validForm(), { isPublished: true }).isPublished, true)
  assert.equal(buildVenuePayload({ ...validForm(), isPublished: true }, { isPublished: false }).isPublished, false)
})

test('state codes are found from a code or a name, in any case', () => {
  assert.equal(toStateCode('ga'), 'GA')
  assert.equal(toStateCode('North Carolina'), 'NC')
  assert.equal(toStateCode('district of columbia'), 'DC')
  assert.equal(toStateCode('Atlantis'), '')
  assert.equal(toStateCode(undefined), '')
})

test('the placeholder address is recognized', () => {
  assert.equal(isPlaceholderAddress({ addressLine1: 'Pending venue address', city: 'Pending' }), true)
  assert.equal(isPlaceholderAddress({ addressLine1: '1 Main St', city: 'Pending' }), true)
  assert.equal(isPlaceholderAddress({ addressLine1: '1 Main St', city: 'Atlanta' }), false)
  assert.equal(isPlaceholderAddress(undefined), false)
})

test('a venue is mapped into form values, with the placeholder address shown as empty fields', () => {
  const venue = {
    venueID: 7, addressID: 70, name: 'Hall', descriptionRichtext: '<p>Hi</p>', eventSourceUrl: 'https://example.com', isPublished: true,
    address: { addressLine1: 'Pending venue address', city: 'Pending', state: '', zipCode: '' },
    categories: [{ venueCategoryID: 2, name: 'Bars', slug: 'bars', isActive: false }],
    tags: ['parking', 'stage'],
    regions: [{ regionID: 9, name: 'Georgia', slug: 'georgia' }],
  }
  const form = mapVenueToProfile(venue)
  assert.equal(form.venueID, 7)
  assert.equal(form.addressID, 70)
  assert.equal(form.description, '<p>Hi</p>')
  assert.equal(form.addressLine1, '')
  assert.equal(form.city, '')
  assert.deepEqual(form.categoryIds, [2])
  assert.deepEqual(form.tags, ['parking', 'stage'])
  assert.deepEqual(form.regionIds, [9])
  assert.equal(form.extraCategories[0].name, 'Bars')
  assert.equal(form.isPublished, true)
})

test('a real address maps to form values, with an old full state name turned into its code', () => {
  const form = mapVenueToProfile({ venueID: 1, address: { addressLine1: '5 Oak Dr', addressLine2: 'Unit 2', city: 'Charlotte', state: 'North Carolina', zipCode: '28202' } })
  assert.deepEqual([form.addressLine1, form.addressLine2, form.city, form.state, form.zipCode], ['5 Oak Dr', 'Unit 2', 'Charlotte', 'NC', '28202'])
})

test('odd or missing venue data does not break the mapping', () => {
  for (const input of [undefined, null, {}, { tags: 'x', categories: [null, {}], regions: [{}] }]) {
    const form = mapVenueToProfile(input)
    assert.deepEqual([form.tags.length, form.categoryIds.length, form.regionIds.length], [0, 0, 0])
    assert.equal(form.name, '')
  }
})

test('the review text: address on one line, description as a short plain summary', () => {
  assert.equal(formatAddress({ ...validForm(), addressLine2: 'Suite 4' }), '101 Bay Street, Suite 4, Savannah, GA 31401')
  assert.equal(formatAddress({}), '')
  assert.equal(summarizeDescription('<p>One <strong>two</strong></p>'), 'One two')
  const summary = summarizeDescription(`<p>${'word '.repeat(100)}</p>`, 20)
  assert.ok(summary.endsWith('…') && summary.length <= 21)
})

test('saving the profile sends the venue, then the address, then loads the venue again', async () => {
  const { fetchFn, calls } = fakeFetch([[204, ''], [204, ''], [200, { venueID: 7, addressID: 71 }]])

  const result = await saveVenueProfile({ form: validForm(), fetchFn })

  assert.equal(result.ok, true)
  assert.deepEqual(result.venue, { venueID: 7, addressID: 71 })
  assert.deepEqual(calls.map((call) => `${call.method} ${call.url}`), ['PUT /api/venue/7', 'PUT /api/venue/7/address', 'GET /api/venue/byID/7'])
  assert.equal(calls[0].body.name, 'Harbor Lights Theater')
  assert.equal(calls[0].body.isPublished, false)
  assert.equal(calls[1].body.state, 'GA')
})

test('publishing sends isPublished true', async () => {
  const { fetchFn, calls } = fakeFetch()
  await saveVenueProfile({ form: validForm(), isPublished: true, fetchFn })
  assert.equal(calls[0].body.isPublished, true)
})

test('an API error on the venue is shown, and the address is not sent', async () => {
  const { fetchFn, calls } = fakeFetch([[403, { message: 'You are not allowed to edit this venue.' }]])

  const result = await saveVenueProfile({ form: validForm(), fetchFn })

  assert.equal(result.ok, false)
  assert.equal(result.message, 'You are not allowed to edit this venue.')
  assert.equal(calls.length, 1)
})

test('an API error on the address says the venue was saved but the address was not', async () => {
  const { fetchFn } = fakeFetch([[204, ''], [400, 'Zip code must be 5 digits.']])

  const result = await saveVenueProfile({ form: validForm(), fetchFn })

  assert.equal(result.ok, false)
  assert.match(result.message, /venue details were saved, but the address was not/i)
  assert.match(result.message, /Zip code must be 5 digits/)
})

test('a network failure gives a plain message', async () => {
  const { fetchFn } = fakeFetch([new Error('Failed to fetch')])

  const result = await saveVenueProfile({ form: validForm(), fetchFn })

  assert.equal(result.ok, false)
  assert.match(result.message, /check your connection/i)
})

test('a failed reload after a good save still counts as saved', async () => {
  const { fetchFn } = fakeFetch([[204, ''], [204, ''], new Error('offline')])
  const result = await saveVenueProfile({ form: validForm(), fetchFn })
  assert.equal(result.ok, true)
  assert.equal(result.venue, null)
})

test('nothing is sent when the venue never loaded', async () => {
  const { fetchFn, calls } = fakeFetch()
  const result = await saveVenueProfile({ form: { ...validForm(), addressID: 0 }, fetchFn })
  assert.equal(result.ok, false)
  assert.match(result.message, /could not be loaded/i)
  assert.equal(calls.length, 0)
})

test('saving the categories, tags and regions sends each list in turn', async () => {
  const { fetchFn, calls } = fakeFetch()

  const result = await saveVenueDiscoverability({ venueId: 7, form: { categoryIds: [1, 2], tags: ['parking'], regionIds: [3] }, fetchFn })

  assert.equal(result.ok, true)
  assert.deepEqual(calls.map((call) => `${call.method} ${call.url}`), ['PUT /api/venue/7/categories', 'PUT /api/venue/7/tags', 'PUT /api/venue/7/regions'])
  assert.deepEqual(calls.map((call) => call.body), [{ categoryIds: [1, 2] }, { tags: ['parking'] }, { regionIds: [3] }])
})

test('an empty choice is sent as an empty list, so it clears what was there', async () => {
  const { fetchFn, calls } = fakeFetch()
  await saveVenueDiscoverability({ venueId: 7, form: {}, fetchFn })
  assert.deepEqual(calls.map((call) => call.body), [{ categoryIds: [] }, { tags: [] }, { regionIds: [] }])
})

test('publishing a complete venue sends isPublished true and nothing else changes', async () => {
  const { fetchFn, calls } = fakeFetch()

  const result = await publishVenue({ form: { ...validForm(), isModerationBlocked: false }, fetchFn })

  assert.equal(result.ok, true)
  assert.equal(calls.length, 1)
  assert.equal(`${calls[0].method} ${calls[0].url}`, 'PUT /api/venue/7')
  assert.equal(calls[0].body.isPublished, true)
  assert.equal(calls[0].body.name, 'Harbor Lights Theater')
  assert.equal(calls[0].body.isModerationBlocked, false)
})

test('an incomplete venue is not published, and the missing fields are listed', async () => {
  const { fetchFn, calls } = fakeFetch()

  const result = await publishVenue({ form: { ...validForm(), addressLine1: '', zipCode: '' }, fetchFn })

  assert.equal(result.ok, false)
  assert.deepEqual(result.problems.map((problem) => problem.field), ['addressLine1', 'zipCode'])
  assert.match(result.message, /street address/i)
  assert.equal(calls.length, 0)
})

test('an API refusal to publish is shown as it came', async () => {
  const { fetchFn } = fakeFetch([[400, "Add the venue's address before publishing."]])
  const result = await publishVenue({ form: validForm(), fetchFn })
  assert.equal(result.ok, false)
  assert.equal(result.message, "Add the venue's address before publishing.")
})

test('publishing does nothing when the venue never loaded', async () => {
  const { fetchFn, calls } = fakeFetch()
  const result = await publishVenue({ form: { ...validForm(), venueID: 0 }, fetchFn })
  assert.equal(result.ok, false)
  assert.equal(calls.length, 0)
})

test('the first failing list stops the rest and names what failed', async () => {
  const { fetchFn, calls } = fakeFetch([[204, ''], [400, { message: 'The tag "x!" has characters that are not allowed.' }]])

  const result = await saveVenueDiscoverability({ venueId: 7, form: { tags: ['x!'] }, fetchFn })

  assert.equal(result.ok, false)
  assert.match(result.message, /not allowed/)
  assert.equal(calls.length, 2)
})

test('a network failure while saving the lists names what was being saved', async () => {
  const { fetchFn } = fakeFetch([new Error('offline')])
  const result = await saveVenueDiscoverability({ venueId: 7, form: {}, fetchFn })
  assert.match(result.message, /save the categories/i)
})

test('more than 15 amenity tags is an error', () => {
  assert.deepEqual(validateVenueDiscoverability({ tags: ['a', 'b'] }), {})
  assert.match(validateVenueDiscoverability({ tags: Array.from({ length: 16 }, (_, index) => `tag ${index}`) }).tags, /15/)
})

test('ids toggle on and off without changing the original list', () => {
  const ids = [1, 2]
  assert.deepEqual(toggleId(ids, 3), [1, 2, 3])
  assert.deepEqual(toggleId(ids, 2), [1])
  assert.deepEqual(ids, [1, 2])
  assert.deepEqual(toggleId(undefined, 1), [1])
})

test('category choices: the active ones in the API order, then any the venue already has, each once', () => {
  const active = [{ venueCategoryID: 2, name: 'Theaters' }, { venueCategoryID: 1, name: 'Bars' }]
  const existing = [{ venueCategoryID: 2, name: 'Theaters' }, { venueCategoryID: 9, name: 'Old one', isActive: false }]
  const merged = mergeCategoryChoices(active, existing)
  assert.deepEqual(merged.map((category) => category.venueCategoryID), [2, 1, 9])
  assert.equal(merged.find((category) => category.venueCategoryID === 9).isActive, false)
  assert.deepEqual(mergeCategoryChoices(undefined, undefined), [])
})
