/* This file is part of the Twisted Artists Guild project.

 Copyright (C) 2025 Twisted Artists Guild

 Licensed under the GNU General Public License v3.0
 (https://www.gnu.org/licenses/gpl-3.0.en.html).

 This software comes with NO WARRANTY; see the license for details.

 Open source · low-profit · human-first*/

import { useEffect, useRef, useState } from "react"
import Link from "next/link"
import { getApiErrorMessage } from "@/utils/venue-form"
import {
  STAFF_VENUE_PAGE_SIZE,
  buildAdminVenuesQuery,
  canSearchUsers,
  hasNoOwner,
  mergeVenuePages,
  ownerLabel,
  selectableUsers,
  withOwnerAdded,
  withOwnerRemoved,
} from "@/utils/venue-owners"

const OWNERS_API = "/api/Linker_UserToVenue"

function useDebouncedValue(value, delayMs = 300) {
  const [debounced, setDebounced] = useState(value)

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delayMs)
    return () => clearTimeout(timer)
  }, [value, delayMs])

  return debounced
}

async function readApiError(response, action) {
  return getApiErrorMessage(await response.text(), response.status, action)
}

function VenueOwnerRow({ row, onOwnerAdded, onOwnerRemoved }) {
  const [isAssigning, setIsAssigning] = useState(false)
  const [userSearch, setUserSearch] = useState("")
  const [users, setUsers] = useState([])
  const [selectedUser, setSelectedUser] = useState(null)
  const [isBusy, setIsBusy] = useState(false)
  const [rowError, setRowError] = useState("")
  const debouncedUserSearch = useDebouncedValue(userSearch)
  const searchRequest = useRef(0)
  const searchInputId = `owner-search-${row.venueID}`

  useEffect(() => {
    if (!isAssigning) return undefined
    const requestId = ++searchRequest.current

    if (!canSearchUsers(debouncedUserSearch)) return undefined

    const searchUsers = async () => {
      try {
        const response = await fetch(`${OWNERS_API}/admin/users?search=${encodeURIComponent(debouncedUserSearch.trim())}&limit=10`)
        if (!response.ok) throw new Error(await readApiError(response, "search users"))
        const data = await response.json()
        if (searchRequest.current === requestId) setUsers(Array.isArray(data) ? data : [])
      } catch (error) {
        if (searchRequest.current === requestId) {
          setUsers([])
          setRowError(error.message || "Unable to search users.")
        }
      }
    }

    searchUsers()
    return undefined
  }, [debouncedUserSearch, isAssigning])

  const closeAssignPanel = () => {
    setIsAssigning(false)
    setUserSearch("")
    setUsers([])
    setSelectedUser(null)
    setRowError("")
  }

  const assignOwner = async () => {
    if (!selectedUser) return
    setIsBusy(true)
    setRowError("")

    try {
      const response = await fetch(`${OWNERS_API}/venue/${row.venueID}/owners`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userID: selectedUser.userID }),
      })
      if (!response.ok) throw new Error(await readApiError(response, "assign the owner"))

      const owner = await response.json()
      onOwnerAdded(row, owner)
      closeAssignPanel()
    } catch (error) {
      setRowError(error.message || "Unable to assign the owner.")
    } finally {
      setIsBusy(false)
    }
  }

  const removeOwner = async (owner) => {
    if (!window.confirm(`Remove ${ownerLabel(owner)} as an owner of ${row.name}?`)) return
    setIsBusy(true)
    setRowError("")

    try {
      const response = await fetch(`${OWNERS_API}/venue/${row.venueID}/owners/${owner.userID}`, { method: "DELETE" })
      if (!response.ok) throw new Error(await readApiError(response, "remove the owner"))
      onOwnerRemoved(row, owner)
    } catch (error) {
      setRowError(error.message || "Unable to remove the owner.")
    } finally {
      setIsBusy(false)
    }
  }

  // Results from an earlier, longer search must not linger once the box is cleared or too short.
  const candidates = selectableUsers(canSearchUsers(debouncedUserSearch) ? users : [], row)

  return (
    <li className="rounded-box border border-base-300 bg-base-100 p-4 space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <h3 className="text-lg font-semibold">{row.name || `Venue ${row.venueID}`}</h3>
        {hasNoOwner(row) ? <span className="badge badge-warning">No owner</span> : null}
        <span className={`badge ${row.isPublished ? "badge-success" : "badge-ghost"}`}>{row.isPublished ? "Published" : "Draft"}</span>
        {row.isModerationBlocked ? <span className="badge badge-error">Blocked</span> : null}
        {row.slug ? (
          <Link href={`/venue/${row.slug}`} className="link link-primary text-sm ml-auto">View venue</Link>
        ) : null}
      </div>

      {hasNoOwner(row) ? (
        <p className="text-sm text-base-content/70">Nobody manages this venue yet, so only staff can edit it.</p>
      ) : (
        <ul className="flex flex-wrap gap-2" aria-label={`Owners of ${row.name}`}>
          {row.owners.map((owner) => (
            <li key={owner.userID} className="badge badge-lg badge-outline gap-2 py-4">
              <span>{ownerLabel(owner)}</span>
              <button
                type="button"
                className="btn btn-ghost btn-xs btn-circle"
                onClick={() => removeOwner(owner)}
                disabled={isBusy}
                aria-label={`Remove ${ownerLabel(owner)} as an owner of ${row.name}`}
              >
                ✕
              </button>
            </li>
          ))}
        </ul>
      )}

      {rowError ? <div role="alert" className="alert alert-error py-2 text-sm">{rowError}</div> : null}

      {isAssigning ? (
        <div className="space-y-2 rounded-box bg-base-200 p-3">
          <label htmlFor={searchInputId} className="label-text font-medium">Find a user by name, username or email</label>
          <input
            id={searchInputId}
            type="search"
            className="input input-bordered input-sm w-full"
            value={userSearch}
            onChange={(event) => { setUserSearch(event.target.value); setSelectedUser(null) }}
            autoComplete="off"
          />

          {canSearchUsers(userSearch) && candidates.length === 0 && canSearchUsers(debouncedUserSearch) ? (
            <p className="text-sm text-base-content/60">No users found.</p>
          ) : null}

          {candidates.length > 0 ? (
            <ul className="menu menu-sm rounded-box bg-base-100" aria-label="Matching users">
              {candidates.map((user) => (
                <li key={user.userID}>
                  <button
                    type="button"
                    className={selectedUser?.userID === user.userID ? "active" : ""}
                    onClick={() => setSelectedUser(user)}
                    aria-pressed={selectedUser?.userID === user.userID}
                  >
                    {ownerLabel(user)}
                  </button>
                </li>
              ))}
            </ul>
          ) : null}

          <div className="flex gap-2">
            <button type="button" className="btn btn-primary btn-sm" onClick={assignOwner} disabled={!selectedUser || isBusy}>
              {isBusy ? "Assigning..." : selectedUser ? `Assign ${ownerLabel(selectedUser)}` : "Assign owner"}
            </button>
            <button type="button" className="btn btn-ghost btn-sm" onClick={closeAssignPanel} disabled={isBusy}>Cancel</button>
          </div>
        </div>
      ) : (
        <button type="button" className="btn btn-outline btn-sm" onClick={() => setIsAssigning(true)} disabled={isBusy}>
          Add owner
        </button>
      )}
    </li>
  )
}

export default function VenueOwnerManager() {
  const [search, setSearch] = useState("")
  const [unownedOnly, setUnownedOnly] = useState(false)
  const [rows, setRows] = useState([])
  const [nextAfterId, setNextAfterId] = useState(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isLoadingMore, setIsLoadingMore] = useState(false)
  const [error, setError] = useState("")
  const [notice, setNotice] = useState("")
  const debouncedSearch = useDebouncedValue(search)
  const listRequest = useRef(0)

  useEffect(() => {
    const requestId = ++listRequest.current

    const loadFirstPage = async () => {
      setIsLoading(true)
      setError("")

      try {
        const response = await fetch(`${OWNERS_API}/admin/venues?${buildAdminVenuesQuery({ search: debouncedSearch, unownedOnly })}`)
        if (!response.ok) throw new Error(await readApiError(response, "load venues"))
        const data = await response.json()
        if (listRequest.current !== requestId) return
        setRows(Array.isArray(data?.items) ? data.items : [])
        setNextAfterId(data?.nextAfterId ?? null)
      } catch (loadError) {
        if (listRequest.current !== requestId) return
        setRows([])
        setNextAfterId(null)
        setError(loadError.message || "Unable to load venues.")
      } finally {
        if (listRequest.current === requestId) setIsLoading(false)
      }
    }

    loadFirstPage()
  }, [debouncedSearch, unownedOnly])

  const loadMore = async () => {
    if (!nextAfterId || isLoadingMore) return
    const requestId = listRequest.current
    setIsLoadingMore(true)
    setError("")

    try {
      const query = buildAdminVenuesQuery({ search: debouncedSearch, unownedOnly, afterId: nextAfterId })
      const response = await fetch(`${OWNERS_API}/admin/venues?${query}`)
      if (!response.ok) throw new Error(await readApiError(response, "load more venues"))
      const data = await response.json()
      if (listRequest.current !== requestId) return
      setRows((current) => mergeVenuePages(current, data?.items))
      setNextAfterId(data?.nextAfterId ?? null)
    } catch (loadError) {
      if (listRequest.current === requestId) setError(loadError.message || "Unable to load more venues.")
    } finally {
      setIsLoadingMore(false)
    }
  }

  const handleOwnerAdded = (row, owner) => {
    setRows((current) => withOwnerAdded(current, row.venueID, owner))
    setNotice(`${ownerLabel(owner)} is now an owner of ${row.name}.`)
  }

  const handleOwnerRemoved = (row, owner) => {
    setRows((current) => withOwnerRemoved(current, row.venueID, owner.userID))
    setNotice(`${ownerLabel(owner)} is no longer an owner of ${row.name}.`)
  }

  const withoutOwner = rows.filter(hasNoOwner).length

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end gap-4">
        <div className="form-control w-full max-w-xs">
          <label htmlFor="venue-owner-search" className="label-text font-medium mb-1">Search venues</label>
          <input
            id="venue-owner-search"
            type="search"
            className="input input-bordered"
            value={search}
            onChange={(event) => { setSearch(event.target.value); setNotice("") }}
            autoComplete="off"
          />
        </div>
        <label className="label cursor-pointer gap-2" htmlFor="venue-owner-unowned">
          <input
            id="venue-owner-unowned"
            type="checkbox"
            className="checkbox checkbox-sm"
            checked={unownedOnly}
            onChange={(event) => { setUnownedOnly(event.target.checked); setNotice("") }}
          />
          <span className="label-text">Only venues without an owner</span>
        </label>
      </div>

      <p role="status" aria-live="polite" className="min-h-6 text-sm text-success">{notice}</p>
      {error ? <div role="alert" className="alert alert-error">{error}</div> : null}

      {isLoading ? (
        <div className="flex justify-center py-8"><span className="loading loading-spinner loading-md" aria-label="Loading venues" /></div>
      ) : rows.length === 0 && !error ? (
        <p className="text-base-content/70">No venues match.</p>
      ) : (
        <>
          <p className="text-sm text-base-content/70">
            Showing {rows.length} venue{rows.length === 1 ? "" : "s"}{nextAfterId ? " so far" : ""}; {withoutOwner} without an owner.
          </p>
          <ul className="space-y-3" aria-label="Venues">
            {rows.map((row) => (
              <VenueOwnerRow key={row.venueID} row={row} onOwnerAdded={handleOwnerAdded} onOwnerRemoved={handleOwnerRemoved} />
            ))}
          </ul>
        </>
      )}

      {nextAfterId ? (
        <div className="flex justify-center">
          <button type="button" className="btn btn-outline" onClick={loadMore} disabled={isLoadingMore}>
            {isLoadingMore ? "Loading..." : `Load ${STAFF_VENUE_PAGE_SIZE} more`}
          </button>
        </div>
      ) : null}
    </div>
  )
}
