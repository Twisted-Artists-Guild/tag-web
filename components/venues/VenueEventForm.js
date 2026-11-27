/* This file is part of the Twisted Artists Guild project.

 Copyright (C) 2025 Twisted Artists Guild

 Licensed under the GNU General Public License v3.0
 (https://www.gnu.org/licenses/gpl-3.0.en.html).

 This software comes with NO WARRANTY; see the license for details.

 Open source · low-profit · human-first*/

import Link from "next/link"
import { useRouter } from "next/router"
import { useId, useState } from "react"
import TiptapEditor from "@/components/tiptap/tiptap-editor"
import {
  DEFAULT_CHECK_IN_WINDOW_MINUTES,
  MAX_CHECK_IN_WINDOW_MINUTES,
  MAX_POINT_OF_CONTACT_LENGTH,
  MAX_TITLE_LENGTH,
  TIME_ZONES,
  changeEventStatus,
  createVenueEvent,
  deleteVenueEvent,
  describeEventStatus,
  emptyEventForm,
  eventToForm,
  getEventPublishProblems,
  isEditableStatus,
  updateVenueEvent,
  validateEventForm,
} from "@/utils/venue-events"

const NOTICES = {
  created: "Draft saved. It stays private until you publish it.",
  published: "Your event is published.",
}

function Field({ id, label, hint, error, children }) {
  return (
    <div className="form-control w-full">
      <label htmlFor={id} className="label-text font-medium mb-1">{label}</label>
      {children}
      {hint && !error ? <p id={`${id}-hint`} className="text-xs text-base-content/60 mt-1">{hint}</p> : null}
      {error ? <p id={`${id}-error`} className="text-sm text-error mt-1">{error}</p> : null}
    </div>
  )
}

// Creates a venue-hosted event, or edits one. A new event is a draft; the Publish button saves it and makes it public, once
// it has the minimum information, which the form lists so the owner knows what to add.
export default function VenueEventForm({ venue, event, notice }) {
  const router = useRouter()
  const uid = useId()
  const idOf = (name) => `${uid}-${name}`
  const workspaceHref = `/portal/venue/${venue.slug}`

  const [current, setCurrent] = useState(event)
  const [form, setForm] = useState(() => (event ? eventToForm(event) : emptyEventForm()))
  const [errors, setErrors] = useState({})
  const [busy, setBusy] = useState(false)
  const [result, setResult] = useState({ tone: notice && NOTICES[notice] ? "success" : "", text: NOTICES[notice] || "", problems: [] })
  const [showProblems, setShowProblems] = useState(false)
  const [confirm, setConfirm] = useState(null)

  const status = current?.status || "Draft"
  const info = describeEventStatus(status)
  const editable = !current || isEditableStatus(status)
  const isDraft = !current || status === "Draft"
  const problems = showProblems ? getEventPublishProblems(form) : []

  const update = (name, value) => {
    setForm((previous) => ({ ...previous, [name]: value }))
    setErrors((previous) => ({ ...previous, [name]: undefined }))
    setResult((previous) => (previous.tone === "success" ? { tone: "", text: "", problems: [] } : previous))
  }

  const fail = (response) => setResult({ tone: "error", text: response.message, problems: response.problems })

  const save = async (andPublish) => {
    const found = validateEventForm(form)
    if (Object.keys(found).length > 0) {
      setErrors(found)
      setResult({ tone: "error", text: "Fix the highlighted fields and try again.", problems: [] })
      return
    }

    if (andPublish) {
      const missing = getEventPublishProblems(form)
      setShowProblems(true)
      if (missing.length > 0) {
        setResult({ tone: "error", text: "This event is not ready to publish yet.", problems: [] })
        return
      }
    }

    setBusy(true)
    setResult({ tone: "", text: "", problems: [] })
    const saved = current ? await updateVenueEvent({ eventId: current.id, form }) : await createVenueEvent({ venueId: venue.id, form })
    if (!saved.ok) {
      setBusy(false)
      fail(saved)
      return
    }

    let latest = saved.event || current
    if (andPublish) {
      const published = await changeEventStatus({ eventId: latest.id, action: "publish" })
      if (!published.ok) {
        // The draft is saved; only publishing failed, so keep the owner on the saved event.
        setBusy(false)
        setCurrent({ ...latest, canManage: true })
        setResult({ tone: "error", text: `Saved as a draft, but it was not published. ${published.message}`, problems: published.problems })
        if (!current) await router.replace(`${workspaceHref}/events/${latest.id}`)
        return
      }
      latest = published.event || { ...latest, status: "Published" }
    }

    if (!current) {
      await router.replace(`${workspaceHref}/events/${latest.id}?notice=${andPublish ? "published" : "created"}`)
      return
    }

    setBusy(false)
    setCurrent({ ...latest, canManage: true })
    setShowProblems(false)
    setResult({ tone: "success", text: andPublish ? NOTICES.published : "Changes saved.", problems: [] })
  }

  const change = async (action) => {
    setConfirm(null)
    setBusy(true)
    setResult({ tone: "", text: "", problems: [] })
    const response = action === "delete" ? await deleteVenueEvent({ eventId: current.id }) : await changeEventStatus({ eventId: current.id, action })
    if (!response.ok) {
      setBusy(false)
      fail(response)
      return
    }

    if (action === "delete") {
      await router.push(workspaceHref)
      return
    }

    setBusy(false)
    setCurrent({ ...current, ...(response.event || {}), canManage: true })
    setResult({ tone: "success", text: action === "cancel" ? "The event was cancelled." : "The event is back to a draft.", problems: [] })
  }

  const describedBy = (name, hint) => [errors[name] ? `${idOf(name)}-error` : null, hint ? `${idOf(name)}-hint` : null].filter(Boolean).join(" ") || undefined
  const inputClass = (name) => `input input-bordered w-full ${errors[name] ? "input-error" : ""}`

  return (
    <section className="card bg-base-100 border border-base-300 shadow" aria-labelledby={idOf("heading")}>
      <div className="card-body gap-5">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div>
            <p className="text-xs uppercase tracking-widest text-base-content/50">{venue.name || "Venue"}</p>
            <h1 id={idOf("heading")} className="text-2xl font-bold">{current ? "Edit event" : "Create event"}</h1>
          </div>
          {current ? <span className={`badge ${info.tone}`} title={info.hint}>{info.label}</span> : <span className="badge badge-ghost">New draft</span>}
        </div>

        {current ? <p className="text-sm text-base-content/70">{info.hint}</p> : <p className="text-sm text-base-content/70">Your venue hosts this event. It stays a private draft until you publish it.</p>}
        {!editable ? <div role="status" className="alert alert-info"><span>This event can no longer be changed here. Contact staff if something needs fixing.</span></div> : null}

        <fieldset className="space-y-4 min-w-0" disabled={!editable || busy}>
          <Field id={idOf("title")} label="Title" error={errors.title}>
            <input
              id={idOf("title")}
              type="text"
              className={inputClass("title")}
              value={form.title}
              maxLength={MAX_TITLE_LENGTH}
              onChange={(e) => update("title", e.target.value)}
              aria-invalid={errors.title ? "true" : "false"}
              aria-describedby={describedBy("title")}
              required
            />
          </Field>

          <div className="grid gap-4 sm:grid-cols-3">
            <Field id={idOf("startTime")} label="Starts" error={errors.startTime}>
              <input id={idOf("startTime")} type="datetime-local" className={inputClass("startTime")} value={form.startTime} onChange={(e) => update("startTime", e.target.value)} aria-invalid={errors.startTime ? "true" : "false"} aria-describedby={describedBy("startTime")} required />
            </Field>
            <Field id={idOf("endTime")} label="Ends" error={errors.endTime}>
              <input id={idOf("endTime")} type="datetime-local" className={inputClass("endTime")} value={form.endTime} onChange={(e) => update("endTime", e.target.value)} aria-invalid={errors.endTime ? "true" : "false"} aria-describedby={describedBy("endTime")} required />
            </Field>
            <Field id={idOf("doors")} label="Doors open" hint="Optional. Defaults to the start time." error={errors.doors}>
              <input id={idOf("doors")} type="datetime-local" className={inputClass("doors")} value={form.doors} onChange={(e) => update("doors", e.target.value)} aria-invalid={errors.doors ? "true" : "false"} aria-describedby={describedBy("doors", true)} />
            </Field>
          </div>

          <div className="form-control w-full">
            <span id={idOf("description-label")} className="label-text font-medium mb-1">Description</span>
            <div className="rounded-box border border-base-300 bg-base-100">
              <TiptapEditor
                value={form.description}
                onChange={(html) => update("description", html)}
                placeholder="What is happening, who is playing, and anything people should know."
                preset="minimal"
                minHeight={160}
                headingLevels={[2, 3]}
                showAlignmentControls={false}
                allowStrikethrough={false}
                ariaLabel="Event description"
              />
            </div>
            {errors.description ? <p className="text-sm text-error mt-1">{errors.description}</p> : null}
          </div>

          <Field id={idOf("pointOfContact")} label="Point of contact" hint="An email, phone number or name people can ask. Shown with the event." error={errors.pointOfContact}>
            <input
              id={idOf("pointOfContact")}
              type="text"
              className={inputClass("pointOfContact")}
              value={form.pointOfContact}
              maxLength={MAX_POINT_OF_CONTACT_LENGTH}
              onChange={(e) => update("pointOfContact", e.target.value)}
              aria-invalid={errors.pointOfContact ? "true" : "false"}
              aria-describedby={describedBy("pointOfContact", true)}
            />
          </Field>

          <div className="grid gap-4 sm:grid-cols-3">
            <Field id={idOf("cost")} label="Cost ($)" hint="Leave blank if free." error={errors.cost}>
              <input id={idOf("cost")} type="number" inputMode="decimal" min="0" step="0.01" className={inputClass("cost")} value={form.cost} onChange={(e) => update("cost", e.target.value)} aria-invalid={errors.cost ? "true" : "false"} aria-describedby={describedBy("cost", true)} />
            </Field>
            <Field id={idOf("minimumAge")} label="Minimum age" hint="Leave blank for all ages." error={errors.minimumAge}>
              <input id={idOf("minimumAge")} type="number" inputMode="numeric" min="0" max="120" step="1" className={inputClass("minimumAge")} value={form.minimumAge} onChange={(e) => update("minimumAge", e.target.value)} aria-invalid={errors.minimumAge ? "true" : "false"} aria-describedby={describedBy("minimumAge", true)} />
            </Field>
            <Field id={idOf("maxOccupancy")} label="Capacity" hint="Optional." error={errors.maxOccupancy}>
              <input id={idOf("maxOccupancy")} type="number" inputMode="numeric" min="0" step="1" className={inputClass("maxOccupancy")} value={form.maxOccupancy} onChange={(e) => update("maxOccupancy", e.target.value)} aria-invalid={errors.maxOccupancy ? "true" : "false"} aria-describedby={describedBy("maxOccupancy", true)} />
            </Field>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field id={idOf("timeZoneId")} label="Time zone" hint="Where the event takes place." error={errors.timeZoneId}>
              <select id={idOf("timeZoneId")} className={`select select-bordered w-full ${errors.timeZoneId ? "select-error" : ""}`} value={form.timeZoneId} onChange={(e) => update("timeZoneId", e.target.value)} aria-describedby={describedBy("timeZoneId", true)}>
                <option value="">Not set</option>
                {(TIME_ZONES.includes(form.timeZoneId) || !form.timeZoneId ? TIME_ZONES : [form.timeZoneId, ...TIME_ZONES]).map((zone) => <option key={zone} value={zone}>{zone.replace(/_/g, " ")}</option>)}
              </select>
            </Field>
            <Field id={idOf("checkInWindowMinutes")} label="Check-in opens (minutes before)" hint={`Default ${DEFAULT_CHECK_IN_WINDOW_MINUTES}. At most ${MAX_CHECK_IN_WINDOW_MINUTES}.`} error={errors.checkInWindowMinutes}>
              <input id={idOf("checkInWindowMinutes")} type="number" inputMode="numeric" min="0" max={MAX_CHECK_IN_WINDOW_MINUTES} step="1" className={inputClass("checkInWindowMinutes")} value={form.checkInWindowMinutes} onChange={(e) => update("checkInWindowMinutes", e.target.value)} aria-invalid={errors.checkInWindowMinutes ? "true" : "false"} aria-describedby={describedBy("checkInWindowMinutes", true)} />
            </Field>
            <Field id={idOf("salesStart")} label="Ticket sales start" hint="Optional. Blank means no limit." error={errors.salesStart}>
              <input id={idOf("salesStart")} type="datetime-local" className={inputClass("salesStart")} value={form.salesStart} onChange={(e) => update("salesStart", e.target.value)} aria-invalid={errors.salesStart ? "true" : "false"} aria-describedby={describedBy("salesStart", true)} />
            </Field>
            <Field id={idOf("salesEnd")} label="Ticket sales end" hint="Optional. Must be before the event ends." error={errors.salesEnd}>
              <input id={idOf("salesEnd")} type="datetime-local" className={inputClass("salesEnd")} value={form.salesEnd} onChange={(e) => update("salesEnd", e.target.value)} aria-invalid={errors.salesEnd ? "true" : "false"} aria-describedby={describedBy("salesEnd", true)} />
            </Field>
          </div>
        </fieldset>

        {isDraft && editable && problems.length > 0 ? (
          <div role="alert" className="alert alert-warning items-start">
            <div>
              <p className="font-medium">To publish this event you still need to:</p>
              <ul className="list-disc pl-5 text-sm">{problems.map((problem) => <li key={problem}>{problem}</li>)}</ul>
            </div>
          </div>
        ) : null}

        <div aria-live="polite">
          {result.text ? (
            <div role={result.tone === "error" ? "alert" : "status"} className={`alert ${result.tone === "error" ? "alert-error" : "alert-success"} items-start`}>
              <div>
                <p>{result.text}</p>
                {result.problems.length > 0 ? <ul className="list-disc pl-5 text-sm">{result.problems.map((problem) => <li key={problem}>{problem}</li>)}</ul> : null}
              </div>
            </div>
          ) : null}
        </div>

        {confirm ? (
          <div role="alert" className="alert alert-warning flex flex-wrap items-center justify-between gap-2">
            <span className="text-sm">
              {confirm === "cancel" ? "Cancel this event? People will see that it was cancelled, and you can't publish it again." : "Delete this draft? This can't be undone."}
            </span>
            <span className="flex gap-2">
              <button type="button" className="btn btn-sm" onClick={() => setConfirm(null)}>Keep it</button>
              <button type="button" className="btn btn-sm btn-error" onClick={() => change(confirm)}>{confirm === "cancel" ? "Yes, cancel it" : "Yes, delete it"}</button>
            </span>
          </div>
        ) : null}

        <div className="flex flex-wrap items-center justify-between gap-2">
          <Link href={workspaceHref} className="btn btn-sm btn-ghost">Back to events</Link>
          <div className="flex flex-wrap items-center gap-2">
            {busy ? <span className="loading loading-spinner loading-sm" aria-label="Working" /> : null}
            {current && editable && status === "Draft" ? <button type="button" className="btn btn-sm btn-ghost text-error" disabled={busy} onClick={() => setConfirm("delete")}>Delete draft</button> : null}
            {current && editable && (status === "Draft" || status === "Published") ? <button type="button" className="btn btn-sm btn-outline btn-error" disabled={busy} onClick={() => setConfirm("cancel")}>Cancel event</button> : null}
            {current && status === "Published" ? <button type="button" className="btn btn-sm btn-outline" disabled={busy} onClick={() => change("unpublish")}>Unpublish</button> : null}
            {editable ? <button type="button" className="btn btn-sm btn-outline" disabled={busy} onClick={() => save(false)}>{current ? "Save changes" : "Save draft"}</button> : null}
            {editable && isDraft ? <button type="button" className="btn btn-sm btn-primary" disabled={busy} onClick={() => save(true)}>Publish</button> : null}
          </div>
        </div>
      </div>
    </section>
  )
}
