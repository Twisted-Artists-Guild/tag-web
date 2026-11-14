import { normalizeTag } from './venue-tags.js'

export const VENUE_PAGE_SIZE = 12
const MAX_VALUES = 10
const MAX_TEXT = 100

export const EMPTY_FILTERS = Object.freeze({
  q: '',
  category: [],
  tag: [],
  region: [],
  city: '',
  state: '',
  zip: '',
})

const LIST_KEYS = ['category', 'tag', 'region']
const TEXT_KEYS = ['q', 'city', 'state', 'zip']

function asArray(value) {
  if (Array.isArray(value)) return value
  return value === undefined || value === null ? [] : [value]
}

function cleanText(value) {
  return String(Array.isArray(value) ? value[0] ?? '' : value ?? '').trim().slice(0, MAX_TEXT)
}

function cleanList(key, value) {
  const items = asArray(value)
    .map((item) => String(item ?? '').trim())
    .map((item) => (key === 'tag' ? normalizeTag(item) : item.toLowerCase()))
    .filter(Boolean)
  return [...new Set(items)].slice(0, MAX_VALUES)
}

// Reads the filters from a URL query (the object Next.js gives, or one built from URLSearchParams). Anything unknown is
// ignored, text is trimmed, repeated values are de-duplicated, and nothing grows without limit.
export function parseVenueListQuery(query) {
  const source = query || {}
  const filters = { ...EMPTY_FILTERS, category: [], tag: [], region: [] }
  for (const key of TEXT_KEYS) filters[key] = cleanText(source[key])
  for (const key of LIST_KEYS) filters[key] = cleanList(key, source[key])
  return filters
}

// The query for the page URL: only the filters that are set, under the same names the API uses.
export function buildPageQuery(filters) {
  const query = {}
  for (const key of TEXT_KEYS) {
    const value = String(filters?.[key] ?? '').trim()
    if (value) query[key] = value
  }
  for (const key of LIST_KEYS) {
    const values = cleanList(key, filters?.[key])
    if (values.length > 0) query[key] = values
  }
  return query
}

// The query string for GET /api/venue/list.
export function buildApiQuery(filters, { cursor = '', limit = VENUE_PAGE_SIZE } = {}) {
  const params = new URLSearchParams()
  const query = buildPageQuery(filters)
  for (const key of TEXT_KEYS) if (query[key]) params.set(key, query[key])
  for (const key of LIST_KEYS) for (const value of query[key] || []) params.append(key, value)
  if (cursor) params.set('cursor', cursor)
  params.set('limit', String(limit))
  return params.toString()
}

export function hasActiveFilters(filters) {
  return activeFilterCount(filters) > 0
}

// How many separate filters are set (a search box counts once, a list of categories counts once).
export function activeFilterCount(filters) {
  const query = buildPageQuery(filters)
  return Object.keys(query).length
}

export function filtersEqual(left, right) {
  return JSON.stringify(buildPageQuery(left)) === JSON.stringify(buildPageQuery(right))
}

// Adds a page of venues to the ones already shown, skipping any venue that is already there.
export function appendVenuePage(existing, page) {
  const current = Array.isArray(existing) ? existing : []
  const seen = new Set(current.map((venue) => venue.venueID))
  const added = (Array.isArray(page?.items) ? page.items : []).filter((venue) => venue && !seen.has(venue.venueID))
  return [...current, ...added]
}

// What a screen reader hears after a search or after loading more.
export function describeResults(count, hasMore) {
  if (count === 0) return 'No venues found.'
  const noun = count === 1 ? 'venue' : 'venues'
  return hasMore ? `Showing ${count} ${noun}. More are available.` : `Showing ${count} ${noun}.`
}

// Where a card links to. Venues without a usable slug are not linked.
export function venueHref(venue) {
  const slug = String(venue?.slug ?? '').trim()
  return slug ? `/venue/${encodeURIComponent(slug)}` : ''
}

// "Atlanta, GA", "Atlanta", "GA" or an empty string, depending on what the venue has.
export function formatLocation(venue) {
  return [venue?.city, venue?.state].map((part) => String(part ?? '').trim()).filter(Boolean).join(', ')
}

// The category filter options: the active categories, plus any slug already in the filters that isn't listed
// (for example a link to a category that was deactivated), so the filter stays visible and can be removed.
export function mergeCategoryOptions(categories, selectedSlugs) {
  const options = (Array.isArray(categories) ? categories : []).map((category) => ({ slug: category.slug, name: category.name }))
  const known = new Set(options.map((option) => option.slug))
  for (const slug of Array.isArray(selectedSlugs) ? selectedSlugs : []) {
    if (!known.has(slug)) options.push({ slug, name: `${slug} (no longer listed)` })
  }
  return options
}

export function toggleValue(values, value) {
  const current = Array.isArray(values) ? values : []
  return current.includes(value) ? current.filter((item) => item !== value) : [...current, value]
}
