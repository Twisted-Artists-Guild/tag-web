import { US_STATES } from './regions.js'
import { MAX_TAGS_PER_VENUE } from './venue-tags.js'
// A relative import, because the unit tests run in plain Node, which does not know the "@/" alias.
// eslint-disable-next-line import/no-relative-parent-imports
import { sanitizeCardHtml, stripHtmlText } from '../components/security/sanitize.js'
import { getApiErrorMessage } from './venue-form.js'

// Limits mirror the API (VenueController), so the form and the server agree on what is valid.
export const VENUE_NAME_MAX_LENGTH = 1000
export const DESCRIPTION_MAX_LENGTH = 20000
export const EVENT_SOURCE_URL_MAX_LENGTH = 2048
export const ADDRESS_LINE_MAX_LENGTH = 255
export const CITY_MAX_LENGTH = 100

const ZIP_PATTERN = /^\d{5}(-\d{4})?$/
const PLACEHOLDER_LINE = 'pending venue address'
const PLACEHOLDER_CITY = 'pending'

const text = (value) => String(value ?? '')

export function toStateCode(value) {
  const raw = text(value).trim().toLowerCase()
  if (!raw) return ''
  const match = US_STATES.find((state) => state.code.toLowerCase() === raw || state.name.toLowerCase() === raw)
  return match ? match.code : ''
}

// Slug reservation gives a venue a placeholder address until its owner enters the real one.
export function isPlaceholderAddress(address) {
  const line = text(address?.addressLine1 ?? address?.AddressLine1).trim().toLowerCase()
  const city = text(address?.city ?? address?.City).trim().toLowerCase()
  return line === PLACEHOLDER_LINE || city === PLACEHOLDER_CITY
}

function categoriesOf(venue) {
  const raw = venue?.categories ?? venue?.Categories
  return Array.isArray(raw) ? raw.filter((category) => category && Number.isInteger(category.venueCategoryID ?? category.VenueCategoryID)) : []
}

function regionsOf(venue) {
  const raw = venue?.regions ?? venue?.Regions
  return Array.isArray(raw) ? raw.filter((region) => region && Number.isInteger(region.regionID ?? region.RegionID)) : []
}

function tagsOf(venue) {
  const raw = venue?.tags ?? venue?.Tags
  return Array.isArray(raw) ? raw.filter((tag) => typeof tag === 'string' && tag) : []
}

const categoryId = (category) => category.venueCategoryID ?? category.VenueCategoryID
const regionId = (region) => region.regionID ?? region.RegionID

// The form's view of a venue as the API returns it. The placeholder address shows as empty fields. The categories and
// regions the venue already has are kept in full (extraCategories, extraRegions) so a deactivated one stays visible.
export function mapVenueToProfile(venueData) {
  const data = venueData || {}
  const address = data.address ?? data.Address ?? {}
  const hasRealAddress = !isPlaceholderAddress(address)
  const categories = categoriesOf(data)
  const regions = regionsOf(data)

  return {
    venueID: Number(data.venueID ?? data.VenueID ?? 0) || 0,
    addressID: Number(data.addressID ?? data.AddressID ?? 0) || 0,
    externalLinkID: Number(data.externalLinkID ?? data.ExternalLinkID ?? 0) || null,
    phoneContactID: Number(data.phoneContactID ?? data.PhoneContactID ?? 0) || null,
    isPublished: Boolean(data.isPublished ?? data.IsPublished),
    isModerationBlocked: Boolean(data.isModerationBlocked ?? data.IsModerationBlocked),
    name: text(data.name ?? data.Name),
    description: text(data.descriptionRichtext ?? data.DescriptionRichtext),
    eventSourceUrl: text(data.eventSourceUrl ?? data.EventSourceUrl),
    addressLine1: hasRealAddress ? text(address.addressLine1 ?? address.AddressLine1) : '',
    addressLine2: hasRealAddress ? text(address.addressLine2 ?? address.AddressLine2) : '',
    city: hasRealAddress ? text(address.city ?? address.City) : '',
    state: hasRealAddress ? toStateCode(address.state ?? address.State) : '',
    zipCode: hasRealAddress ? text(address.zipCode ?? address.ZipCode) : '',
    categoryIds: categories.map(categoryId),
    tags: tagsOf(data),
    regionIds: regions.map(regionId),
    extraCategories: categories,
    extraRegions: regions,
  }
}

function isHttpUrl(value) {
  try {
    const url = new URL(value)
    return url.protocol === 'http:' || url.protocol === 'https:'
  } catch {
    return false
  }
}

export function isEmptyRichText(html) {
  const value = text(html)
  if (/<(img|iframe|hr)\b/i.test(value)) return false
  return stripHtmlText(value) === ''
}

// What is saved and shown for the description: only the rich-text formatting the site allows, or nothing when it is blank.
export function sanitizeDescription(html) {
  const clean = sanitizeCardHtml(html)
  return isEmptyRichText(clean) ? '' : clean
}

// Field-level errors for the profile step (name, description, address, events page). An empty object means valid.
export function validateVenueProfile(form) {
  const values = form || {}
  const errors = {}

  const name = text(values.name).trim()
  if (!name) errors.name = 'Enter the venue name.'
  else if (name.length > VENUE_NAME_MAX_LENGTH) errors.name = `The venue name can be at most ${VENUE_NAME_MAX_LENGTH} characters.`

  if (sanitizeDescription(values.description).length > DESCRIPTION_MAX_LENGTH) {
    errors.description = `The description is too long. Keep it under ${DESCRIPTION_MAX_LENGTH.toLocaleString('en-US')} characters.`
  }

  const line1 = text(values.addressLine1).trim()
  if (!line1) errors.addressLine1 = 'Enter the street address.'
  else if (line1.length > ADDRESS_LINE_MAX_LENGTH) errors.addressLine1 = `The street address can be at most ${ADDRESS_LINE_MAX_LENGTH} characters.`

  if (text(values.addressLine2).trim().length > ADDRESS_LINE_MAX_LENGTH) {
    errors.addressLine2 = `This line can be at most ${ADDRESS_LINE_MAX_LENGTH} characters.`
  }

  const city = text(values.city).trim()
  if (!city) errors.city = 'Enter the city.'
  else if (city.length > CITY_MAX_LENGTH) errors.city = `The city can be at most ${CITY_MAX_LENGTH} characters.`

  if (!text(values.state).trim()) errors.state = 'Choose the state.'
  else if (!toStateCode(values.state)) errors.state = 'Choose a state from the list.'

  const zip = text(values.zipCode).trim()
  if (!zip) errors.zipCode = 'Enter the zip code.'
  else if (!ZIP_PATTERN.test(zip)) errors.zipCode = 'Enter a 5-digit zip code, or 5 digits, a dash and 4 digits.'

  const url = text(values.eventSourceUrl).trim()
  if (url) {
    if (url.length > EVENT_SOURCE_URL_MAX_LENGTH) errors.eventSourceUrl = `The web address can be at most ${EVENT_SOURCE_URL_MAX_LENGTH} characters.`
    else if (!isHttpUrl(url)) errors.eventSourceUrl = 'Enter a full web address that starts with http:// or https://.'
  }

  return errors
}

export function validateVenueDiscoverability(form) {
  const errors = {}
  if ((form?.tags || []).length > MAX_TAGS_PER_VENUE) errors.tags = `A venue can have at most ${MAX_TAGS_PER_VENUE} amenity tags.`
  return errors
}

// The first field with an error, in the order the form shows them, so the form can move focus there.
export const PROFILE_FIELD_ORDER = ['name', 'description', 'addressLine1', 'addressLine2', 'city', 'state', 'zipCode', 'eventSourceUrl']

export function firstErrorField(errors, order = PROFILE_FIELD_ORDER) {
  return order.find((field) => errors?.[field]) || null
}

// What stops a venue from being published. Each problem names the field and the step that fixes it.
export function getPublishProblems(form) {
  const errors = validateVenueProfile(form)
  return Object.entries(errors).map(([field, message]) => ({ field, message }))
}

export function formatAddress(form) {
  const values = form || {}
  const cityLine = [text(values.city).trim(), [text(values.state).trim(), text(values.zipCode).trim()].filter(Boolean).join(' ')].filter(Boolean).join(', ')
  return [text(values.addressLine1).trim(), text(values.addressLine2).trim(), cityLine].filter(Boolean).join(', ')
}

export function summarizeDescription(html, maxLength = 240) {
  const plain = stripHtmlText(sanitizeDescription(html))
  return plain.length > maxLength ? `${plain.slice(0, maxLength).trimEnd()}…` : plain
}

export function buildAddressPayload(form) {
  const values = form || {}
  return {
    addressLine1: text(values.addressLine1).trim(),
    addressLine2: text(values.addressLine2).trim() || null,
    city: text(values.city).trim(),
    state: toStateCode(values.state),
    zipCode: text(values.zipCode).trim(),
  }
}

// The venue API replaces the whole venue record, so everything it keeps is sent back. The moderation flag goes back
// unchanged because only staff may change it.
export function buildVenuePayload(form, { isPublished } = {}) {
  const values = form || {}
  return {
    venueID: values.venueID,
    name: text(values.name).trim(),
    addressID: values.addressID,
    externalLinkID: values.externalLinkID || null,
    phoneContactID: values.phoneContactID || null,
    description: sanitizeDescription(values.description) || null,
    eventSourceUrl: text(values.eventSourceUrl).trim() || null,
    isPublished: isPublished === undefined ? Boolean(values.isPublished) : Boolean(isPublished),
    isModerationBlocked: Boolean(values.isModerationBlocked),
  }
}

async function put(fetchFn, url, body, action) {
  let response
  try {
    response = await fetchFn(url, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
  } catch {
    return { ok: false, message: `Could not ${action}. Check your connection and try again.` }
  }

  if (!response.ok) return { ok: false, message: getApiErrorMessage(await response.text(), response.status, action) }
  return { ok: true }
}

async function reload(fetchFn, venueId) {
  try {
    const response = await fetchFn(`/api/venue/byID/${venueId}`)
    return response.ok ? await response.json() : null
  } catch {
    return null
  }
}

// Saves the profile step: the venue record, then its address. The venue goes first because saving it points it at the
// address it already has; the address call may give the venue a new address row, so the venue is loaded again after.
// Returns { ok, message, venue }. `venue` is the fresh copy from the API, or null when it could not be loaded.
export async function saveVenueProfile({ form, isPublished, fetchFn = fetch }) {
  const venueId = form?.venueID
  if (!venueId || !form?.addressID) {
    return { ok: false, message: 'The venue details could not be loaded. Refresh the page and try again.', venue: null }
  }

  const venueResult = await put(fetchFn, `/api/venue/${venueId}`, buildVenuePayload(form, { isPublished }), 'save the venue')
  if (!venueResult.ok) return { ...venueResult, venue: null }

  const addressResult = await put(fetchFn, `/api/venue/${venueId}/address`, buildAddressPayload(form), 'save the address')
  if (!addressResult.ok) {
    return { ok: false, message: `The venue details were saved, but the address was not. ${addressResult.message}`, venue: null }
  }

  return { ok: true, message: '', venue: await reload(fetchFn, venueId) }
}

// Publishes the venue: it must be complete first, and the venue is listed as soon as the API accepts it.
export async function publishVenue({ form, fetchFn = fetch }) {
  const problems = getPublishProblems(form)
  if (problems.length > 0) {
    return { ok: false, problems, message: `Finish these before publishing: ${problems.map((problem) => problem.message).join(' ')}` }
  }

  if (!form?.venueID || !form?.addressID) {
    return { ok: false, problems: [], message: 'The venue details could not be loaded. Refresh the page and try again.' }
  }

  const result = await put(fetchFn, `/api/venue/${form.venueID}`, buildVenuePayload(form, { isPublished: true }), 'publish the venue')
  return { ...result, problems: [] }
}

// Saves the categories, amenity tags and regions. Each is its own call; the first failure stops the rest and says which one.
export async function saveVenueDiscoverability({ venueId, form, fetchFn = fetch }) {
  if (!venueId) return { ok: false, message: 'The venue details could not be loaded. Refresh the page and try again.' }

  const steps = [
    { url: `/api/venue/${venueId}/categories`, body: { categoryIds: form?.categoryIds || [] }, action: 'save the categories' },
    { url: `/api/venue/${venueId}/tags`, body: { tags: form?.tags || [] }, action: 'save the amenity tags' },
    { url: `/api/venue/${venueId}/regions`, body: { regionIds: form?.regionIds || [] }, action: 'save the regions' },
  ]

  for (const step of steps) {
    const result = await put(fetchFn, step.url, step.body, step.action)
    if (!result.ok) return result
  }

  return { ok: true, message: '' }
}

export function toggleId(ids, id) {
  const current = Array.isArray(ids) ? ids : []
  return current.includes(id) ? current.filter((item) => item !== id) : [...current, id]
}

// Categories to offer: the active ones in the API's order, then any the venue already has that were deactivated since.
export function mergeCategoryChoices(activeCategories, existingCategories) {
  const byId = new Map()
  for (const category of [...(Array.isArray(activeCategories) ? activeCategories : []), ...(Array.isArray(existingCategories) ? existingCategories : [])]) {
    const id = category && (category.venueCategoryID ?? category.VenueCategoryID)
    if (Number.isInteger(id) && !byId.has(id)) byId.set(id, { ...category, venueCategoryID: id, name: category.name ?? category.Name, isActive: category.isActive ?? category.IsActive })
  }
  return [...byId.values()]
}
