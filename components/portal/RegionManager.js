/* This file is part of the Twisted Artists Guild project.

 Copyright (C) 2025 Twisted Artists Guild

 Licensed under the GNU General Public License v3.0
 (https://www.gnu.org/licenses/gpl-3.0.en.html).

 This software comes with NO WARRANTY; see the license for details.

 Open source · low-profit · human-first*/

import { useEffect, useState } from "react"
import { getApiErrorMessage } from "@/utils/venue-form"
import {
  REGION_NAME_MAX_LENGTH,
  REGION_TYPES,
  US_STATES,
  describeRegion,
  isSingleStateType,
  regionUsageLabel,
  sortRegions,
  statesForType,
  validateRegionForm,
  withRegionSaved,
} from "@/utils/regions"

const REGIONS_API = "/api/Region"

async function readApiError(response, action) {
  return getApiErrorMessage(await response.text(), response.status, action)
}

// The form used both to add a region and to edit one. It validates before sending and shows what the API says if it refuses.
function RegionForm({ idPrefix, initial, submitLabel, busyLabel, onSubmit, onCancel }) {
  const [name, setName] = useState(initial.name)
  const [type, setType] = useState(initial.type)
  const [states, setStates] = useState(initial.states)
  const [error, setError] = useState("")
  const [isBusy, setIsBusy] = useState(false)
  const errorId = `${idPrefix}-error`
  const isSingle = isSingleStateType(type)

  const changeType = (nextType) => {
    setType(nextType)
    setStates((current) => statesForType(nextType, current))
    setError("")
  }

  const toggleState = (code) => {
    setStates((current) => (current.includes(code) ? current.filter((item) => item !== code) : [...current, code]))
    setError("")
  }

  const submit = async (event) => {
    event.preventDefault()
    const problem = validateRegionForm({ name, type, states })
    if (problem) {
      setError(problem)
      return
    }

    setIsBusy(true)
    setError("")
    try {
      await onSubmit({ name: name.trim(), type, states })
    } catch (submitError) {
      setError(submitError.message || "Unable to save the region.")
    } finally {
      setIsBusy(false)
    }
  }

  return (
    <form className="space-y-3 rounded-box bg-base-200 p-4" onSubmit={submit} noValidate aria-describedby={error ? errorId : undefined}>
      <div className="flex flex-wrap gap-4">
        <div className="form-control w-full max-w-xs">
          <label htmlFor={`${idPrefix}-name`} className="label-text font-medium mb-1">Region name</label>
          <input
            id={`${idPrefix}-name`}
            className="input input-bordered input-sm"
            value={name}
            maxLength={REGION_NAME_MAX_LENGTH}
            onChange={(event) => { setName(event.target.value); setError("") }}
            autoComplete="off"
          />
        </div>

        <div className="form-control w-full max-w-xs">
          <label htmlFor={`${idPrefix}-type`} className="label-text font-medium mb-1">Type</label>
          <select id={`${idPrefix}-type`} className="select select-bordered select-sm" value={type} onChange={(event) => changeType(event.target.value)}>
            {REGION_TYPES.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
          </select>
        </div>

        {isSingle ? (
          <div className="form-control w-full max-w-xs">
            <label htmlFor={`${idPrefix}-state`} className="label-text font-medium mb-1">State</label>
            <select
              id={`${idPrefix}-state`}
              className="select select-bordered select-sm"
              value={states[0] || ""}
              onChange={(event) => { setStates(event.target.value ? [event.target.value] : []); setError("") }}
            >
              <option value="">Choose a state</option>
              {US_STATES.map((state) => <option key={state.code} value={state.code}>{state.name}</option>)}
            </select>
          </div>
        ) : null}
      </div>

      {!isSingle ? (
        <fieldset className="space-y-2">
          <legend className="label-text font-medium">States this region covers (choose at least two)</legend>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-x-4 gap-y-1 max-h-48 overflow-y-auto rounded-box bg-base-100 p-3">
            {US_STATES.map((state) => (
              <label key={state.code} className="label cursor-pointer justify-start gap-2 py-0" htmlFor={`${idPrefix}-state-${state.code}`}>
                <input
                  id={`${idPrefix}-state-${state.code}`}
                  type="checkbox"
                  className="checkbox checkbox-xs"
                  checked={states.includes(state.code)}
                  onChange={() => toggleState(state.code)}
                />
                <span className="label-text text-sm">{state.name}</span>
              </label>
            ))}
          </div>
          <p className="text-xs text-base-content/60">{states.length} selected.</p>
        </fieldset>
      ) : null}

      {error ? <p id={errorId} role="alert" className="text-sm text-error">{error}</p> : null}

      <div className="flex gap-2">
        <button type="submit" className="btn btn-primary btn-sm" disabled={isBusy}>{isBusy ? busyLabel : submitLabel}</button>
        {onCancel ? <button type="button" className="btn btn-ghost btn-sm" disabled={isBusy} onClick={onCancel}>Cancel</button> : null}
      </div>
    </form>
  )
}

function RegionRow({ region, onSaved, onNotice }) {
  const [isEditing, setIsEditing] = useState(false)
  const [isBusy, setIsBusy] = useState(false)
  const [rowError, setRowError] = useState("")

  const saveEdit = async (values) => {
    const response = await fetch(`${REGIONS_API}/${region.regionID}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(values),
    })
    if (!response.ok) throw new Error(await readApiError(response, "save the region"))
    const saved = await response.json()
    onSaved(saved)
    onNotice(`Saved ${saved.name}.`)
    setIsEditing(false)
  }

  const setActive = async (isActive) => {
    if (!isActive && !window.confirm(`Deactivate ${region.name}? Venues and artists that already use it keep it, but it can't be chosen for others.`)) return

    setIsBusy(true)
    setRowError("")
    try {
      const response = await fetch(`${REGIONS_API}/${region.regionID}/active`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive }),
      })
      if (!response.ok) throw new Error(await readApiError(response, isActive ? "activate the region" : "deactivate the region"))
      onSaved(await response.json())
      onNotice(`${region.name} is now ${isActive ? "active" : "inactive"}.`)
    } catch (error) {
      setRowError(error.message || "Unable to change the region.")
    } finally {
      setIsBusy(false)
    }
  }

  return (
    <li className="rounded-box border border-base-300 bg-base-100 p-4 space-y-2">
      <div className="flex flex-wrap items-center gap-2">
        <h3 className="text-lg font-semibold">{region.name}</h3>
        <span className={`badge ${region.isActive ? "badge-success" : "badge-ghost"}`}>{region.isActive ? "Active" : "Inactive"}</span>
        <span className="badge badge-outline">{describeRegion(region)}</span>
        <span className="text-sm text-base-content/60">{regionUsageLabel(region.venueCount, region.artistCount)}</span>
        <span className="text-xs text-base-content/50 ml-auto">Filter key: {region.slug}</span>
      </div>

      {rowError ? <div role="alert" className="alert alert-error py-2 text-sm">{rowError}</div> : null}

      {isEditing ? (
        <RegionForm
          idPrefix={`region-edit-${region.regionID}`}
          initial={{ name: region.name, type: region.type, states: region.states || [] }}
          submitLabel="Save"
          busyLabel="Saving..."
          onSubmit={saveEdit}
          onCancel={() => setIsEditing(false)}
        />
      ) : (
        <div className="flex flex-wrap gap-2">
          <button type="button" className="btn btn-outline btn-sm" onClick={() => setIsEditing(true)} disabled={isBusy} aria-label={`Edit ${region.name}`}>Edit</button>
          {region.isActive ? (
            <button type="button" className="btn btn-outline btn-warning btn-sm" onClick={() => setActive(false)} disabled={isBusy} aria-label={`Deactivate ${region.name}`}>Deactivate</button>
          ) : (
            <button type="button" className="btn btn-outline btn-success btn-sm" onClick={() => setActive(true)} disabled={isBusy} aria-label={`Activate ${region.name}`}>Activate</button>
          )}
        </div>
      )}
    </li>
  )
}

export default function RegionManager() {
  const [regions, setRegions] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState("")
  const [notice, setNotice] = useState("")
  const [isAdding, setIsAdding] = useState(false)
  const [search, setSearch] = useState("")

  useEffect(() => {
    let ignore = false

    const loadRegions = async () => {
      try {
        const response = await fetch(`${REGIONS_API}/admin/all`)
        if (!response.ok) throw new Error(await readApiError(response, "load regions"))
        const data = await response.json()
        if (!ignore) setRegions(sortRegions(data))
      } catch (loadError) {
        if (!ignore) setError(loadError.message || "Unable to load regions.")
      } finally {
        if (!ignore) setIsLoading(false)
      }
    }

    loadRegions()
    return () => { ignore = true }
  }, [])

  const handleSaved = (saved) => setRegions((current) => withRegionSaved(current, saved))

  const addRegion = async (values) => {
    const response = await fetch(REGIONS_API, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(values),
    })
    if (!response.ok) throw new Error(await readApiError(response, "add the region"))
    const saved = await response.json()
    handleSaved(saved)
    setNotice(`Added ${saved.name}.`)
    setIsAdding(false)
  }

  const needle = search.trim().toLowerCase()
  const visible = needle ? regions.filter((region) => region.name.toLowerCase().includes(needle) || (region.states || []).some((code) => code.toLowerCase() === needle)) : regions

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end gap-4">
        <div className="form-control w-full max-w-xs">
          <label htmlFor="region-search" className="label-text font-medium mb-1">Find a region</label>
          <input id="region-search" type="search" className="input input-bordered" value={search} onChange={(event) => setSearch(event.target.value)} autoComplete="off" />
        </div>
        {!isAdding ? <button type="button" className="btn btn-primary" onClick={() => { setIsAdding(true); setNotice("") }}>Add region</button> : null}
      </div>

      {isAdding ? (
        <RegionForm
          idPrefix="region-new"
          initial={{ name: "", type: "Statewide", states: [] }}
          submitLabel="Add region"
          busyLabel="Adding..."
          onSubmit={addRegion}
          onCancel={() => setIsAdding(false)}
        />
      ) : null}

      <p role="status" aria-live="polite" className="min-h-6 text-sm text-success">{notice}</p>
      {error ? <div role="alert" className="alert alert-error">{error}</div> : null}

      {isLoading ? (
        <div className="flex justify-center py-8"><span className="loading loading-spinner loading-md" aria-label="Loading regions" /></div>
      ) : visible.length === 0 && !error ? (
        <p className="text-base-content/70">{regions.length === 0 ? "No regions yet. Add the first one above." : "No regions match."}</p>
      ) : (
        <>
          <p className="text-sm text-base-content/70">Showing {visible.length} of {regions.length} regions.</p>
          <ul className="space-y-3" aria-label="Regions">
            {visible.map((region) => (
              <RegionRow key={region.regionID} region={region} onSaved={handleSaved} onNotice={setNotice} />
            ))}
          </ul>
        </>
      )}
    </div>
  )
}
