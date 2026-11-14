/* This file is part of the Twisted Artists Guild project.

 Copyright (C) 2025 Twisted Artists Guild

 Licensed under the GNU General Public License v3.0
 (https://www.gnu.org/licenses/gpl-3.0.en.html).

 This software comes with NO WARRANTY; see the license for details.

 Open source · low-profit · human-first*/

import { useEffect, useId, useMemo, useState } from "react"
import { describeRegion, filterRegionOptions, mergeRegionOptions, toggleRegionId } from "@/utils/regions"

const REGIONS_URL = "/api/Region"

// A multi-select for regions, used in forms (choose a venue's or artist's regions) and in filters. It is a controlled
// component: `value` is the list of chosen regions and `onChange` receives the new list. By default the list holds region
// ids; pass `selectBy="slug"` to hold slugs instead, which is what filters and shareable links use. `extraRegions` are
// regions the record already has, including deactivated ones, so an existing choice stays visible and can be kept or removed.
// Pass `state` (for example "GA") to offer only the regions that cover that state.
export default function RegionSelect({
  label = "Regions",
  value,
  onChange,
  extraRegions,
  state,
  selectBy = "id",
  disabled = false,
  helpText = "Choose every regional community that fits.",
  regionsUrl = REGIONS_URL,
}) {
  const baseId = useId()
  const searchId = `${baseId}-search`
  const helpId = `${baseId}-help`
  const selectedIds = useMemo(() => (Array.isArray(value) ? value : []), [value])
  // What `value` holds: region ids (forms) or region slugs (filters and shareable links).
  const keyOf = (region) => (selectBy === "slug" ? region.slug : region.regionID)

  const [activeRegions, setActiveRegions] = useState([])
  const [status, setStatus] = useState("loading")
  const [query, setQuery] = useState("")
  const [announcement, setAnnouncement] = useState("")
  const [reloadKey, setReloadKey] = useState(0)

  useEffect(() => {
    let ignore = false

    const load = async () => {
      setStatus("loading")
      try {
        const url = state ? `${regionsUrl}?state=${encodeURIComponent(state)}` : regionsUrl
        const response = await fetch(url)
        if (!response.ok) throw new Error("Regions are not available.")
        const data = await response.json()
        if (!ignore) {
          setActiveRegions(Array.isArray(data) ? data : [])
          setStatus("ready")
        }
      } catch {
        if (!ignore) setStatus("error")
      }
    }

    load()
    return () => { ignore = true }
  }, [regionsUrl, state, reloadKey])

  const options = useMemo(() => mergeRegionOptions(activeRegions, extraRegions), [activeRegions, extraRegions])
  const visibleOptions = useMemo(() => filterRegionOptions(options, query), [options, query])
  const selectedRegions = options.filter((region) => selectedIds.includes(keyOf(region)))

  const toggle = (region) => {
    const isChosen = selectedIds.includes(keyOf(region))
    onChange?.(toggleRegionId(selectedIds, keyOf(region)))
    setAnnouncement(`${isChosen ? "Removed" : "Added"} ${region.name}.`)
  }

  return (
    <fieldset className="form-control w-full min-w-0" disabled={disabled}>
      <legend className="label-text font-medium mb-1">{label}</legend>

      {selectedRegions.length > 0 ? (
        <ul className="flex flex-wrap gap-2 mb-2" aria-label={`Selected ${label.toLowerCase()}`}>
          {selectedRegions.map((region) => (
            <li key={region.regionID} className="badge badge-lg badge-outline gap-2 py-4">
              <span>{region.name}{region.isActive === false ? " (no longer available)" : ""}</span>
              <button
                type="button"
                className="btn btn-ghost btn-xs btn-circle"
                onClick={() => toggle(region)}
                aria-label={`Remove ${region.name}`}
              >
                ✕
              </button>
            </li>
          ))}
        </ul>
      ) : null}

      <label htmlFor={searchId} className="sr-only">Search {label.toLowerCase()}</label>
      <input
        id={searchId}
        type="search"
        className="input input-bordered input-sm w-full"
        placeholder="Search by name or state"
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        onKeyDown={(event) => { if (event.key === "Enter") event.preventDefault() }}
        aria-describedby={helpId}
        autoComplete="off"
      />

      <div className="mt-2 max-h-56 overflow-y-auto rounded-box border border-base-300 bg-base-100 p-2">
        {status === "loading" ? (
          <div className="flex justify-center py-4"><span className="loading loading-spinner loading-sm" aria-label="Loading regions" /></div>
        ) : null}

        {status === "error" ? (
          <div role="alert" className="flex items-center gap-2 text-sm text-error">
            <span>Regions could not be loaded.</span>
            <button type="button" className="btn btn-outline btn-xs" onClick={() => setReloadKey((key) => key + 1)}>Try again</button>
          </div>
        ) : null}

        {status === "ready" && visibleOptions.length === 0 ? <p className="py-2 text-sm text-base-content/60">No regions match.</p> : null}

        {status === "ready" ? (
          <ul>
            {visibleOptions.map((region) => {
              const optionId = `${baseId}-region-${region.regionID}`
              return (
                <li key={region.regionID}>
                  <label htmlFor={optionId} className="label w-full cursor-pointer justify-start gap-3 py-1">
                    <input
                      id={optionId}
                      type="checkbox"
                      className="checkbox checkbox-sm shrink-0"
                      checked={selectedIds.includes(keyOf(region))}
                      onChange={() => toggle(region)}
                    />
                    <span className="label-text min-w-0 whitespace-normal break-words">
                      {region.name}
                      <span className="ml-2 text-xs text-base-content/60">{describeRegion(region)}{region.isActive === false ? " · no longer available" : ""}</span>
                    </span>
                  </label>
                </li>
              )
            })}
          </ul>
        ) : null}
      </div>

      <p id={helpId} className="text-xs text-base-content/60 mt-1">{helpText} {selectedIds.length} chosen.</p>
      <p role="status" aria-live="polite" className="sr-only">{announcement}</p>
    </fieldset>
  )
}
