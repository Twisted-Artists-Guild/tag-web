import { fetchVenueAccess, fetchVenueForPage, getApiErrorMessage, getEditRedirect } from './venue-form.js'
import { formatEventWhen } from './venue-page.js'
// A relative import, because the unit tests run in plain Node, which does not know the "@/" alias.
// eslint-disable-next-line import/no-relative-parent-imports
import { stripHtmlText } from '../components/security/sanitize.js'

// What the venue portal needs to list, edit and publish a venue's events. The rules here mirror the API's (which are the
// ones that count), so the form can say what is missing before the owner presses Publish.

const text = (value) => String(value ?? '').trim()

// For getServerSideProps of the venue portal pages: loads the venue and checks, with the API, that the visitor manages it.
// Returns { venue }, or { notFound: true }, or { redirect } for someone who may not manage this venue.
export async function loadManagedVenue({ req, slug, fetchApi }) {
  const normalizedSlug = text(slug).toLowerCase()
  const venueData = await fetchVenueForPage({ req, slug: normalizedSlug, fetchApi })
  const venueId = Number(venueData?.venueID ?? venueData?.VenueID ?? venueData?.id ?? venueData?.ID) || null
  if (!venueId) return { notFound: true }

  const redirect = getEditRedirect(await fetchVenueAccess({ req, id: venueId, fetchApi }))
  if (redirect) return { redirect }

  return { venue: { id: venueId, name: text(venueData.name ?? venueData.Name), slug: normalizedSlug } }
}

export const MAX_TITLE_LENGTH = 255
export const MAX_POINT_OF_CONTACT_LENGTH = 1000
export const MAX_DESCRIPTION_LENGTH = 50000

const STATUS_BY_NUMBER = { 0: 'Draft', 1: 'PendingReview', 2: 'Published', 3: 'Archived', 4: 'Cancelled', 5: 'ModerationBlocked' }

const STATUS_LABELS = {
  Draft: { label: 'Draft', tone: 'badge-ghost', hint: 'Only you can see this. Publish it when it is ready.' },
  PendingReview: { label: 'In review', tone: 'badge-warning', hint: 'Waiting for review.' },
  Published: { label: 'Published', tone: 'badge-success', hint: 'Visible to everyone.' },
  Archived: { label: 'Archived', tone: 'badge-neutral', hint: 'No longer shown.' },
  Cancelled: { label: 'Cancelled', tone: 'badge-error', hint: 'This event was cancelled.' },
  ModerationBlocked: { label: 'Blocked', tone: 'badge-error', hint: 'Blocked by staff. Contact staff to find out why.' },
}

export function getStatusName(raw) {
  const value = raw?.status ?? raw?.Status ?? raw?.statusID ?? raw?.StatusID
  if (typeof value === 'number') return STATUS_BY_NUMBER[value] || 'Draft'
  const name = text(value)
  if (STATUS_LABELS[name]) return name
  return STATUS_BY_NUMBER[Number(name)] || 'Draft'
}

export function describeEventStatus(statusName) {
  return STATUS_LABELS[statusName] || STATUS_LABELS.Draft
}

// The owner can still change an event in these states. Anything else is finished or in staff hands.
export function isEditableStatus(statusName) {
  return statusName === 'Draft' || statusName === 'PendingReview' || statusName === 'Published'
}

// A flat, safe view of an event from the API, which may use camelCase or PascalCase.
export function normalizeEvent(raw) {
  const read = (...keys) => keys.map((key) => raw?.[key]).find((value) => value !== undefined && value !== null)
  const id = Number(read('eventID', 'EventID'))
  const status = getStatusName(raw)
  return {
    id: Number.isInteger(id) && id > 0 ? id : null,
    title: text(read('title', 'Title')),
    path: text(read('path', 'Path')),
    status,
    statusInfo: describeEventStatus(status),
    startTime: text(read('startTime', 'StartTime')),
    endTime: text(read('endTime', 'EndTime')),
    doors: text(read('doors', 'Doors')),
    cost: read('cost', 'Cost') ?? 0,
    minimumAge: read('minimumAge', 'MinimumAge') ?? 0,
    maxOccupancy: read('maxOccupancy', 'MaxOccupancy') ?? 0,
    pointOfContact: text(read('pointOfContact', 'PointOfContact')),
    descriptionHtml: String(read('descriptionRichtext', 'DescriptionRichtext', 'description', 'Description') ?? ''),
    venueId: Number(read('venueID', 'VenueID')) || null,
    artistId: Number(read('artistID', 'ArtistID')) || null,
    artistName: text(raw?.artist?.title ?? raw?.Artist?.Title ?? raw?.artist?.Title ?? raw?.Artist?.title),
    canManage: read('canManage', 'CanManage') === true,
  }
}

// The API sends UTC times and the site shows them as the wall-clock text, so compare the same way.
const clock = (value) => (/^\d{4}-\d{2}-\d{2}[T ]\d{2}:\d{2}/.test(text(value)) ? text(value).replace(' ', 'T').slice(0, 16) : '')

// Events that have not finished, soonest first, and the ones that have, most recent first.
export function splitEvents(events, now = new Date()) {
  const today = now.toISOString().slice(0, 16)
  const upcoming = []
  const past = []
  for (const raw of Array.isArray(events) ? events : []) {
    const event = raw?.statusInfo ? raw : normalizeEvent(raw)
    if (event.id === null) continue
    const start = clock(event.startTime)
    const end = clock(event.endTime)
    const finish = end && end >= start ? end : start
    ;(finish && finish < today ? past : upcoming).push(event)
  }

  upcoming.sort((a, b) => clock(a.startTime).localeCompare(clock(b.startTime)))
  past.sort((a, b) => clock(b.startTime).localeCompare(clock(a.startTime)))
  return { upcoming, past }
}

export function describeWhen(event) {
  return formatEventWhen(event?.startTime) || 'No date yet'
}

// ---- the form

export function emptyEventForm() {
  return { title: '', description: '', pointOfContact: '', startTime: '', endTime: '', doors: '', cost: '', minimumAge: '', maxOccupancy: '' }
}

// A date-time input wants YYYY-MM-DDTHH:mm.
export function toInputTime(value) {
  return clock(value)
}

export function eventToForm(raw) {
  const event = raw?.statusInfo ? raw : normalizeEvent(raw)
  const number = (value) => (Number(value) > 0 ? String(value) : '')
  return {
    title: event.title,
    description: event.descriptionHtml,
    pointOfContact: event.pointOfContact,
    startTime: toInputTime(event.startTime),
    endTime: toInputTime(event.endTime),
    doors: toInputTime(event.doors),
    cost: number(event.cost),
    minimumAge: number(event.minimumAge),
    maxOccupancy: number(event.maxOccupancy),
  }
}

const fromInputTime = (value) => `${value}:00Z`

function checkNumber(value, { min, max, integer, label }) {
  const raw = text(value)
  if (!raw) return ''
  const number = Number(raw)
  if (!Number.isFinite(number)) return `${label} must be a number.`
  if (integer && !Number.isInteger(number)) return `${label} must be a whole number.`
  if (number < min || number > max) return `${label} must be between ${min.toLocaleString('en-US')} and ${max.toLocaleString('en-US')}.`
  return ''
}

// What is wrong with the form for saving a draft. A draft only needs a title and when it happens.
export function validateEventForm(form) {
  const errors = {}
  const title = text(form?.title)
  if (!title) errors.title = 'Enter a title.'
  else if (title.length > MAX_TITLE_LENGTH) errors.title = `The title can be at most ${MAX_TITLE_LENGTH} characters.`

  const start = clock(form?.startTime)
  const end = clock(form?.endTime)
  if (!start) errors.startTime = 'Choose when the event starts.'
  if (!end) errors.endTime = 'Choose when the event ends.'
  if (start && end && end <= start) errors.endTime = 'The end must be after the start.'
  if (text(form?.doors) && !clock(form.doors)) errors.doors = 'Choose a valid time for doors.'

  const cost = checkNumber(form?.cost, { min: 0, max: 1000000, integer: false, label: 'The cost' })
  if (cost) errors.cost = cost
  const age = checkNumber(form?.minimumAge, { min: 0, max: 120, integer: true, label: 'The minimum age' })
  if (age) errors.minimumAge = age
  const occupancy = checkNumber(form?.maxOccupancy, { min: 0, max: 1000000, integer: true, label: 'The capacity' })
  if (occupancy) errors.maxOccupancy = occupancy

  if (text(form?.pointOfContact).length > MAX_POINT_OF_CONTACT_LENGTH) errors.pointOfContact = `This can be at most ${MAX_POINT_OF_CONTACT_LENGTH} characters.`
  if (String(form?.description ?? '').length > MAX_DESCRIPTION_LENGTH) errors.description = 'The description is too long.'
  return errors
}

// What the event still needs before it can be published, in plain sentences. The API checks the same things.
export function getEventPublishProblems(form, now = new Date()) {
  const problems = []
  if (!text(form?.title)) problems.push('Add a title.')
  if (!stripHtmlText(String(form?.description ?? '')).trim()) problems.push('Add a description.')
  if (!text(form?.pointOfContact)) problems.push('Add a point of contact.')

  const start = clock(form?.startTime)
  const end = clock(form?.endTime)
  if (!start || !end) problems.push('Choose when the event starts and ends.')
  else if (end <= start) problems.push('The end time must be after the start time.')
  if (start && clock(form?.doors) && clock(form.doors) > start) problems.push('Doors must open at or before the start time.')
  if (end && end < new Date(now.getTime() - 14 * 3600 * 1000).toISOString().slice(0, 16)) problems.push('The event has already ended.')
  return problems
}

// The body for create and update. A blank number means none, and blank doors means doors open when the event starts.
export function buildEventPayload(form) {
  const number = (value) => (text(value) ? Number(value) : 0)
  return {
    title: text(form.title),
    description: String(form.description ?? ''),
    pointOfContact: text(form.pointOfContact),
    startTime: fromInputTime(clock(form.startTime)),
    endTime: fromInputTime(clock(form.endTime)),
    doors: fromInputTime(clock(form.doors) || clock(form.startTime)),
    cost: number(form.cost),
    minimumAge: number(form.minimumAge),
    maxOccupancy: number(form.maxOccupancy),
  }
}

// ---- API calls. Each returns { ok, message, problems, event }, and never throws.

async function readBody(response) {
  const body = await response.text().catch(() => '')
  let data = null
  try { data = JSON.parse(body) } catch { /* not JSON */ }
  return { body, data }
}

async function send({ path, method, payload, action, fetchFn }) {
  let response
  try {
    response = await fetchFn(path, {
      method,
      headers: payload ? { 'Content-Type': 'application/json' } : undefined,
      body: payload ? JSON.stringify(payload) : undefined,
    })
  } catch {
    return { ok: false, message: `Could not ${action}. Check your connection and try again.`, problems: [], event: null }
  }

  const { body, data } = await readBody(response)
  if (!response.ok) {
    const problems = Array.isArray(data?.problems) ? data.problems.map(String) : []
    return { ok: false, message: getApiErrorMessage(body, response.status, action), problems, event: null }
  }

  return { ok: true, message: '', problems: [], event: data && typeof data === 'object' ? normalizeEvent(data) : null }
}

export function createVenueEvent({ venueId, form, fetchFn = fetch }) {
  return send({ path: `/api/event/venue/${Number(venueId)}`, method: 'POST', payload: buildEventPayload(form), action: 'create the event', fetchFn })
}

export function updateVenueEvent({ eventId, form, fetchFn = fetch }) {
  return send({ path: `/api/event/${Number(eventId)}/details`, method: 'PUT', payload: buildEventPayload(form), action: 'save the event', fetchFn })
}

const STATUS_ACTIONS = { publish: 'publish the event', unpublish: 'unpublish the event', cancel: 'cancel the event' }

export function changeEventStatus({ eventId, action, fetchFn = fetch }) {
  if (!STATUS_ACTIONS[action]) return Promise.resolve({ ok: false, message: 'That action is not available.', problems: [], event: null })
  return send({ path: `/api/event/${Number(eventId)}/${action}`, method: 'POST', action: STATUS_ACTIONS[action], fetchFn })
}

export async function deleteVenueEvent({ eventId, fetchFn = fetch }) {
  return send({ path: `/api/event/${Number(eventId)}`, method: 'DELETE', action: 'delete the event', fetchFn })
}
