import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
  buildEventPayload,
  changeEventStatus,
  createVenueEvent,
  deleteVenueEvent,
  describeEventStatus,
  emptyEventForm,
  eventToForm,
  getEventPublishProblems,
  getStatusName,
  isEditableStatus,
  loadManagedVenue,
  normalizeEvent,
  splitEvents,
  updateVenueEvent,
  validateEventForm,
} from './venue-events.js'

const NOW = new Date('2026-06-15T12:00:00Z')

const validForm = () => ({
  title: 'Open Mic',
  description: '<p>Come and play</p>',
  pointOfContact: 'events@example.com',
  startTime: '2026-07-01T19:00',
  endTime: '2026-07-01T22:00',
  doors: '2026-07-01T18:30',
  cost: '10',
  minimumAge: '18',
  maxOccupancy: '120',
})

test('the status is read from a name or a number, in either casing', () => {
  assert.equal(getStatusName({ status: 'Published' }), 'Published')
  assert.equal(getStatusName({ Status: 'Cancelled' }), 'Cancelled')
  assert.equal(getStatusName({ statusID: 2 }), 'Published')
  assert.equal(getStatusName({ StatusID: '4' }), 'Cancelled')
  assert.equal(getStatusName({}), 'Draft')
  assert.equal(getStatusName({ status: 'Mystery' }), 'Draft')
})

test('every status has a label, and only live ones can be edited by an owner', () => {
  assert.equal(describeEventStatus('Published').label, 'Published')
  assert.equal(describeEventStatus('ModerationBlocked').label, 'Blocked')
  assert.equal(describeEventStatus('nonsense').label, 'Draft')
  assert.deepEqual(['Draft', 'PendingReview', 'Published'].map(isEditableStatus), [true, true, true])
  assert.deepEqual(['Cancelled', 'Archived', 'ModerationBlocked'].map(isEditableStatus), [false, false, false])
})

test('an event is read in camelCase or PascalCase, and a missing one is safe', () => {
  const camel = normalizeEvent({ eventID: 4, title: ' Jam ', status: 'Draft', canManage: true, artist: { title: 'The Band' }, venueID: 1 })
  assert.equal(camel.id, 4)
  assert.equal(camel.title, 'Jam')
  assert.equal(camel.canManage, true)
  assert.equal(camel.artistName, 'The Band')

  const pascal = normalizeEvent({ EventID: 5, Title: 'Gig', Status: 'Published', CanManage: false, Artist: { Title: 'Duo' }, VenueID: 2, DescriptionRichtext: '<p>x</p>' })
  assert.equal(pascal.id, 5)
  assert.equal(pascal.artistName, 'Duo')
  assert.equal(pascal.descriptionHtml, '<p>x</p>')

  const nothing = normalizeEvent(null)
  assert.equal(nothing.id, null)
  assert.equal(nothing.canManage, false)
  assert.equal(nothing.artistId, null)
})

test('a caller who cannot be told to manage an event is not given the buttons', () => {
  assert.equal(normalizeEvent({ eventID: 1 }).canManage, false)
  assert.equal(normalizeEvent({ eventID: 1, canManage: null }).canManage, false)
  assert.equal(normalizeEvent({ eventID: 1, canManage: 'true' }).canManage, false)
})

test('events are split into upcoming (soonest first) and past (latest first); a running event is upcoming', () => {
  const rows = [
    { eventID: 1, title: 'Later', startTime: '2026-08-01T19:00:00Z', endTime: '2026-08-01T22:00:00Z' },
    { eventID: 2, title: 'Sooner', startTime: '2026-07-01T19:00:00Z', endTime: '2026-07-01T22:00:00Z' },
    { eventID: 3, title: 'Old', startTime: '2026-05-01T19:00:00Z', endTime: '2026-05-01T22:00:00Z' },
    { eventID: 4, title: 'Older', startTime: '2026-04-01T19:00:00Z', endTime: '2026-04-01T22:00:00Z' },
    { eventID: 5, title: 'Running', startTime: '2026-06-15T10:00:00Z', endTime: '2026-06-15T14:00:00Z' },
    { eventID: 6, title: 'No end', startTime: '2026-06-20T10:00:00Z' },
    { title: 'No id', startTime: '2026-06-20T10:00:00Z' },
  ]

  const { upcoming, past } = splitEvents(rows, NOW)

  assert.deepEqual(upcoming.map((event) => event.title), ['Running', 'No end', 'Sooner', 'Later'])
  assert.deepEqual(past.map((event) => event.title), ['Old', 'Older'])
})

test('cancelled and draft events are still listed, with their status', () => {
  const { upcoming } = splitEvents([
    { eventID: 1, title: 'Gone', status: 'Cancelled', startTime: '2026-07-01T19:00:00Z', endTime: '2026-07-01T22:00:00Z' },
    { eventID: 2, title: 'Plan', status: 'Draft', startTime: '2026-07-02T19:00:00Z', endTime: '2026-07-02T22:00:00Z' },
  ], NOW)

  assert.deepEqual(upcoming.map((event) => [event.title, event.status]), [['Gone', 'Cancelled'], ['Plan', 'Draft']])
})

test('splitting anything that is not a list gives empty lists', () => {
  assert.deepEqual(splitEvents(null, NOW), { upcoming: [], past: [] })
  assert.deepEqual(splitEvents('nope', NOW), { upcoming: [], past: [] })
})

test('an event becomes form values and back into the API body', () => {
  const form = eventToForm({
    eventID: 9,
    title: 'Open Mic',
    descriptionRichtext: '<p>Come</p>',
    pointOfContact: 'a@b.co',
    startTime: '2026-07-01T19:00:00Z',
    endTime: '2026-07-01T22:00:00Z',
    doors: '2026-07-01T18:30:00Z',
    cost: 12.5,
    minimumAge: 0,
    maxOccupancy: 80,
  })

  assert.equal(form.startTime, '2026-07-01T19:00')
  assert.equal(form.doors, '2026-07-01T18:30')
  assert.equal(form.cost, '12.5')
  assert.equal(form.minimumAge, '')
  assert.equal(form.maxOccupancy, '80')

  const payload = buildEventPayload(form)
  assert.equal(payload.startTime, '2026-07-01T19:00:00Z')
  assert.equal(payload.doors, '2026-07-01T18:30:00Z')
  assert.equal(payload.cost, 12.5)
  assert.equal(payload.minimumAge, 0)
  assert.equal(payload.description, '<p>Come</p>')
})

test('blank numbers are zero, and blank doors open when the event starts', () => {
  const payload = buildEventPayload({ ...validForm(), cost: '', minimumAge: ' ', maxOccupancy: '', doors: '' })

  assert.equal(payload.cost, 0)
  assert.equal(payload.minimumAge, 0)
  assert.equal(payload.maxOccupancy, 0)
  assert.equal(payload.doors, payload.startTime)
})

test('a good form has no errors, and a blank one asks for a title and times', () => {
  assert.deepEqual(validateEventForm(validForm()), {})

  const errors = validateEventForm(emptyEventForm())
  assert.deepEqual(Object.keys(errors).sort(), ['endTime', 'startTime', 'title'])
})

test('the form checks the title, the times and the numbers', () => {
  assert.ok(validateEventForm({ ...validForm(), title: 'x'.repeat(256) }).title)
  assert.ok(validateEventForm({ ...validForm(), endTime: '2026-07-01T19:00' }).endTime)
  assert.ok(validateEventForm({ ...validForm(), endTime: '2026-06-30T19:00' }).endTime)
  assert.ok(validateEventForm({ ...validForm(), doors: 'soon' }).doors)
  assert.ok(validateEventForm({ ...validForm(), cost: '-1' }).cost)
  assert.ok(validateEventForm({ ...validForm(), cost: 'free' }).cost)
  assert.ok(validateEventForm({ ...validForm(), minimumAge: '500' }).minimumAge)
  assert.ok(validateEventForm({ ...validForm(), minimumAge: '18.5' }).minimumAge)
  assert.ok(validateEventForm({ ...validForm(), maxOccupancy: '-5' }).maxOccupancy)
  assert.ok(validateEventForm({ ...validForm(), pointOfContact: 'x'.repeat(1001) }).pointOfContact)
  assert.deepEqual(validateEventForm({ ...validForm(), cost: '0', minimumAge: '0', maxOccupancy: '' }), {})
})

test('a complete event has nothing left before it can be published', () => {
  assert.deepEqual(getEventPublishProblems(validForm(), NOW), [])
})

test('publishing is blocked, with plain reasons, until the minimum information is there', () => {
  const problems = getEventPublishProblems({ ...emptyEventForm(), title: 'Draft' }, NOW)

  assert.ok(problems.includes('Add a description.'))
  assert.ok(problems.includes('Add a point of contact.'))
  assert.ok(problems.includes('Choose when the event starts and ends.'))
})

test('a description that is only empty markup does not count', () => {
  assert.ok(getEventPublishProblems({ ...validForm(), description: '<p> </p><p><br></p>' }, NOW).includes('Add a description.'))
})

test('doors after the start, an end before the start and an event long over are all reasons not to publish', () => {
  assert.ok(getEventPublishProblems({ ...validForm(), doors: '2026-07-01T20:00' }, NOW).includes('Doors must open at or before the start time.'))
  assert.ok(getEventPublishProblems({ ...validForm(), endTime: '2026-07-01T18:00' }, NOW).includes('The end time must be after the start time.'))
  assert.ok(getEventPublishProblems({ ...validForm(), startTime: '2026-05-01T19:00', endTime: '2026-05-01T22:00', doors: '' }, NOW).includes('The event has already ended.'))
})

// ---- API calls

const respond = (status, body = '') => async () => new Response(body, { status })

test('the portal loads a venue the visitor manages, and sends everyone else away', async () => {
  const req = { cookies: { 'next-auth.session-token': 'token' } }
  const fetchApi = (access) => async (path) => {
    if (path.startsWith('/venue/by-slug/') || path.startsWith('/venue/byID/')) return new Response(JSON.stringify({ venueID: 7, name: 'Test Hall' }), { status: 200 })
    if (path === '/venue/7/access') return new Response(JSON.stringify(access), { status: 200 })
    return new Response('', { status: 404 })
  }

  const owner = await loadManagedVenue({ req, slug: ' Test-Hall ', fetchApi: fetchApi({ canManage: true }) })
  const stranger = await loadManagedVenue({ req, slug: 'test-hall', fetchApi: fetchApi({ canManage: false }) })
  const signedOut = await loadManagedVenue({ req: { cookies: {} }, slug: 'test-hall', fetchApi: fetchApi({ canManage: true }) })
  const missing = await loadManagedVenue({ req, slug: 'nope', fetchApi: async () => new Response('', { status: 404 }) })

  assert.deepEqual(owner, { venue: { id: 7, name: 'Test Hall', slug: 'test-hall' } })
  assert.equal(stranger.redirect, '/portal/venue')
  assert.ok(signedOut.redirect || signedOut.notFound)
  assert.equal(signedOut.venue, undefined)
  assert.equal(missing.notFound, true)
})

test('creating an event posts the body to the venue and returns the new event', async () => {
  const calls = []
  const fetchFn = async (path, init) => {
    calls.push({ path, method: init.method, body: JSON.parse(init.body) })
    return new Response(JSON.stringify({ eventID: 12, title: 'Open Mic', status: 'Draft', canManage: true }), { status: 201 })
  }

  const result = await createVenueEvent({ venueId: 3, form: validForm(), fetchFn })

  assert.equal(result.ok, true)
  assert.equal(result.event.id, 12)
  assert.equal(result.event.status, 'Draft')
  assert.equal(calls[0].path, '/api/event/venue/3')
  assert.equal(calls[0].method, 'POST')
  assert.equal(calls[0].body.title, 'Open Mic')
})

test('saving changes puts the body to the event details', async () => {
  const calls = []
  const fetchFn = async (path, init) => {
    calls.push({ path, method: init.method })
    return new Response(JSON.stringify({ eventID: 12, title: 'Renamed' }), { status: 200 })
  }

  const result = await updateVenueEvent({ eventId: 12, form: validForm(), fetchFn })

  assert.equal(result.ok, true)
  assert.deepEqual(calls, [{ path: '/api/event/12/details', method: 'PUT' }])
})

test('publish problems from the API are passed on as a list', async () => {
  const body = JSON.stringify({ message: 'This event is not ready to publish.', problems: ['Add a description.', 'Add a point of contact.'] })

  const result = await changeEventStatus({ eventId: 4, action: 'publish', fetchFn: respond(400, body) })

  assert.equal(result.ok, false)
  assert.equal(result.message, 'This event is not ready to publish.')
  assert.deepEqual(result.problems, ['Add a description.', 'Add a point of contact.'])
})

test('a refusal says why, with a fallback when the body is empty', async () => {
  const forbidden = await changeEventStatus({ eventId: 4, action: 'cancel', fetchFn: respond(403, JSON.stringify({ message: 'You are not allowed to change this event.' })) })
  const empty = await changeEventStatus({ eventId: 4, action: 'cancel', fetchFn: respond(500) })

  assert.equal(forbidden.message, 'You are not allowed to change this event.')
  assert.equal(empty.message, 'Unable to cancel the event (500).')
})

test('a network failure is reported, not thrown', async () => {
  const result = await updateVenueEvent({ eventId: 1, form: validForm(), fetchFn: async () => { throw new Error('offline') } })

  assert.equal(result.ok, false)
  assert.match(result.message, /connection/)
})

test('only publish, unpublish and cancel are accepted as status actions', async () => {
  let called = false
  const result = await changeEventStatus({ eventId: 1, action: 'delete-everything', fetchFn: async () => { called = true; return new Response('', { status: 200 }) } })

  assert.equal(result.ok, false)
  assert.equal(called, false)
})

test('deleting a draft succeeds on an empty response', async () => {
  const calls = []
  const result = await deleteVenueEvent({ eventId: 7, fetchFn: async (path, init) => { calls.push({ path, method: init.method }); return new Response(null, { status: 204 }) } })

  assert.equal(result.ok, true)
  assert.deepEqual(calls, [{ path: '/api/event/7', method: 'DELETE' }])
})
