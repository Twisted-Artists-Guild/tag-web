import { test, beforeEach } from 'node:test'
import assert from 'node:assert/strict'

let calls
beforeEach(() => {
  calls = []
})

function mockFetch(handler) {
  globalThis.fetch = async (url) => {
    calls.push(String(url))
    return handler(String(url))
  }
}

const jsonResponse = (body, ok = true, status = 200) => ({ ok, status, json: async () => body })

test('ignores unsupported entity types and invalid IDs without calling the API', async () => {
  const { fetchEntityProfileImage } = await import('./useEntityProfileImage.js')
  mockFetch(() => jsonResponse({ files: [] }))

  for (const [type, id] of [['vendor', 1], ['artist', 0], ['artist', -3], ['user', 'abc'], ['artist', '1/../2'], ['user', null]]) {
    assert.equal(await fetchEntityProfileImage(type, id), '')
  }
  assert.equal(calls.length, 0)
})

test('returns the newest profile image for the requested user or artist and caches it', async () => {
  const { fetchEntityProfileImage } = await import('./useEntityProfileImage.js')
  mockFetch(() => jsonResponse({
    files: [
      { url: 'https://cdn/old.png', lastModified: '2026-01-01T00:00:00Z' },
      { url: 'https://cdn/new.png', lastModified: '2026-06-01T00:00:00Z' },
    ],
  }))

  assert.equal(await fetchEntityProfileImage('artist', 2), 'https://cdn/new.png')
  assert.equal(await fetchEntityProfileImage('artist', '2'), 'https://cdn/new.png')
  assert.equal(calls.length, 1)
  assert.ok(decodeURIComponent(calls[0]).includes('platformpics/artist/2/profile/'))

  await fetchEntityProfileImage('user', 2)
  assert.ok(decodeURIComponent(calls[1]).includes('platformpics/user/2/profile/'))
})

test('returns an empty string when there is no image and does not cache failures', async () => {
  const { fetchEntityProfileImage } = await import('./useEntityProfileImage.js')

  mockFetch(() => jsonResponse({ files: [] }))
  assert.equal(await fetchEntityProfileImage('user', 7), '')

  mockFetch(() => jsonResponse({}, false, 500))
  assert.equal(await fetchEntityProfileImage('artist', 9), '')

  mockFetch(() => jsonResponse({ files: [{ url: 'https://cdn/retry.png' }] }))
  assert.equal(await fetchEntityProfileImage('artist', 9), 'https://cdn/retry.png')
})
