import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
  addEventHost,
  changeEventHostRole,
  describeRole,
  emptyHostForm,
  loadEventHosts,
  normalizeHosts,
  removeEventHost,
  validateHostForm,
} from './event-hosts.js'

const respond = (status, body = '') => async () => new Response(body, { status })

test('hosts are read in camelCase or PascalCase, and a missing response is safe', () => {
  const hosts = normalizeHosts({
    MyRole: 'Admin',
    CanManageHosts: false,
    Owner: { HostType: 'Venue', HostID: 3, Name: 'The Hall' },
    Hosts: [{ EventHostID: 7, HostType: 'User', HostID: 20, Name: 'sam', Role: 'CheckIn' }, { HostType: 'User' }],
  })
  assert.equal(hosts.myRole, 'Admin')
  assert.equal(hosts.canManageHosts, false)
  assert.deepEqual(hosts.owner, { type: 'Venue', id: 3, name: 'The Hall' })
  assert.deepEqual(hosts.hosts, [{ rowId: 7, type: 'User', id: 20, name: 'sam', role: 'CheckIn' }])

  const empty = normalizeHosts(null)
  assert.equal(empty.myRole, 'None')
  assert.equal(empty.owner, null)
  assert.deepEqual(empty.hosts, [])
})

test('roles have friendly names, and the owner is never assignable', () => {
  assert.equal(describeRole('CheckIn'), 'Check-in')
  assert.equal(describeRole('Owner'), 'Owner')
  assert.equal(describeRole('nonsense'), 'No access')
  assert.ok(validateHostForm({ hostType: 'User', hostId: '5', role: 'Owner' }).role)
})

test('the add-host form checks the type, the id and the role', () => {
  assert.deepEqual(validateHostForm({ hostType: 'Artist', hostId: '12', role: 'Admin' }), {})
  assert.deepEqual(Object.keys(validateHostForm(emptyHostForm())), ['hostId'])
  assert.ok(validateHostForm({ hostType: 'Band', hostId: '1', role: 'Admin' }).hostType)
  assert.ok(validateHostForm({ hostType: 'User', hostId: '-4', role: 'Admin' }).hostId)
  assert.ok(validateHostForm({ hostType: 'User', hostId: '2.5', role: 'Admin' }).hostId)
})

test('adding a host posts the type, id and role to the event', async () => {
  let call
  const result = await addEventHost({
    eventId: 9,
    form: { hostType: 'Venue', hostId: ' 4 ', role: 'Staff' },
    fetchFn: async (path, init) => { call = { path, init }; return new Response('{}', { status: 201 }) },
  })
  assert.ok(result.ok)
  assert.equal(call.path, '/api/event/9/hosts')
  assert.equal(call.init.method, 'POST')
  assert.deepEqual(JSON.parse(call.init.body), { hostType: 'Venue', hostID: 4, role: 'Staff' })
})

test('changing and removing a host use the host row', async () => {
  const calls = []
  const fetchFn = async (path, init) => { calls.push([init.method, path, init.body]); return new Response('', { status: 204 }) }
  await changeEventHostRole({ eventId: 9, hostRowId: 3, role: 'Admin', fetchFn })
  await removeEventHost({ eventId: 9, hostRowId: 3, fetchFn })
  assert.deepEqual(calls, [['PUT', '/api/event/9/hosts/3', '{"role":"Admin"}'], ['DELETE', '/api/event/9/hosts/3', undefined]])
})

test('loading returns the normalized list; refusals say why and a network failure is not thrown', async () => {
  const ok = await loadEventHosts({ eventId: 9, fetchFn: respond(200, JSON.stringify({ myRole: 'Owner', canManageHosts: true, hosts: [] })) })
  assert.equal(ok.data.canManageHosts, true)

  const refused = await addEventHost({ eventId: 9, form: { hostType: 'User', hostId: '1', role: 'Admin' }, fetchFn: respond(409, JSON.stringify({ message: 'That host is already on this event.' })) })
  assert.equal(refused.ok, false)
  assert.match(refused.message, /already on this event/)

  const down = await removeEventHost({ eventId: 9, hostRowId: 1, fetchFn: async () => { throw new Error('offline') } })
  assert.equal(down.ok, false)
  assert.match(down.message, /connection/)
})
