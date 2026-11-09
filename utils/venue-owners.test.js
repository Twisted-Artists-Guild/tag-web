import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
  buildAdminVenuesQuery,
  canSearchUsers,
  ownerLabel,
  mergeVenuePages,
  withOwnerAdded,
  withOwnerRemoved,
  hasNoOwner,
  selectableUsers,
} from './venue-owners.js'
import { getApiErrorMessage } from './venue-form.js'

const ann = { userID: 10, displayName: 'Ann Lee', email: 'ann@example.com' }
const bee = { userID: 20, displayName: 'bee keeper', email: 'bee@example.com' }

test('the venue list query leaves out empty options and keeps the cursor and page size', () => {
  assert.equal(buildAdminVenuesQuery(), 'limit=25')
  assert.equal(
    buildAdminVenuesQuery({ search: '  Test Hall ', unownedOnly: true, afterId: 7, limit: 10 }),
    'search=Test+Hall&unownedOnly=true&afterId=7&limit=10'
  )
  for (const afterId of [0, -3, 1.5, 'abc', undefined, null]) {
    assert.ok(!buildAdminVenuesQuery({ afterId }).includes('afterId'))
  }
  assert.ok(!buildAdminVenuesQuery({ unownedOnly: false }).includes('unownedOnly'))
})

test('user search needs at least two characters once trimmed', () => {
  for (const term of [undefined, null, '', ' ', 'a', ' a ']) assert.equal(canSearchUsers(term), false)
  for (const term of ['an', ' an ', 'ann']) assert.equal(canSearchUsers(term), true)
})

test('an owner label shows the email to tell apart users who share a name', () => {
  assert.equal(ownerLabel(ann), 'Ann Lee (ann@example.com)')
  assert.equal(ownerLabel({ userID: 5, displayName: 'ann@example.com', email: 'ann@example.com' }), 'ann@example.com')
  assert.equal(ownerLabel({ userID: 5, displayName: '', email: '' }), 'User 5')
  assert.equal(ownerLabel(undefined), 'User')
})

test('loading more venues appends only the venues not already listed', () => {
  const first = [{ venueID: 1 }, { venueID: 2 }]
  const merged = mergeVenuePages(first, [{ venueID: 2 }, { venueID: 3 }, null])
  assert.deepEqual(merged.map((row) => row.venueID), [1, 2, 3])
  assert.deepEqual(mergeVenuePages(undefined, [{ venueID: 9 }]), [{ venueID: 9 }])
  assert.deepEqual(mergeVenuePages(first, undefined), first)
})

test('adding an owner updates only that venue, keeps owners sorted by name and ignores duplicates', () => {
  const rows = [{ venueID: 1, owners: [bee] }, { venueID: 2, owners: [] }]
  const next = withOwnerAdded(rows, 1, ann)

  assert.deepEqual(next[0].owners.map((owner) => owner.userID), [10, 20])
  assert.equal(next[1], rows[1])
  assert.equal(withOwnerAdded(next, 1, ann)[0], next[0])
  assert.deepEqual(rows[0].owners, [bee], 'the input is not changed')
})

test('removing an owner updates only that venue and can leave it without an owner', () => {
  const rows = [{ venueID: 1, owners: [ann] }, { venueID: 2, owners: [ann, bee] }]
  const next = withOwnerRemoved(rows, 1, 10)

  assert.deepEqual(next[0].owners, [])
  assert.equal(next[1], rows[1])
  assert.deepEqual(withOwnerRemoved(rows, 2, 10)[1].owners, [bee])
  assert.deepEqual(rows[0].owners, [ann], 'the input is not changed')
})

test('a venue with no owners, or malformed owner data, counts as having no owner', () => {
  assert.equal(hasNoOwner({ owners: [] }), true)
  assert.equal(hasNoOwner({}), true)
  assert.equal(hasNoOwner(undefined), true)
  assert.equal(hasNoOwner({ owners: [ann] }), false)
})

test('existing owners are not offered again when picking a user', () => {
  const users = [{ userID: 10 }, { userID: 30 }, null]
  assert.deepEqual(selectableUsers(users, { owners: [ann] }), [{ userID: 30 }])
  assert.deepEqual(selectableUsers(users, undefined), [{ userID: 10 }, { userID: 30 }])
  assert.deepEqual(selectableUsers(undefined, { owners: [] }), [])
})

test('API error messages can name the action, and keep the venue wording by default', () => {
  assert.equal(getApiErrorMessage('', 500), 'Unable to save venue (500).')
  assert.equal(getApiErrorMessage('', 403, 'update owners'), 'Unable to update owners (403).')
  assert.equal(getApiErrorMessage('{"message":"Only staff can manage venue owners."}', 403, 'update owners'), 'Only staff can manage venue owners.')
})
