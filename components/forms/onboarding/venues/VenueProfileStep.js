/* This file is part of the Twisted Artists Guild project.

 Copyright (C) 2025 Twisted Artists Guild

 Licensed under the GNU General Public License v3.0
 (https://www.gnu.org/licenses/gpl-3.0.en.html).

 This software comes with NO WARRANTY; see the license for details.

 Open source · low-profit · human-first*/

import Link from "next/link"
import { useId, useRef, useState } from "react"
import TiptapEditor from "@/components/tiptap/tiptap-editor"
import { US_STATES } from "@/utils/regions"
import {
  EVENT_SOURCE_URL_MAX_LENGTH,
  PROFILE_FIELD_ORDER,
  firstErrorField,
  mapVenueToProfile,
  saveVenueProfile,
  sanitizeDescription,
  validateVenueProfile,
} from "@/utils/venue-profile"

const FIELD_LABELS = {
  name: "Venue name",
  description: "Description",
  addressLine1: "Street address",
  addressLine2: "Address line 2",
  city: "City",
  state: "State",
  zipCode: "Zip code",
  eventSourceUrl: "Events page",
}

function Field({ id, label, optional = false, help, error, children, className = "" }) {
  return (
    <div className={`form-control w-full ${className}`}>
      <label htmlFor={id} className="label-text font-medium mb-1">
        {label}{optional ? <span className="font-normal text-base-content/60"> (optional)</span> : null}
      </label>
      {children}
      {help ? <p id={`${id}-help`} className="text-xs text-base-content/60 mt-1">{help}</p> : null}
      {error ? <p id={`${id}-error`} className="text-sm text-error mt-1">{error}</p> : null}
    </div>
  )
}

// The profile step shared by the join wizard and the portal edit page: name, description, address and events page.
// `initialForm` is the venue as mapVenueToProfile returns it. Saving checks every field first and shows an error next to
// each one that is wrong. "Save and continue" calls `onContinue`; with `showSaveOnly` there is also a plain Save that
// stays on the page and says it worked.
export default function VenueProfileStep({
  initialForm,
  title,
  intro,
  backHref,
  backLabel,
  continueLabel = "Save and continue",
  onContinue,
  showSaveOnly = false,
}) {
  const baseId = useId()
  const summaryRef = useRef(null)
  const [form, setForm] = useState(initialForm)
  const [errors, setErrors] = useState({})
  const [status, setStatus] = useState("idle")
  const [message, setMessage] = useState("")

  const idOf = (field) => `${baseId}-${field}`
  const isSaving = status === "saving"
  const describedBy = (field) => [errors[field] ? `${idOf(field)}-error` : "", `${idOf(field)}-help`].filter(Boolean).join(" ")

  const update = (field, value) => {
    setForm((current) => ({ ...current, [field]: value }))
    setErrors((current) => (current[field] ? { ...current, [field]: undefined } : current))
    if (status === "saved") setStatus("idle")
  }

  const save = async (andContinue) => {
    const found = validateVenueProfile(form)
    setErrors(found)
    if (Object.keys(found).length > 0) {
      setStatus("invalid")
      setMessage("")
      // Move to the summary first so a screen reader announces it, then to the first field with a problem.
      requestAnimationFrame(() => {
        summaryRef.current?.focus()
        const first = firstErrorField(found)
        if (first && first !== "description") document.getElementById(idOf(first))?.focus()
      })
      return
    }

    setStatus("saving")
    setMessage("")
    const result = await saveVenueProfile({ form: { ...form, description: sanitizeDescription(form.description) } })
    if (!result.ok) {
      setStatus("error")
      setMessage(result.message)
      return
    }

    // Saving can give the venue a new address row, so the id comes from the fresh copy.
    const fresh = result.venue ? mapVenueToProfile(result.venue) : null
    setForm((current) => ({ ...current, description: sanitizeDescription(current.description), addressID: fresh?.addressID || current.addressID }))
    setStatus("saved")

    if (andContinue) {
      onContinue?.()
      return
    }

    setMessage("Venue details saved.")
  }

  const errorEntries = PROFILE_FIELD_ORDER.filter((field) => errors[field])

  return (
    <form
      className="card bg-base-100 shadow border border-base-300"
      noValidate
      aria-label={title}
      onSubmit={(event) => {
        event.preventDefault()
        if (!isSaving) save(true)
      }}
    >
      <div className="card-body gap-5">
        <div>
          <h2 className="card-title">{title}</h2>
          {intro ? <p className="text-sm text-base-content/70">{intro}</p> : null}
        </div>

        <div ref={summaryRef} tabIndex={-1} role={errorEntries.length > 0 ? "alert" : undefined} className="focus:outline-none">
          {errorEntries.length > 0 ? (
            <div className="alert alert-error items-start">
              <div>
                <p className="font-semibold">{errorEntries.length === 1 ? "One thing needs fixing:" : `${errorEntries.length} things need fixing:`}</p>
                <ul className="list-disc ml-5 text-sm">
                  {errorEntries.map((field) => (
                    <li key={field}>{FIELD_LABELS[field]}: {errors[field]}</li>
                  ))}
                </ul>
              </div>
            </div>
          ) : null}
        </div>

        <Field id={idOf("name")} label={FIELD_LABELS.name} error={errors.name}>
          <input
            id={idOf("name")}
            type="text"
            className={`input input-bordered w-full ${errors.name ? "input-error" : ""}`}
            value={form.name}
            onChange={(event) => update("name", event.target.value)}
            autoComplete="organization"
            aria-required="true"
            aria-invalid={errors.name ? "true" : "false"}
            aria-describedby={describedBy("name")}
          />
        </Field>

        <div className="form-control w-full">
          <span className="label-text font-medium mb-1">
            {FIELD_LABELS.description}<span className="font-normal text-base-content/60"> (optional)</span>
          </span>
          <div className={`rounded-box border bg-base-100 ${errors.description ? "border-error" : "border-base-300"}`}>
            <TiptapEditor
              value={form.description}
              onChange={(html) => update("description", html)}
              placeholder="Describe the space: size, stage, sound, parking, what kinds of events it suits."
              preset="minimal"
              minHeight={160}
              headingLevels={[2, 3]}
              showAlignmentControls={false}
              allowStrikethrough={false}
              ariaLabel={FIELD_LABELS.description}
            />
          </div>
          <p className="text-xs text-base-content/60 mt-1">Shown on your venue page. Basic formatting and links only.</p>
          {errors.description ? <p className="text-sm text-error mt-1">{errors.description}</p> : null}
        </div>

        <fieldset className="space-y-3 min-w-0">
          <legend className="label-text font-medium mb-1">Address</legend>
          <Field id={idOf("addressLine1")} label={FIELD_LABELS.addressLine1} error={errors.addressLine1}>
            <input
              id={idOf("addressLine1")}
              type="text"
              className={`input input-bordered w-full ${errors.addressLine1 ? "input-error" : ""}`}
              value={form.addressLine1}
              onChange={(event) => update("addressLine1", event.target.value)}
              autoComplete="address-line1"
              aria-required="true"
              aria-invalid={errors.addressLine1 ? "true" : "false"}
              aria-describedby={describedBy("addressLine1")}
            />
          </Field>
          <Field id={idOf("addressLine2")} label={FIELD_LABELS.addressLine2} optional error={errors.addressLine2}>
            <input
              id={idOf("addressLine2")}
              type="text"
              className={`input input-bordered w-full ${errors.addressLine2 ? "input-error" : ""}`}
              value={form.addressLine2}
              onChange={(event) => update("addressLine2", event.target.value)}
              autoComplete="address-line2"
              aria-invalid={errors.addressLine2 ? "true" : "false"}
              aria-describedby={describedBy("addressLine2")}
            />
          </Field>
          <div className="grid grid-cols-1 sm:grid-cols-6 gap-3">
            <Field id={idOf("city")} label={FIELD_LABELS.city} error={errors.city} className="sm:col-span-3">
              <input
                id={idOf("city")}
                type="text"
                className={`input input-bordered w-full ${errors.city ? "input-error" : ""}`}
                value={form.city}
                onChange={(event) => update("city", event.target.value)}
                autoComplete="address-level2"
                aria-required="true"
                aria-invalid={errors.city ? "true" : "false"}
                aria-describedby={describedBy("city")}
              />
            </Field>
            <Field id={idOf("state")} label={FIELD_LABELS.state} error={errors.state} className="sm:col-span-2">
              <select
                id={idOf("state")}
                className={`select select-bordered w-full ${errors.state ? "select-error" : ""}`}
                value={form.state}
                onChange={(event) => update("state", event.target.value)}
                autoComplete="address-level1"
                aria-required="true"
                aria-invalid={errors.state ? "true" : "false"}
                aria-describedby={describedBy("state")}
              >
                <option value="">Choose a state</option>
                {US_STATES.map((state) => (
                  <option key={state.code} value={state.code}>{state.name}</option>
                ))}
              </select>
            </Field>
            <Field id={idOf("zipCode")} label={FIELD_LABELS.zipCode} error={errors.zipCode} className="sm:col-span-1">
              <input
                id={idOf("zipCode")}
                type="text"
                inputMode="numeric"
                className={`input input-bordered w-full ${errors.zipCode ? "input-error" : ""}`}
                value={form.zipCode}
                onChange={(event) => update("zipCode", event.target.value)}
                autoComplete="postal-code"
                maxLength={10}
                aria-required="true"
                aria-invalid={errors.zipCode ? "true" : "false"}
                aria-describedby={describedBy("zipCode")}
              />
            </Field>
          </div>
        </fieldset>

        <Field
          id={idOf("eventSourceUrl")}
          label={FIELD_LABELS.eventSourceUrl}
          optional
          help="A page on your website that lists your events, starting with https://. We may use it later to keep your listings up to date."
          error={errors.eventSourceUrl}
        >
          <input
            id={idOf("eventSourceUrl")}
            type="url"
            inputMode="url"
            className={`input input-bordered w-full ${errors.eventSourceUrl ? "input-error" : ""}`}
            value={form.eventSourceUrl}
            onChange={(event) => update("eventSourceUrl", event.target.value)}
            maxLength={EVENT_SOURCE_URL_MAX_LENGTH}
            autoComplete="url"
            placeholder="https://"
            aria-invalid={errors.eventSourceUrl ? "true" : "false"}
            aria-describedby={describedBy("eventSourceUrl")}
          />
        </Field>

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
