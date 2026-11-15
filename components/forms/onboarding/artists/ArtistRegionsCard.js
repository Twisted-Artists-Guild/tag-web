/* This file is part of the Twisted Artists Guild project.

 Copyright (C) 2025 Twisted Artists Guild

 Licensed under the GNU General Public License v3.0
 (https://www.gnu.org/licenses/gpl-3.0.en.html).

 This software comes with NO WARRANTY; see the license for details.

 Open source · low-profit · human-first*/

import { useState } from "react"
import RegionSelect from "@/components/forms/RegionSelect"
import { getArtistRegions, sameRegionIds, saveArtistRegions } from "@/utils/artist-regions"

// Where an artist chooses the shared regions they belong to, so people in their regional community can find them. It saves
// on its own, so it does not change how the profile steps around it work. It says when there are changes that are not
// saved yet, and whether saving worked.
export default function ArtistRegionsCard({ artistId, artistData }) {
  const [existingRegions] = useState(() => getArtistRegions(artistData))
  const [regionIds, setRegionIds] = useState(() => existingRegions.map((region) => region.regionID))
  const [savedIds, setSavedIds] = useState(() => existingRegions.map((region) => region.regionID))
  const [status, setStatus] = useState("idle")
  const [message, setMessage] = useState("")

  const isSaving = status === "saving"
  const hasUnsavedChanges = !sameRegionIds(regionIds, savedIds)

  const choose = (ids) => {
    setRegionIds(ids)
    if (status !== "saving") {
      setStatus("idle")
      setMessage("")
    }
  }

  const save = async () => {
    setStatus("saving")
    setMessage("")
    const result = await saveArtistRegions({ artistId, regionIds })
    if (!result.ok) {
      setStatus("error")
      setMessage(result.message)
      return
    }

    setSavedIds(regionIds)
    setStatus("saved")
    setMessage("Regions saved.")
  }

  return (
    <section className="card bg-base-100 shadow border border-base-300" aria-labelledby="artist-regions-title">
      <div className="card-body gap-4">
        <div>
          <h2 id="artist-regions-title" className="card-title">Regions</h2>
          <p className="text-sm text-base-content/70">Choose the regional communities you belong to, so people near you can find you. You can choose more than one.</p>
        </div>

        <RegionSelect
          label="Your regions"
          value={regionIds}
          onChange={choose}
          extraRegions={existingRegions}
          disabled={isSaving}
          helpText="Choose every regional community that fits."
        />

        {hasUnsavedChanges && status !== "saving" ? (
          <p className="text-sm text-warning" role="status">You have region changes that are not saved yet.</p>
        ) : null}
        {status === "error" && message ? <div role="alert" className="alert alert-error"><span>{message}</span></div> : null}
        {status === "saved" && message && !hasUnsavedChanges ? <div role="status" className="alert alert-success"><span>{message}</span></div> : null}

        <div className="flex justify-end">
          <button type="button" className="btn btn-sm btn-primary" disabled={isSaving || !hasUnsavedChanges} onClick={save}>
            {isSaving ? "Saving..." : "Save regions"}
          </button>
        </div>
      </div>
    </section>
  )
}
