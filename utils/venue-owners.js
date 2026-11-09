/* This file is part of the Twisted Artists Guild project.

 Copyright (C) 2025 Twisted Artists Guild

 Licensed under the GNU General Public License v3.0
 (https://www.gnu.org/licenses/gpl-3.0.en.html).

 This software comes with NO WARRANTY; see the license for details.

 Open source · low-profit · human-first*/

// Pure helpers for the staff screen that assigns owners to venues. The screen keeps its rows in memory and
// updates them from API responses, so these functions return new arrays and never change their input.

export const STAFF_VENUE_PAGE_SIZE = 25
export const MIN_USER_SEARCH_LENGTH = 2

export function buildAdminVenuesQuery({ search = "", unownedOnly = false, afterId = 0, limit = STAFF_VENUE_PAGE_SIZE } = {}) {
  const params = new URLSearchParams()
  const term = String(search || "").trim()
  if (term) params.set("search", term)
  if (unownedOnly) params.set("unownedOnly", "true")
  const cursor = Number(afterId)
  if (Number.isInteger(cursor) && cursor > 0) params.set("afterId", String(cursor))
  params.set("limit", String(limit))
  return params.toString()
}

export function canSearchUsers(term) {
  return String(term || "").trim().length >= MIN_USER_SEARCH_LENGTH
}

// "Ann Lee (ann@example.com)": the email tells apart users who share a name.
export function ownerLabel(owner) {
  const name = String(owner?.displayName || "").trim() || `User ${owner?.userID ?? ""}`.trim()
  const email = String(owner?.email || "").trim()
  return email && email !== name ? `${name} (${email})` : name
}

// Appends a page of venues to the rows already shown, skipping any venue that is already listed.
export function mergeVenuePages(existing, next) {
  const rows = Array.isArray(existing) ? existing : []
  const seen = new Set(rows.map((row) => row?.venueID))
  const additions = (Array.isArray(next) ? next : []).filter((row) => row && !seen.has(row.venueID))
  return [...rows, ...additions]
}

const byName = (left, right) => String(left?.displayName || "").localeCompare(String(right?.displayName || ""), undefined, { sensitivity: "base" })

export function withOwnerAdded(rows, venueId, owner) {
  return (Array.isArray(rows) ? rows : []).map((row) => {
    if (row?.venueID !== venueId) return row
    const owners = Array.isArray(row.owners) ? row.owners : []
    if (owners.some((existing) => existing.userID === owner?.userID)) return row
    return { ...row, owners: [...owners, owner].sort(byName) }
  })
}

export function withOwnerRemoved(rows, venueId, userId) {
  return (Array.isArray(rows) ? rows : []).map((row) => {
    if (row?.venueID !== venueId) return row
    return { ...row, owners: (Array.isArray(row.owners) ? row.owners : []).filter((owner) => owner.userID !== userId) }
  })
}

export function hasNoOwner(row) {
  return !Array.isArray(row?.owners) || row.owners.length === 0
}

// Users already managing the venue cannot be picked again.
export function selectableUsers(users, row) {
  const owned = new Set((Array.isArray(row?.owners) ? row.owners : []).map((owner) => owner.userID))
  return (Array.isArray(users) ? users : []).filter((user) => user && !owned.has(user.userID))
}
