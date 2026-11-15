import { getApiErrorMessage } from './venue-form.js'

// Artists use the same shared regions as venues. These helpers read an artist's regions, save the chosen ones, and run the
// staff migration that maps the old free-text region to regions.

export function getArtistRegions(artist) {
  const raw = artist?.regions ?? artist?.Regions
  return Array.isArray(raw) ? raw.filter((region) => region && Number.isInteger(region.regionID ?? region.RegionID)).map((region) => ({
    regionID: region.regionID ?? region.RegionID,
    name: String(region.name ?? region.Name ?? ''),
    slug: String(region.slug ?? region.Slug ?? ''),
    type: String(region.type ?? region.Type ?? ''),
    states: Array.isArray(region.states ?? region.States) ? (region.states ?? region.States) : [],
    isActive: (region.isActive ?? region.IsActive) !== false,
  })) : []
}

// True when both lists hold the same region ids, in any order.
export function sameRegionIds(left, right) {
  const a = [...new Set(Array.isArray(left) ? left : [])].sort((x, y) => x - y)
  const b = [...new Set(Array.isArray(right) ? right : [])].sort((x, y) => x - y)
  return a.length === b.length && a.every((id, index) => id === b[index])
}

export async function saveArtistRegions({ artistId, regionIds, fetchFn = fetch }) {
  const id = Number(artistId)
  if (!Number.isInteger(id) || id <= 0) return { ok: false, message: 'The artist could not be loaded. Refresh the page and try again.' }

  let response
  try {
    response = await fetchFn(`/api/artist/${id}/regions`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ regionIds: Array.isArray(regionIds) ? regionIds : [] }),
    })
  } catch {
    return { ok: false, message: 'Could not save the regions. Check your connection and try again.' }
  }

  if (!response.ok) return { ok: false, message: getApiErrorMessage(await response.text(), response.status, 'save the regions') }
  return { ok: true, message: '' }
}

// Runs the staff migration. It previews unless `apply` is true. Returns { ok, message, report }.
export async function runArtistRegionMigration({ apply = false, fetchFn = fetch } = {}) {
  let response
  try {
    response = await fetchFn(`/api/Region/admin/migrate-artist-regions?dryRun=${apply ? 'false' : 'true'}`, { method: 'POST' })
  } catch {
    return { ok: false, message: 'Could not reach the server. Check your connection and try again.', report: null }
  }

  if (!response.ok) return { ok: false, message: getApiErrorMessage(await response.text(), response.status, 'run the migration'), report: null }

  const report = await response.json().catch(() => null)
  return report ? { ok: true, message: '', report: normalizeMigrationReport(report) } : { ok: false, message: 'The server sent a report that could not be read.', report: null }
}

const count = (value) => (Number.isFinite(Number(value)) ? Number(value) : 0)

export function normalizeMigrationReport(report) {
  const data = report || {}
  return {
    dryRun: data.dryRun !== false,
    artistsWithRegionText: count(data.artistsWithRegionText),
    artistsSkippedAlreadyHadRegions: count(data.artistsSkippedAlreadyHadRegions),
    artistsMigrated: count(data.artistsMigrated),
    artistsWithNoMatch: count(data.artistsWithNoMatch),
    linksAdded: count(data.linksAdded),
    unmatched: (Array.isArray(data.unmatched) ? data.unmatched : [])
      .map((item) => ({
        text: String(item?.text ?? ''),
        artistCount: count(item?.artistCount),
        artistIds: (Array.isArray(item?.artistIds) ? item.artistIds : []).filter((id) => Number.isInteger(id)),
      }))
      .filter((item) => item.text),
  }
}

// A plain sentence for the top of the report.
export function describeMigrationReport(report) {
  const r = normalizeMigrationReport(report)
  if (r.artistsWithRegionText === 0) return 'No artist has a region typed on a public address, so there is nothing to migrate.'

  const artists = (n) => `${n} artist${n === 1 ? '' : 's'}`
  const links = (n) => `${n} region link${n === 1 ? '' : 's'}`
  const parts = [r.dryRun
    ? `${artists(r.artistsMigrated)} would get ${links(r.linksAdded)}.`
    : `${artists(r.artistsMigrated)} got ${links(r.linksAdded)}.`]
  if (r.artistsSkippedAlreadyHadRegions > 0) parts.push(`${artists(r.artistsSkippedAlreadyHadRegions)} already chose regions and ${r.artistsSkippedAlreadyHadRegions === 1 ? 'was' : 'were'} left alone.`)
  if (r.artistsWithNoMatch > 0) parts.push(`${artists(r.artistsWithNoMatch)} had text that matched no region.`)
  return parts.join(' ')
}
