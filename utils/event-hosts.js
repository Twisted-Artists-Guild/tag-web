import { getApiErrorMessage } from './venue-form.js'

// The collaborators of an event and their roles (story #421). The rules mirror the API's, which are the ones that count.

const text = (value) => String(value ?? '').trim()

export const EVENT_HOST_ROLES = [
  { value: 'Admin', label: 'Admin', hint: 'Can edit, publish and cancel the event, and check tickets in.' },
  { value: 'Staff', label: 'Staff', hint: 'Can see the event and check tickets in.' },
  { value: 'CheckIn', label: 'Check-in', hint: 'Can see the event and check tickets in.' },
  { value: 'ReadOnly', label: 'Read only', hint: 'Can see the event, including while it is a draft.' },
]

export const EVENT_HOST_TYPES = [
  { value: 'User', label: 'Person (user id)' },
  { value: 'Artist', label: 'Artist (artist id)' },
  { value: 'Venue', label: 'Venue (venue id)' },
]

export function describeRole(role) {
  if (role === 'Owner') return 'Owner'
  return EVENT_HOST_ROLES.find((item) => item.value === role)?.label || 'No access'
}

// A flat, safe view of the hosts response, which may use camelCase or PascalCase.
export function normalizeHosts(raw) {
  const read = (source, ...keys) => keys.map((key) => source?.[key]).find((value) => value !== undefined && value !== null)
  const owner = raw?.owner ?? raw?.Owner
  const hosts = Array.isArray(raw?.hosts ?? raw?.Hosts) ? (raw.hosts ?? raw.Hosts) : []
  return {
    myRole: text(read(raw, 'myRole', 'MyRole')) || 'None',
    canManageHosts: read(raw, 'canManageHosts', 'CanManageHosts') === true,
    owner: owner ? { type: text(read(owner, 'hostType', 'HostType')), id: Number(read(owner, 'hostID', 'HostID')) || null, name: text(read(owner, 'name', 'Name')) } : null,
    hosts: hosts
      .map((host) => ({
        rowId: Number(read(host, 'eventHostID', 'EventHostID')) || null,
        type: text(read(host, 'hostType', 'HostType')),
        id: Number(read(host, 'hostID', 'HostID')) || null,
        name: text(read(host, 'name', 'Name')),
        role: text(read(host, 'role', 'Role')),
      }))
      .filter((host) => host.rowId !== null),
  }
}

export function emptyHostForm() {
  return { hostType: 'User', hostId: '', role: 'ReadOnly' }
}

// What is wrong with the "add a host" form.
export function validateHostForm(form) {
  const errors = {}
  if (!EVENT_HOST_TYPES.some((item) => item.value === form?.hostType)) errors.hostType = 'Choose who you are adding.'
  const id = Number(text(form?.hostId))
  if (!text(form?.hostId)) errors.hostId = 'Enter the id.'
  else if (!Number.isInteger(id) || id <= 0) errors.hostId = 'The id must be a whole number above zero.'
  if (!EVENT_HOST_ROLES.some((item) => item.value === form?.role)) errors.role = 'Choose a role.'
  return errors
}

// ---- API calls. Each returns { ok, message, data }, and never throws.

async function send({ path, method, payload, action, fetchFn }) {
  let response
  try {
    response = await fetchFn(path, {
      method,
      headers: payload ? { 'Content-Type': 'application/json' } : undefined,
      body: payload ? JSON.stringify(payload) : undefined,
    })
  } catch {
    return { ok: false, message: `Could not ${action}. Check your connection and try again.`, data: null }
  }

  const body = await response.text().catch(() => '')
  if (!response.ok) return { ok: false, message: getApiErrorMessage(body, response.status, action), data: null }

  let data = null
  try { data = JSON.parse(body) } catch { /* an empty body */ }
  return { ok: true, message: '', data }
}

const base = (eventId) => `/api/event/${Number(eventId)}/hosts`

export async function loadEventHosts({ eventId, fetchFn = fetch }) {
  const result = await send({ path: base(eventId), method: 'GET', action: 'load the hosts', fetchFn })
  return result.ok ? { ...result, data: normalizeHosts(result.data) } : result
}

export function addEventHost({ eventId, form, fetchFn = fetch }) {
  return send({
    path: base(eventId),
    method: 'POST',
    payload: { hostType: form.hostType, hostID: Number(text(form.hostId)), role: form.role },
    action: 'add the host',
    fetchFn,
  })
}

export function changeEventHostRole({ eventId, hostRowId, role, fetchFn = fetch }) {
  return send({ path: `${base(eventId)}/${Number(hostRowId)}`, method: 'PUT', payload: { role }, action: 'change the role', fetchFn })
}

export function removeEventHost({ eventId, hostRowId, fetchFn = fetch }) {
  return send({ path: `${base(eventId)}/${Number(hostRowId)}`, method: 'DELETE', action: 'remove the host', fetchFn })
}
