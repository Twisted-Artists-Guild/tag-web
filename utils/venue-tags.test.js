import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
  TAG_NAME_MAX_LENGTH,
  MAX_TAGS_PER_VENUE,
  normalizeTag,
  validateTag,
  addTag,
  addTags,
  removeTag,
  splitPastedTags,
  buildTagSuggestionsQuery,
  selectableSuggestions,
  getVenueTags,
} from './venue-tags.js'

test('tags are trimmed, lowercased and have their spaces collapsed', () => {
  assert.equal(normalizeTag('  Wheelchair    Accessible '), 'wheelchair accessible')
  assert.equal(normalizeTag('PARKING'), 'parking')
  assert.equal(normalizeTag('wheelchair\taccessible'), 'wheelchair accessible')
  assert.equal(normalizeTag('Cafe\u0301'), 'café')
  assert.equal(normalizeTag(null), '')
  assert.equal(normalizeTag(undefined), '')
})

test('valid tags pass', () => {
  for (const tag of ['parking', 'Wheelchair Accessible', '24-hour', "Rock 'n' Roll", 'Bar & Grill', 'café', 'a'.repeat(TAG_NAME_MAX_LENGTH)]) {
    assert.equal(validateTag(tag), '', tag)
  }
})

test('empty, too long and disallowed tags are rejected with a message', () => {
  assert.match(validateTag(''), /can't be empty/)
  assert.match(validateTag('   '), /can't be empty/)
  assert.match(validateTag('a'.repeat(TAG_NAME_MAX_LENGTH + 1)), /at most 30 characters/)
  for (const tag of ['<script>alert(1)</script>', '<b>bold</b>', 'a<b', 'javascript:alert(1)', 'say "hi"', 'semi;colon', 'under_score', '-leading', "'leading", 'party 🎉', 'zero\u200Bwidth']) {
    assert.match(validateTag(tag), /Use letters, numbers/, tag)
  }
})

test('adding a tag normalizes it, ignores duplicates and keeps the order', () => {
  let result = addTag([], '  Parking ')
  assert.deepEqual(result, { tags: ['parking'], error: '' })

  result = addTag(result.tags, 'STAGE')
  assert.deepEqual(result.tags, ['parking', 'stage'])

  const again = addTag(result.tags, 'Parking')
  assert.deepEqual(again, { tags: ['parking', 'stage'], error: '' })
})

test('adding an invalid tag keeps the list and explains why', () => {
  const result = addTag(['parking'], '<b>x</b>')
  assert.deepEqual(result.tags, ['parking'])
  assert.match(result.error, /Use letters, numbers/)
  assert.match(addTag(undefined, '').error, /can't be empty/)
})

test('a venue can have at most the maximum number of tags', () => {
  const full = Array.from({ length: MAX_TAGS_PER_VENUE }, (_, index) => `tag ${index}`)
  const result = addTag(full, 'one more')
  assert.deepEqual(result.tags, full)
  assert.match(result.error, /at most 15 tags/)
  assert.equal(addTag(full, 'tag 3').error, '')
  assert.match(addTag(['a'], 'b', 1).error, /at most 1 tags/)
})

test('removing a tag leaves the others and does not change the list it was given', () => {
  const original = ['parking', 'stage', 'bar']
  assert.deepEqual(removeTag(original, 'stage'), ['parking', 'bar'])
  assert.deepEqual(original, ['parking', 'stage', 'bar'])
  assert.deepEqual(removeTag(undefined, 'x'), [])
})

test('pasted text is split on commas, semicolons and new lines', () => {
  assert.deepEqual(splitPastedTags('parking, stage;bar\nfree wifi\r\n  ,, '), ['parking', 'stage', 'bar', 'free wifi'])
  assert.deepEqual(splitPastedTags(''), [])
  assert.deepEqual(splitPastedTags(null), [])
})

test('adding several tags stops at the first problem and keeps the good ones before it', () => {
  const ok = addTags(['parking'], ['Stage', 'Bar'])
  assert.deepEqual(ok, { tags: ['parking', 'stage', 'bar'], error: '' })

  const stopped = addTags([], ['stage', '<b>', 'bar'])
  assert.deepEqual(stopped.tags, ['stage'])
  assert.match(stopped.error, /Use letters, numbers/)
})

test('the suggestion query is normalized and encoded', () => {
  assert.equal(buildTagSuggestionsQuery('  PAR '), 'q=par&limit=8')
  assert.equal(buildTagSuggestionsQuery('a & b', 3), 'q=a+%26+b&limit=3')
  assert.equal(buildTagSuggestionsQuery(undefined), 'q=&limit=8')
})

test('suggestions exclude tags that are already chosen and are shown as plain names', () => {
  const suggestions = [{ name: 'parking', venueCount: 3 }, { name: 'Parking Lot' }, 'stage', { name: 'stage' }, { name: '' }, null]
  assert.deepEqual(selectableSuggestions(suggestions, ['parking']), ['parking lot', 'stage'])
  assert.deepEqual(selectableSuggestions(undefined, undefined), [])
})

test('venue tags are read from the venue, tolerating missing or odd data', () => {
  assert.deepEqual(getVenueTags({ tags: ['a', 'b'] }), ['a', 'b'])
  assert.deepEqual(getVenueTags({ Tags: ['a'] }), ['a'])
  assert.deepEqual(getVenueTags({ tags: ['a', 5, null, ''] }), ['a'])
  assert.deepEqual(getVenueTags({}), [])
  assert.deepEqual(getVenueTags(null), [])
})
