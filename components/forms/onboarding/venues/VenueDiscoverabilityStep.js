/* This file is part of the Twisted Artists Guild project.

 Copyright (C) 2025 Twisted Artists Guild

 Licensed under the GNU General Public License v3.0
 (https://www.gnu.org/licenses/gpl-3.0.en.html).

 This software comes with NO WARRANTY; see the license for details.

 Open source · low-profit · human-first*/

import Link from "next/link"
import { useState } from "react"
import CategorySelect from "@/components/forms/CategorySelect"
import RegionSelect from "@/components/forms/RegionSelect"
import TagInput from "@/components/forms/TagInput"
import { saveVenueDiscoverability, validateVenueDiscoverability } from "@/utils/venue-profile"

// The step where an owner says how the venue can be found: its categories, amenity tags and regions. Shared by the join
// wizard and the portal edit page. `initialForm` is the venue as mapVenueToProfile returns it. "Save and continue" calls
// `onContinue`; with `showSaveOnly` there is also a plain Save that stays on the page and says it worked.
export default function VenueDiscoverabilityStep({
  initialForm,
  venueId,
  title,
  intro,
  backHref,
  backLabel,
  continueLabel = "Save and continue",
  onContinue,
  showSaveOnly = false,
}) {
  const [form, setForm] = useState({
    categoryIds: initialForm.categoryIds,
    tags: initialForm.tags,
    regionIds: initialForm.regionIds,
  })
  const [errors, setErrors] = useState({})
  const [status, setStatus] = useState("idle")
  const [message, setMessage] = useState("")

  const isSaving = status === "saving"

  const update = (field, value) => {
    setForm((current) => ({ ...current, [field]: value }))
    setErrors((current) => (current[field] ? { ...current, [field]: undefined } : current))
    if (status === "saved") setStatus("idle")
  }

  const save = async (andContinue) => {
    const found = validateVenueDiscoverability(form)
    setErrors(found)
    if (Object.keys(found).length > 0) return

    setStatus("saving")
    setMessage("")
    const result = await saveVenueDiscoverability({ venueId, form })
    if (!result.ok) {
      setStatus("error")
      setMessage(result.message)
      return
    }

    setStatus("saved")
    if (andContinue) {
      onContinue?.()
      return
    }

    setMessage("Categories, amenities and regions saved.")
  }

  return (
    <form
      className="card bg-base-100 shadow border border-base-300"
      aria-label={title}
      onSubmit={(event) => {
        event.preventDefault()
        if (!isSaving) save(true)
      }}
    >
      <div className="card-body gap-6">
        <div>
          <h2 className="card-title">{title}</h2>
          {intro ? <p className="text-sm text-base-content/70">{intro}</p> : null}
        </div>

        <CategorySelect
          value={form.categoryIds}
          onChange={(ids) => update("categoryIds", ids)}
          extraCategories={initialForm.extraCategories}
          disabled={isSaving}
          error={errors.categoryIds}
        />

        <TagInput
          label="Amenities"
          value={form.tags}
          onChange={(tags) => update("tags", tags)}
          disabled={isSaving}
          helpText="Type an amenity and press Enter. Examples: parking, stage, wheelchair accessible, sound system."
        />
        {errors.tags ? <p role="alert" className="text-sm text-error -mt-4">{errors.tags}</p> : null}

        <RegionSelect
          value={form.regionIds}
          onChange={(ids) => update("regionIds", ids)}
          extraRegions={initialForm.extraRegions}
          disabled={isSaving}
          helpText="Choose every regional community your venue serves."
        />

        {status === "error" && message ? <div role="alert" className="alert alert-error"><span>{message}</span></div> : null}
        {status === "saved" && message ? <div role="status" className="alert alert-success"><span>{message}</span></div> : null}

        <div className="flex gap-2 justify-between flex-wrap">
          {backHref ? <Link href={backHref} className="btn btn-sm btn-outline">{backLabel}</Link> : <span />}
          <div className="flex gap-2 flex-wrap">
            {showSaveOnly ? (
              <button type="button" className="btn btn-sm btn-outline" disabled={isSaving} onClick={() => save(false)}>
                {isSaving ? "Saving..." : "Save"}
              </button>
            ) : null}
            <button type="submit" className="btn btn-sm btn-primary" disabled={isSaving}>
              {isSaving ? "Saving..." : continueLabel}
            </button>
          </div>
        </div>
      </div>
    </form>
  )
}
