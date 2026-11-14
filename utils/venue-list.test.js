import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
  EMPTY_FILTERS,
  VENUE_PAGE_SIZE,
  parseVenueListQuery,
  buildPageQuery,
  buildApiQuery,
  hasActiveFilters,
  activeFilterCount,
  filtersEqual,
  appendVenuePage,
  describeResults,
  venueHref,
  formatLocation,
  mergeCategoryOptions,
  toggleValue,
} from './venue-list.js'

test('an empty query gives empty filters', () => {
  assert.deepEqual(parseVenueListQuery(undefined), EMPTY_FILTERS)
  assert.deepEqual(parseVenueListQuery({}), EMPTY_FILTERS)
  assert.equal(hasActiveFilters(parseVenueListQuery({})), false)
})

test('filters are read from the URL, as a single value or repeated values', () => {
  const filters = parseVenueListQuery({
    q: '  Terminal ',
    category: ['theaters', 'bars'],
    tag: 'Parking',
    region: ['atlanta-metro'],
    city: 'Atlanta',
    state: 'GA',
    zip: '303',
  })
  assert.deepEqual(filters, {
    q: 'Terminal',
    category: ['theaters', 'bars'],
    tag: ['parking'],
    region: ['atlanta-metro'],
    city: 'Atlanta',
    state: 'GA',
    zip: '303',
  })
})

test('tags are normalized like the API, and slugs are lower case', () => {
  const filters = parseVenueListQuery({ tag: ['  Wheelchair   ACCESSIBLE ', 'parking', 'PARKING'], category: ['Theaters', 'THEATERS'], region: ' Georgia ' })
  assert.deepEqual(filters.tag, ['wheelchair accessible', 'parking'])
  assert.deepEqual(filters.category, ['theaters'])
  assert.deepEqual(filters.region, ['georgia'])
})

test('unknown parameters are ignored and blank values are dropped', () => {
  const filters = parseVenueListQuery({ utm_source: 'x', cursor: 'abc', category: ['', '  '], q: '   ' })
  assert.deepEqual(filters, EMPTY_FILTERS)
})

test('long text is cut and long lists are limited', () => {
  const filters = parseVenueListQuery({ q: 'a'.repeat(500), category: Array.from({ length: 30 }, (_, i) => `c${i}`) })
  assert.equal(filters.q.length, 100)
  assert.equal(filters.category.length, 10)
})

test('a repeated text parameter uses its first value', () => {
  assert.equal(parseVenueListQuery({ city: ['Atlanta', 'Decatur'] }).city, 'Atlanta')
})

test('the page query keeps only the filters that are set', () => {
  assert.deepEqual(buildPageQuery(EMPTY_FILTERS), {})
  assert.deepEqual(
    buildPageQuery({ ...EMPTY_FILTERS, q: ' earl ', category: ['bars'], tag: ['Parking'] }),
    { q: 'earl', category: ['bars'], tag: ['parking'] },
  )
})

test('filters survive a round trip through the URL', () => {
  const filters = { q: 'west', category: ['theaters', 'bars'], tag: ['parking', 'wheelchair accessible'], region: ['atlanta-metro'], city: 'Atlanta', state: 'GA', zip: '303' }
  assert.deepEqual(parseVenueListQuery(buildPageQuery(filters)), filters)
})

test('the API query repeats list filters, adds the cursor and uses the page size by default', () => {
  assert.equal(buildApiQuery(EMPTY_FILTERS), `limit=${VENUE_PAGE_SIZE}`)
  const query = new URLSearchParams(buildApiQuery({ ...EMPTY_FILTERS, q: 'a & b', category: ['theaters', 'bars'], tag: ['parking'] }, { cursor: 'next-page', limit: 5 }))
  assert.equal(query.get('q'), 'a & b')
  assert.deepEqual(query.getAll('category'), ['theaters', 'bars'])
  assert.deepEqual(query.getAll('tag'), ['parking'])
  assert.equal(query.get('cursor'), 'next-page')
  assert.equal(query.get('limit'), '5')
  assert.equal(query.has('city'), false)
})

test('counting filters counts each kind once', () => {
  assert.equal(activeFilterCount(EMPTY_FILTERS), 0)
  assert.equal(activeFilterCount({ ...EMPTY_FILTERS, q: 'x', category: ['a', 'b'], state: 'GA' }), 3)
  assert.equal(hasActiveFilters({ ...EMPTY_FILTERS, zip: '303' }), true)
})

test('two sets of filters are equal when they mean the same thing', () => {
  assert.equal(filtersEqual({ ...EMPTY_FILTERS, q: ' earl ' }, { ...EMPTY_FILTERS, q: 'earl' }), true)
  assert.equal(filtersEqual({ ...EMPTY_FILTERS, tag: ['Parking'] }, { ...EMPTY_FILTERS, tag: ['parking'] }), true)
  assert.equal(filtersEqual({ ...EMPTY_FILTERS, q: 'earl' }, EMPTY_FILTERS), false)
})

test('a new page is added after the ones shown, and a venue is never listed twice', () => {
  const first = [{ venueID: 1 }, { venueID: 2 }]
  const result = appendVenuePage(first, { items: [{ venueID: 2 }, { venueID: 3 }], nextCursor: null })
  assert.deepEqual(result.map((venue) => venue.venueID), [1, 2, 3])
  assert.deepEqual(first.map((venue) => venue.venueID), [1, 2])
  assert.deepEqual(appendVenuePage(undefined, { items: [{ venueID: 9 }] }).map((venue) => venue.venueID), [9])
  assert.deepEqual(appendVenuePage(first, undefined).map((venue) => venue.venueID), [1, 2])
})

test('results are described in words', () => {
  assert.equal(describeResults(0, false), 'No venues found.')
  assert.equal(describeResults(1, false), 'Showing 1 venue.')
  assert.equal(describeResults(12, true), 'Showing 12 venues. More are available.')
})

test('a venue links to its public page, and a venue without a slug is not linked', () => {
  assert.equal(venueHref({ slug: 'terminal-west' }), '/venue/terminal-west')
  assert.equal(venueHref({ slug: 'a b' }), '/venue/a%20b')
  assert.equal(venueHref({ slug: '  ' }), '')
  assert.equal(venueHref(null), '')
})

test('the location shows whatever the venue has', () => {
  assert.equal(formatLocation({ city: 'Atlanta', state: 'GA' }), 'Atlanta, GA')
  assert.equal(formatLocation({ city: 'Atlanta', state: null }), 'Atlanta')
  assert.equal(formatLocation({ state: 'GA' }), 'GA')
  assert.equal(formatLocation({ city: ' ', state: '' }), '')
  assert.equal(formatLocation(undefined), '')
})

test('category options include a selected category that is no longer listed', () => {
  const options = mergeCategoryOptions([{ slug: 'bars', name: 'Bars' }], ['bars', 'old-spaces'])
  assert.deepEqual(options, [{ slug: 'bars', name: 'Bars' }, { slug: 'old-spaces', name: 'old-spaces (no longer listed)' }])
  assert.deepEqual(mergeCategoryOptions(undefined, undefined), [])
})

test('toggling a value adds or removes it without changing the given list', () => {
  const values = ['a', 'b']
  assert.deepEqual(toggleValue(values, 'c'), ['a', 'b', 'c'])
  assert.deepEqual(toggleValue(values, 'a'), ['b'])
  assert.deepEqual(values, ['a', 'b'])
  assert.deepEqual(toggleValue(undefined, 'x'), ['x'])
})
