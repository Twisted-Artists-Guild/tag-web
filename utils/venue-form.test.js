import { test } from 'node:test'
import assert from 'node:assert/strict'
import { toNullableId, mapVenueOptionalFields, buildVenueOptionalPayload } from './venue-form.js'

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
