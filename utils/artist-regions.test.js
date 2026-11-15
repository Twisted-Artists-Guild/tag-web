import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
  describeMigrationReport,
  getArtistRegions,
  normalizeMigrationReport,
  runArtistRegionMigration,
  sameRegionIds,
  saveArtistRegions,
} from './artist-regions.js'

function fakeFetch(responder) {
  const calls = []
  const fetchFn = async (url, options = {}) => {
    calls.push({ url, method: options.method || 'GET', body: options.body ? JSON.parse(options.body) : undefined })
    const next = responder(url, options)
    if (next instanceof Error) throw next
    const [status, body] = next
    return { ok: status >= 200 && status < 300, status, text: async () => (typeof body === 'string' ? body : JSON.stringify(body)), json: async () => body }
  }
  return { fetchFn, calls }
}

test('an artist\'s regions are read from the response, in camelCase or PascalCase', () => {
  const regions = getArtistRegions({ regions: [{ regionID: 1, name: 'Georgia', slug: 'georgia', type: 'Statewide', states: ['GA'], isActive: true }] })
  assert.deepEqual(regions, [{ regionID: 1, name: 'Georgia', slug: 'georgia', type: 'Statewide', states: ['GA'], isActive: true }])

  const pascal = getArtistRegions({ Regions: [{ RegionID: 2, Name: 'Old', Slug: 'old', Type: 'WithinState', States: ['AL'], IsActive: false }] })
  assert.equal(pascal[0].regionID, 2)
  assert.equal(pascal[0].isActive, false)
})

test('missing or odd region data gives an empty list', () => {
  for (const artist of [undefined, null, {}, { regions: null }, { regions: 'x' }, { regions: [null, {}, { regionID: 'a' }] }]) {
    assert.deepEqual(getArtistRegions(artist), [])
  }
})

test('two lists of region ids are the same when they hold the same ids in any order', () => {
  assert.equal(sameRegionIds([1, 2], [2, 1]), true)
  assert.equal(sameRegionIds([1, 1, 2], [2, 1]), true)
  assert.equal(sameRegionIds([], undefined), true)
  assert.equal(sameRegionIds([1], [1, 2]), false)
  assert.equal(sameRegionIds([1, 3], [1, 2]), false)
})

test('saving sends the chosen ids, and an empty list clears them', async () => {
  const { fetchFn, calls } = fakeFetch(() => [200, []])

  assert.deepEqual(await saveArtistRegions({ artistId: 7, regionIds: [3, 1], fetchFn }), { ok: true, message: '' })
  assert.deepEqual(await saveArtistRegions({ artistId: 7, regionIds: [], fetchFn }), { ok: true, message: '' })

  assert.deepEqual(calls.map((call) => `${call.method} ${call.url}`), ['PUT /api/artist/7/regions', 'PUT /api/artist/7/regions'])
  assert.deepEqual(calls.map((call) => call.body), [{ regionIds: [3, 1] }, { regionIds: [] }])
})

test('an API refusal is shown as it came', async () => {
  const forbidden = fakeFetch(() => [403, { message: 'You are not allowed to change the regions of this artist.' }])
  assert.equal((await saveArtistRegions({ artistId: 7, regionIds: [1], fetchFn: forbidden.fetchFn })).message, 'You are not allowed to change the regions of this artist.')

  const gone = fakeFetch(() => [400, { message: "The region 'Old Area' is no longer available." }])
  const result = await saveArtistRegions({ artistId: 7, regionIds: [9], fetchFn: gone.fetchFn })
  assert.equal(result.ok, false)
  assert.match(result.message, /no longer available/)
})

test('a network failure, or an artist that never loaded, gives a plain message and sends nothing wrong', async () => {
  const offline = fakeFetch(() => new Error('Failed to fetch'))
  assert.match((await saveArtistRegions({ artistId: 7, regionIds: [1], fetchFn: offline.fetchFn })).message, /check your connection/i)

  const none = fakeFetch(() => [200, []])
  for (const artistId of [undefined, 0, -1, 'x']) {
    const result = await saveArtistRegions({ artistId, regionIds: [1], fetchFn: none.fetchFn })
    assert.equal(result.ok, false)
  }
  assert.equal(none.calls.length, 0)
})

test('the migration previews unless it is told to apply', async () => {
  const { fetchFn, calls } = fakeFetch(() => [200, { dryRun: true, artistsMigrated: 2, linksAdded: 3 }])

  await runArtistRegionMigration({ fetchFn })
  await runArtistRegionMigration({ apply: false, fetchFn })
  await runArtistRegionMigration({ apply: true, fetchFn })

  assert.deepEqual(calls.map((call) => `${call.method} ${call.url}`), [
    'POST /api/Region/admin/migrate-artist-regions?dryRun=true',
    'POST /api/Region/admin/migrate-artist-regions?dryRun=true',
    'POST /api/Region/admin/migrate-artist-regions?dryRun=false',
  ])
})

test('the migration report is cleaned up, and failures are shown', async () => {
  const ok = fakeFetch(() => [200, { dryRun: true, artistsWithRegionText: '5', artistsMigrated: 2, linksAdded: 3, unmatched: [{ text: 'Narnia', artistCount: 3, artistIds: [2, 4, 'x'] }, { text: '' }, null] }])
  const result = await runArtistRegionMigration({ fetchFn: ok.fetchFn })
  assert.equal(result.ok, true)
  assert.equal(result.report.artistsWithRegionText, 5)
  assert.deepEqual(result.report.unmatched, [{ text: 'Narnia', artistCount: 3, artistIds: [2, 4] }])

  const refused = fakeFetch(() => [403, { message: 'Only staff can migrate artist regions.' }])
  assert.deepEqual(await runArtistRegionMigration({ fetchFn: refused.fetchFn }), { ok: false, message: 'Only staff can migrate artist regions.', report: null })

  const offline = fakeFetch(() => new Error('down'))
  assert.match((await runArtistRegionMigration({ fetchFn: offline.fetchFn })).message, /reach the server/i)
})

test('an empty or odd report becomes zeros', () => {
  for (const input of [undefined, null, {}, { artistsMigrated: 'x', unmatched: 'y' }]) {
    const report = normalizeMigrationReport(input)
    assert.equal(report.artistsMigrated, 0)
    assert.deepEqual(report.unmatched, [])
  }
})

test('the report is summarized in plain words', () => {
  assert.match(describeMigrationReport({ dryRun: true, artistsWithRegionText: 0 }), /nothing to migrate/)

  const preview = describeMigrationReport({ dryRun: true, artistsWithRegionText: 5, artistsMigrated: 3, linksAdded: 4, artistsSkippedAlreadyHadRegions: 1, artistsWithNoMatch: 2 })
  assert.equal(preview, '3 artists would get 4 region links. 1 artist already chose regions and was left alone. 2 artists had text that matched no region.')

  const applied = describeMigrationReport({ dryRun: false, artistsWithRegionText: 1, artistsMigrated: 1, linksAdded: 1 })
  assert.equal(applied, '1 artist got 1 region link.')
})
