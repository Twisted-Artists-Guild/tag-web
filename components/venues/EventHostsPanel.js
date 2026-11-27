/* This file is part of the Twisted Artists Guild project.

 Copyright (C) 2025 Twisted Artists Guild

 Licensed under the GNU General Public License v3.0
 (https://www.gnu.org/licenses/gpl-3.0.en.html).

 This software comes with NO WARRANTY; see the license for details.

 Open source · low-profit · human-first*/

import { useCallback, useEffect, useId, useState } from "react"
import {
  EVENT_HOST_ROLES,
  EVENT_HOST_TYPES,
  addEventHost,
  changeEventHostRole,
  describeRole,
  emptyHostForm,
  loadEventHosts,
  removeEventHost,
  validateHostForm,
} from "@/utils/event-hosts"

// Who else takes part in an event and what they may do. Anyone involved can see the list; only the owner can change it.
export default function EventHostsPanel({ eventId }) {
  const uid = useId()
  const idOf = (name) => `${uid}-${name}`
  const [state, setState] = useState({ loading: true, error: "", data: null })
  const [form, setForm] = useState(emptyHostForm)
  const [errors, setErrors] = useState({})
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState("")

  const apply = useCallback((result) => {
    setState(result.ok ? { loading: false, error: "", data: result.data } : { loading: false, error: result.message, data: null })
  }, [])

  useEffect(() => {
    let cancelled = false
    loadEventHosts({ eventId }).then((result) => {
      if (!cancelled) apply(result)
    })
    return () => {
      cancelled = true
    }
  }, [eventId, apply])

  const run = async (action) => {
    setBusy(true)
    setMessage("")
    const result = await action()
    if (!result.ok) {
      setBusy(false)
      setMessage(result.message)
      return false
    }
    apply(await loadEventHosts({ eventId }))
    setBusy(false)
    return true
  }

  const add = async (e) => {
    e.preventDefault()
    const found = validateHostForm(form)
    setErrors(found)
    if (Object.keys(found).length > 0) return
    if (await run(() => addEventHost({ eventId, form }))) setForm(emptyHostForm())
  }

  if (state.loading) return <div className="card bg-base-100 border border-base-300 shadow"><div className="card-body"><span className="loading loading-spinner loading-sm" aria-label="Loading hosts" /></div></div>
  if (!state.data) return <div role="alert" className="alert alert-error">{state.error}</div>

  const { owner, hosts, canManageHosts, myRole } = state.data

  return (
    <section className="card bg-base-100 border border-base-300 shadow" aria-labelledby={idOf("heading")}>
      <div className="card-body gap-4">
        <div>
          <h2 id={idOf("heading")} className="text-xl font-bold">Hosts and roles</h2>
          <p className="text-sm text-base-content/70">Your role: {describeRole(myRole)}. {canManageHosts ? "You can add people, artists and venues to this event." : "Only the owner can change this list."}</p>
        </div>

        <ul className="divide-y divide-base-300">
          {owner ? (
            <li className="flex flex-wrap items-center justify-between gap-2 py-2">
              <span>{owner.name || `${owner.type} ${owner.id}`} <span className="text-xs text-base-content/60">({owner.type})</span></span>
              <span className="badge badge-primary">Owner</span>
            </li>
          ) : null}
          {hosts.map((host) => (
            <li key={host.rowId} className="flex flex-wrap items-center justify-between gap-2 py-2">
              <span>{host.name || `${host.type} ${host.id}`} <span className="text-xs text-base-content/60">({host.type})</span></span>
              {canManageHosts ? (
                <span className="flex items-center gap-2">
                  <label className="sr-only" htmlFor={idOf(`role-${host.rowId}`)}>Role for {host.name || host.type}</label>
                  <select id={idOf(`role-${host.rowId}`)} className="select select-bordered select-sm" value={host.role} disabled={busy} onChange={(e) => run(() => changeEventHostRole({ eventId, hostRowId: host.rowId, role: e.target.value }))}>
                    {EVENT_HOST_ROLES.map((role) => <option key={role.value} value={role.value}>{role.label}</option>)}
                  </select>
                  <button type="button" className="btn btn-sm btn-ghost text-error" disabled={busy} onClick={() => run(() => removeEventHost({ eventId, hostRowId: host.rowId }))}>Remove</button>
                </span>
              ) : (
                <span className="badge badge-ghost">{describeRole(host.role)}</span>
              )}
            </li>
          ))}
        </ul>

        {canManageHosts ? (
          <form onSubmit={add} className="grid gap-3 sm:grid-cols-4 items-end" noValidate>
            <div className="form-control">
              <label htmlFor={idOf("type")} className="label-text font-medium mb-1">Add</label>
              <select id={idOf("type")} className="select select-bordered" value={form.hostType} onChange={(e) => setForm({ ...form, hostType: e.target.value })}>
                {EVENT_HOST_TYPES.map((type) => <option key={type.value} value={type.value}>{type.label}</option>)}
              </select>
            </div>
            <div className="form-control">
              <label htmlFor={idOf("id")} className="label-text font-medium mb-1">Id</label>
              <input id={idOf("id")} inputMode="numeric" className={`input input-bordered ${errors.hostId ? "input-error" : ""}`} value={form.hostId} onChange={(e) => setForm({ ...form, hostId: e.target.value })} aria-invalid={errors.hostId ? "true" : "false"} aria-describedby={errors.hostId ? idOf("id-error") : undefined} />
              {errors.hostId ? <p id={idOf("id-error")} className="text-sm text-error mt-1">{errors.hostId}</p> : null}
            </div>
            <div className="form-control">
              <label htmlFor={idOf("role")} className="label-text font-medium mb-1">Role</label>
              <select id={idOf("role")} className="select select-bordered" value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}>
                {EVENT_HOST_ROLES.map((role) => <option key={role.value} value={role.value}>{role.label}</option>)}
              </select>
            </div>
            <button type="submit" className="btn btn-primary" disabled={busy}>Add host</button>
          </form>
        ) : null}

        <div aria-live="polite">{message ? <div role="alert" className="alert alert-error"><span>{message}</span></div> : null}</div>
      </div>
    </section>
  )
}
