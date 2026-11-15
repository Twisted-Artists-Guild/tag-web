/* This file is part of the Twisted Artists Guild project.

 Copyright (C) 2025 Twisted Artists Guild

 Licensed under the GNU General Public License v3.0
 (https://www.gnu.org/licenses/gpl-3.0.en.html).

 This software comes with NO WARRANTY; see the license for details.

 Open source · low-profit · human-first*/

import { useEffect, useId, useMemo, useState } from "react"
import { mergeCategoryChoices, toggleId } from "@/utils/venue-profile"

const CATEGORIES_URL = "/api/VenueCategory"

// A checkbox list of venue categories. It is a controlled component: `value` is the list of chosen category ids and
// `onChange` receives the new list. `extraCategories` are the categories the venue already has, including deactivated
// ones, so an existing choice stays visible and can be kept or removed.
export default function CategorySelect({
  label = "Categories",
  value,
  onChange,
  extraCategories,
  disabled = false,
  helpText = "Choose every kind of space this venue offers.",
  error = "",
  categoriesUrl = CATEGORIES_URL,
}) {
  const baseId = useId()
  const helpId = `${baseId}-help`
  const errorId = `${baseId}-error`
  const selectedIds = useMemo(() => (Array.isArray(value) ? value : []), [value])

  const [activeCategories, setActiveCategories] = useState([])
  const [status, setStatus] = useState("loading")
  const [announcement, setAnnouncement] = useState("")
  const [reloadKey, setReloadKey] = useState(0)

  useEffect(() => {
    let ignore = false

    const load = async () => {
      setStatus("loading")
      try {
        const response = await fetch(categoriesUrl)
        if (!response.ok) throw new Error("Categories are not available.")
        const data = await response.json()
        if (!ignore) {
          setActiveCategories(Array.isArray(data) ? data : [])
          setStatus("ready")
        }
      } catch {
        if (!ignore) setStatus("error")
      }
    }

    load()
    return () => { ignore = true }
  }, [categoriesUrl, reloadKey])

  const options = useMemo(() => mergeCategoryChoices(activeCategories, extraCategories), [activeCategories, extraCategories])

  const toggle = (category) => {
    const isChosen = selectedIds.includes(category.venueCategoryID)
    onChange?.(toggleId(selectedIds, category.venueCategoryID))
    setAnnouncement(`${isChosen ? "Removed" : "Added"} ${category.name}.`)
  }

  return (
    <fieldset
      className="form-control w-full min-w-0"
      disabled={disabled}
      aria-describedby={[helpId, error ? errorId : ""].filter(Boolean).join(" ")}
    >
      <legend className="label-text font-medium mb-1">{label}</legend>

      {status === "loading" ? (
        <div className="flex py-2"><span className="loading loading-spinner loading-sm" aria-label="Loading categories" /></div>
      ) : null}

      {status === "error" && options.length === 0 ? (
        <div role="alert" className="flex items-center gap-2 text-sm text-error">
          <span>Categories could not be loaded.</span>
          <button type="button" className="btn btn-outline btn-xs" onClick={() => setReloadKey((key) => key + 1)}>Try again</button>
        </div>
      ) : null}

      {options.length > 0 ? (
        <ul className="grid grid-cols-1 sm:grid-cols-2 gap-x-4">
          {options.map((category) => {
            const optionId = `${baseId}-category-${category.venueCategoryID}`
            return (
              <li key={category.venueCategoryID}>
                <label htmlFor={optionId} className="label w-full cursor-pointer justify-start gap-3 py-1 whitespace-normal">
                  <input
                    id={optionId}
                    type="checkbox"
                    className="checkbox checkbox-sm shrink-0"
                    checked={selectedIds.includes(category.venueCategoryID)}
                    onChange={() => toggle(category)}
                  />
                  <span className="label-text min-w-0 break-words">
                    {category.name}
                    {category.isActive === false ? <span className="ml-2 text-xs text-base-content/60">no longer available</span> : null}
                  </span>
                </label>
              </li>
            )
          })}
        </ul>
      ) : null}

      <p id={helpId} className="text-xs text-base-content/60 mt-1">{helpText} {selectedIds.length} chosen.</p>
      {error ? <p id={errorId} className="text-sm text-error mt-1" role="alert">{error}</p> : null}
      <p role="status" aria-live="polite" className="sr-only">{announcement}</p>
    </fieldset>
  )
}
