/* This file is part of the Twisted Artists Guild project.

 Copyright (C) 2025 Twisted Artists Guild

 Licensed under the GNU General Public License v3.0
 (https://www.gnu.org/licenses/gpl-3.0.en.html).

 This software comes with NO WARRANTY; see the license for details.

 Open source · low-profit · human-first*/

import { useEffect, useState } from "react"
import { getApiErrorMessage } from "@/utils/venue-form"
import {
  CATEGORY_NAME_MAX_LENGTH,
  categoryUsageLabel,
  sortCategories,
  validateCategoryName,
  withCategorySaved,
} from "@/utils/venue-categories"

const CATEGORIES_API = "/api/VenueCategory"

async function readApiError(response, action) {
  return getApiErrorMessage(await response.text(), response.status, action)
}

function CategoryRow({ category, onSaved, onNotice }) {
  const [isEditing, setIsEditing] = useState(false)
  const [name, setName] = useState(category.name)
  const [isBusy, setIsBusy] = useState(false)
  const [rowError, setRowError] = useState("")
  const nameInputId = `venue-category-name-${category.venueCategoryID}`

  const saveName = async (event) => {
    event.preventDefault()
    const problem = validateCategoryName(name)
    if (problem) {
      setRowError(problem)
      return
    }

    setIsBusy(true)
    setRowError("")
    try {
      const response = await fetch(`${CATEGORIES_API}/${category.venueCategoryID}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim() }),
      })
      if (!response.ok) throw new Error(await readApiError(response, "rename the category"))
      const saved = await response.json()
      onSaved(saved)
      onNotice(`Renamed to ${saved.name}.`)
      setIsEditing(false)
    } catch (error) {
      setRowError(error.message || "Unable to rename the category.")
    } finally {
      setIsBusy(false)
    }
  }

  const setActive = async (isActive) => {
    if (!isActive && !window.confirm(`Deactivate ${category.name}? Venues that already use it keep it, but it can't be chosen for other venues.`)) return

    setIsBusy(true)
    setRowError("")
    try {
      const response = await fetch(`${CATEGORIES_API}/${category.venueCategoryID}/active`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive }),
      })
      if (!response.ok) throw new Error(await readApiError(response, isActive ? "activate the category" : "deactivate the category"))
      onSaved(await response.json())
      onNotice(`${category.name} is now ${isActive ? "active" : "inactive"}.`)
    } catch (error) {
      setRowError(error.message || "Unable to change the category.")
    } finally {
      setIsBusy(false)
    }
  }

  return (
    <li className="rounded-box border border-base-300 bg-base-100 p-4 space-y-2">
      <div className="flex flex-wrap items-center gap-2">
        {isEditing ? (
          <form className="flex flex-wrap items-end gap-2" onSubmit={saveName}>
            <div className="form-control">
              <label htmlFor={nameInputId} className="label-text font-medium mb-1">Category name</label>
              <input
                id={nameInputId}
                className="input input-bordered input-sm"
                value={name}
                maxLength={CATEGORY_NAME_MAX_LENGTH}
                onChange={(event) => setName(event.target.value)}
                autoComplete="off"
              />
            </div>
            <button type="submit" className="btn btn-primary btn-sm" disabled={isBusy}>{isBusy ? "Saving..." : "Save"}</button>
            <button type="button" className="btn btn-ghost btn-sm" disabled={isBusy} onClick={() => { setIsEditing(false); setName(category.name); setRowError("") }}>Cancel</button>
          </form>
        ) : (
          <h3 className="text-lg font-semibold">{category.name}</h3>
        )}
        <span className={`badge ${category.isActive ? "badge-success" : "badge-ghost"}`}>{category.isActive ? "Active" : "Inactive"}</span>
        <span className="text-sm text-base-content/60">{categoryUsageLabel(category.venueCount)}</span>
        <span className="text-xs text-base-content/50 ml-auto">Filter key: {category.slug}</span>
      </div>

      {rowError ? <div role="alert" className="alert alert-error py-2 text-sm">{rowError}</div> : null}

      {!isEditing ? (
        <div className="flex flex-wrap gap-2">
          <button type="button" className="btn btn-outline btn-sm" onClick={() => setIsEditing(true)} disabled={isBusy} aria-label={`Rename ${category.name}`}>Rename</button>
          {category.isActive ? (
            <button type="button" className="btn btn-outline btn-warning btn-sm" onClick={() => setActive(false)} disabled={isBusy} aria-label={`Deactivate ${category.name}`}>Deactivate</button>
          ) : (
            <button type="button" className="btn btn-outline btn-success btn-sm" onClick={() => setActive(true)} disabled={isBusy} aria-label={`Activate ${category.name}`}>Activate</button>
          )}
        </div>
      ) : null}
    </li>
  )
}

export default function VenueCategoryManager() {
  const [categories, setCategories] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState("")
  const [notice, setNotice] = useState("")
  const [newName, setNewName] = useState("")
  const [formError, setFormError] = useState("")
  const [isAdding, setIsAdding] = useState(false)

  useEffect(() => {
    let ignore = false

    const loadCategories = async () => {
      try {
        const response = await fetch(`${CATEGORIES_API}/admin/all`)
        if (!response.ok) throw new Error(await readApiError(response, "load categories"))
        const data = await response.json()
        if (!ignore) setCategories(sortCategories(data))
      } catch (loadError) {
        if (!ignore) setError(loadError.message || "Unable to load categories.")
      } finally {
        if (!ignore) setIsLoading(false)
      }
    }

    loadCategories()
    return () => { ignore = true }
  }, [])

  const handleSaved = (saved) => setCategories((current) => withCategorySaved(current, saved))

  const addCategory = async (event) => {
    event.preventDefault()
    const problem = validateCategoryName(newName)
    if (problem) {
      setFormError(problem)
      return
    }

    setIsAdding(true)
    setFormError("")
    setNotice("")
    try {
      const response = await fetch(CATEGORIES_API, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newName.trim() }),
      })
      if (!response.ok) throw new Error(await readApiError(response, "add the category"))
      const saved = await response.json()
      handleSaved(saved)
      setNotice(`Added ${saved.name}.`)
      setNewName("")
    } catch (addError) {
      setFormError(addError.message || "Unable to add the category.")
    } finally {
      setIsAdding(false)
    }
  }

  return (
    <div className="space-y-4">
      <form className="flex flex-wrap items-end gap-3" onSubmit={addCategory} noValidate>
        <div className="form-control w-full max-w-xs">
          <label htmlFor="new-venue-category" className="label-text font-medium mb-1">New category</label>
          <input
            id="new-venue-category"
            className="input input-bordered"
            value={newName}
            maxLength={CATEGORY_NAME_MAX_LENGTH}
            onChange={(event) => { setNewName(event.target.value); setFormError("") }}
            aria-invalid={formError ? "true" : "false"}
            aria-describedby={formError ? "new-venue-category-error" : undefined}
            autoComplete="off"
          />
        </div>
        <button type="submit" className="btn btn-primary" disabled={isAdding}>{isAdding ? "Adding..." : "Add category"}</button>
      </form>
      {formError ? <p id="new-venue-category-error" role="alert" className="text-sm text-error">{formError}</p> : null}

      <p role="status" aria-live="polite" className="min-h-6 text-sm text-success">{notice}</p>
      {error ? <div role="alert" className="alert alert-error">{error}</div> : null}

      {isLoading ? (
        <div className="flex justify-center py-8"><span className="loading loading-spinner loading-md" aria-label="Loading categories" /></div>
      ) : categories.length === 0 && !error ? (
        <p className="text-base-content/70">No categories yet. Add the first one above.</p>
      ) : (
        <ul className="space-y-3" aria-label="Venue categories">
          {categories.map((category) => (
            <CategoryRow key={category.venueCategoryID} category={category} onSaved={handleSaved} onNotice={setNotice} />
          ))}
        </ul>
      )}
    </div>
  )
}
