import { test } from 'node:test'
import assert from 'node:assert/strict'
import { getCommentAuthorContext } from './useComments.js'

test('personal context sends a null entity ID rather than the context ID', () => {
  const expected = {
    authorContextId: 'user-primary',
    authorEntityType: 'user',
    authorEntityId: null,
  }
  assert.deepEqual(getCommentAuthorContext(null), expected)
  assert.deepEqual(getCommentAuthorContext({ id: 'user-primary', type: 'user' }), expected)
})

test('artist context sends a numeric entity ID', () => {
  assert.deepEqual(getCommentAuthorContext({ id: 'artist-42', type: 'artist', rawId: '42' }), {
    authorContextId: 'artist-42',
    authorEntityType: 'artist',
    authorEntityId: 42,
  })
})

test('contexts without a numeric ID are not sent as entity IDs', () => {
  assert.equal(getCommentAuthorContext({ id: 'vendor-42', type: 'vendor' }).authorEntityId, null)
  for (const rawId of [null, '', 'artist-slug', 0, -1, 1.5, 2147483648]) {
    assert.throws(() => getCommentAuthorContext({ type: 'artist', rawId }), /Unable to identify/)
  }
})
