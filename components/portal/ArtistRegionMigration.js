/* This file is part of the Twisted Artists Guild project.

 Copyright (C) 2025 Twisted Artists Guild

 Licensed under the GNU General Public License v3.0
 (https://www.gnu.org/licenses/gpl-3.0.en.html).

 This software comes with NO WARRANTY; see the license for details.

 Open source · low-profit · human-first*/

import { useState } from "react"
import { describeMigrationReport, runArtistRegionMigration } from "@/utils/artist-regions"

// Staff tool that maps the region artists typed on their public addresses to the shared regions. It always previews first;
// applying needs a second, deliberate click. The typed text is never changed, and artists who already chose regions are skipped.
export default function ArtistRegionMigration() {
  const [status, setStatus] = useState("idle")
  const [error, setError] = useState("")
  const [report, setReport] = useState(null)
  const [confirming, setConfirming] = useState(false)

  const isRunning = status === "running"
  const canApply = report?.dryRun && report.linksAdded > 0 && !isRunning

  const run = async (apply) => {
    setStatus("running")
    setError("")
    setConfirming(false)
    const result = await runArtistRegionMigration({ apply })
    if (!result.ok) {
      setStatus("error")
      setError(result.message)
      return
    }

    setReport(result.report)
    setStatus("done")
  }

  return (
    <section className="space-y-4" aria-labelledby="artist-region-migration-title">
      <div>
        <h2 id="artist-region-migration-title" className="text-xl font-semibold">Move artist regions</h2>
        <p className="text-sm text-base-content/70">
          Artists used to type a region on their public address. This matches that text to the shared regions, using exact names,
          keys and states only. Preview first, check what could not be matched, then apply. It is safe to run again: artists who
          already chose regions are left alone, and the typed text is never changed.
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        <button type="button" className="btn btn-sm btn-outline" disabled={isRunning} onClick={() => run(false)}>
          {isRunning ? "Working..." : "Preview"}
        </button>
        {canApply && !confirming ? (
          <button type="button" className="btn btn-sm btn-primary" onClick={() => setConfirming(true)}>Apply...</button>
        ) : null}
      </div>

      {confirming ? (
        <div role="alert" className="alert alert-warning flex flex-wrap items-center justify-between gap-2">
          <span>Add {report.linksAdded} region link{report.linksAdded === 1 ? "" : "s"} to {report.artistsMigrated} artist{report.artistsMigrated === 1 ? "" : "s"}?</span>
          <span className="flex gap-2">
            <button type="button" className="btn btn-sm" onClick={() => setConfirming(false)}>Cancel</button>
            <button type="button" className="btn btn-sm btn-primary" disabled={isRunning} onClick={() => run(true)}>Yes, apply</button>
          </span>
        </div>
      ) : null}

      {status === "error" && error ? <div role="alert" className="alert alert-error"><span>{error}</span></div> : null}

      {report ? (
        <div role="status" className="space-y-3">
          <div className={`alert ${report.dryRun ? "alert-info" : "alert-success"}`}>
            <span><strong>{report.dryRun ? "Preview: nothing was changed. " : "Applied. "}</strong>{describeMigrationReport(report)}</span>
          </div>

          {report.unmatched.length > 0 ? (
            <div className="overflow-x-auto">
              <p className="text-sm font-semibold mb-1">Text that matched no region</p>
              <table className="table table-sm">
                <thead>
                  <tr><th>Typed text</th><th>Artists</th><th>Artist ids</th></tr>
                </thead>
                <tbody>
                  {report.unmatched.map((item) => (
                    <tr key={item.text}>
                      <td>{item.text}</td>
                      <td>{item.artistCount}</td>
                      <td>{item.artistIds.join(", ")}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <p className="text-xs text-base-content/60 mt-1">Add a region for these on this page, or ask the artists to choose one themselves.</p>
            </div>
          ) : null}
        </div>
      ) : null}
    </section>
  )
}
