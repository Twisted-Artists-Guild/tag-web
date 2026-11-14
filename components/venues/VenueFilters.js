/* This file is part of the Twisted Artists Guild project.

 Copyright (C) 2025 Twisted Artists Guild

 Licensed under the GNU General Public License v3.0
 (https://www.gnu.org/licenses/gpl-3.0.en.html).

 This software comes with NO WARRANTY; see the license for details.

 Open source · low-profit · human-first*/

import { useEffect, useState } from "react"
import TagInput from "@/components/forms/TagInput"
import RegionSelect from "@/components/forms/RegionSelect"
import { US_STATES } from "@/utils/regions"
import { mergeCategoryOptions, toggleValue } from "@/utils/venue-list"

// The search and filter form of the venue directory. It keeps its own draft and only changes the page when the visitor
// presses Search, so typing never sends a request. The page passes the filters from the URL in, and gets new ones back.
export default function VenueFilters({ filters, onSearch, onClear, hasFilters, isBusy }) {
  const [draft, setDraft] = useState(filters)
  const [shownFilters, setShownFilters] = useState(filters)
  const [categories, setCategories] = useState([])
  const [categoriesFailed, setCategoriesFailed] = useState(false)

  // A new URL (Back, a shared link, or Clear) replaces whatever was being typed.
  if (shownFilters !== filters) {
    setShownFilters(filters)
    setDraft(filters)
  }
  useEffect(() => {
    let ignore = false

    const loadCategories = async () => {
      try {
        const response = await fetch("/api/VenueCategory")
        if (!response.ok) throw new Error("Categories are not available.")
        const data = await response.json()
        if (!ignore) setCategories(Array.isArray(data) ? data : [])
      } catch {
        if (!ignore) setCategoriesFailed(true)
      }
    }

    loadCategories()
    return () => { ignore = true }
  }, [])

  const update = (key, value) => setDraft((current) => ({ ...current, [key]: value }))
  const categoryOptions = mergeCategoryOptions(categories, draft.category)

  const submit = (event) => {
    event.preventDefault()
    onSearch(draft)
  }

  return (
    <form role="search" aria-label="Search venues" className="space-y-5" onSubmit={submit}>
      <div className="form-control">
        <label htmlFor="venue-search" className="label-text font-medium mb-1">Venue name</label>
        <input
          id="venue-search"
          type="search"
          className="input input-bordered w-full"
          value={draft.q}
          maxLength={100}
          onChange={(event) => update("q", event.target.value)}
          autoComplete="off"
          placeholder="Search by name"
        />
      </div>

      <fieldset className="space-y-1 min-w-0">
        <legend className="label-text font-medium mb-1">Category</legend>
        {categoriesFailed ? <p className="text-sm text-base-content/60">Categories could not be loaded.</p> : null}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 gap-x-4">
          {categoryOptions.map((category) => {
            const id = `venue-category-${category.slug}`
            return (
              <label key={category.slug} htmlFor={id} className="label w-full cursor-pointer justify-start gap-3 py-1">
                <input
                  id={id}
                  type="checkbox"
                  className="checkbox checkbox-sm"
                  checked={draft.category.includes(category.slug)}
                  onChange={() => update("category", toggleValue(draft.category, category.slug))}
                />
                <span className="label-text">{category.name}</span>
              </label>
            )
          })}
        </div>
        {!categoriesFailed && categoryOptions.length > 0 ? <p className="text-xs text-base-content/60">A venue in any chosen category matches.</p> : null}
      </fieldset>

      <TagInput
        label="Amenities"
        value={draft.tag}
        onChange={(tags) => update("tag", tags)}
        helpText="Type an amenity and press Enter, such as parking or stage. Venues must have all of them."
      />

      <RegionSelect
        label="Regions"
        value={draft.region}
        onChange={(regions) => update("region", regions)}
        selectBy="slug"
        helpText="A venue in any chosen region matches."
      />

      <div className="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-1 gap-3">
        <div className="form-control">
          <label htmlFor="venue-city" className="label-text font-medium mb-1">City</label>
          <input id="venue-city" className="input input-bordered w-full" value={draft.city} maxLength={100} onChange={(event) => update("city", event.target.value)} autoComplete="off" />
        </div>

        <div className="form-control">
          <label htmlFor="venue-state" className="label-text font-medium mb-1">State</label>
          <select id="venue-state" className="select select-bordered w-full" value={draft.state} onChange={(event) => update("state", event.target.value)}>
            <option value="">Any state</option>
            {US_STATES.map((state) => <option key={state.code} value={state.code}>{state.name}</option>)}
            {draft.state && !US_STATES.some((state) => state.code === draft.state.toUpperCase()) ? <option value={draft.state}>{draft.state}</option> : null}
          </select>
        </div>

        <div className="form-control">
          <label htmlFor="venue-zip" className="label-text font-medium mb-1">Zip code</label>
          <input
            id="venue-zip"
            inputMode="numeric"
            className="input input-bordered w-full"
            value={draft.zip}
            maxLength={10}
            onChange={(event) => update("zip", event.target.value)}
            autoComplete="postal-code"
            aria-describedby="venue-zip-help"
          />
          <span id="venue-zip-help" className="text-xs text-base-content/60 mt-1">The first digits are enough.</span>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        <button type="submit" className="btn btn-primary" disabled={isBusy}>Search venues</button>
        {hasFilters ? <button type="button" className="btn btn-outline" onClick={onClear} disabled={isBusy}>Clear filters</button> : null}
      </div>
    </form>
  )
}
