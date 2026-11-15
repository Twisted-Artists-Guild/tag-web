/* This file is part of the Twisted Artists Guild project.

 Copyright (C) 2025 Twisted Artists Guild

 Licensed under the GNU General Public License v3.0
 (https://www.gnu.org/licenses/gpl-3.0.en.html).

 This software comes with NO WARRANTY; see the license for details.

 Open source · low-profit · human-first*/

import Link from "next/link"
import { useMemo, useState } from "react"
import { changeEventStatus, deleteVenueEvent, describeWhen, normalizeEvent, splitEvents } from "@/utils/venue-events"

// The venue workspace's events: what is coming up and what has happened. The venue's own events can be edited, published,
// cancelled or deleted (drafts only). An artist's event at the venue is shown for information and is view only.
export default function VenueEventsPanel({ venue, initialEvents }) {
  const [events, setEvents] = useState(() => (Array.isArray(initialEvents) ? initialEvents.map(normalizeEvent) : []))
  const [busyId, setBusyId] = useState(null)
  const [confirm, setConfirm] = useState(null)
  const [notice, setNotice] = useState({ tone: "", text: "", problems: [] })

  const { upcoming, past } = useMemo(() => splitEvents(events), [events])
  const newHref = `/portal/venue/${venue.slug}/events/new`

  const run = async (event, action) => {
    setConfirm(null)
    setBusyId(event.id)
    setNotice({ tone: "", text: "", problems: [] })
    const result = action === "delete"
      ? await deleteVenueEvent({ eventId: event.id })
      : await changeEventStatus({ eventId: event.id, action })
    setBusyId(null)

    if (!result.ok) {
      setNotice({ tone: "error", text: `${event.title || "This event"}: ${result.message}`, problems: result.problems })
      return
    }

    if (action === "delete") {
      setEvents((current) => current.filter((item) => item.id !== event.id))
      setNotice({ tone: "success", text: `"${event.title}" was deleted.`, problems: [] })
      return
    }

    const updated = result.event || { ...event, status: action === "publish" ? "Published" : action === "cancel" ? "Cancelled" : "Draft" }
    setEvents((current) => current.map((item) => (item.id === event.id ? { ...item, ...updated, canManage: true } : item)))
    const done = { publish: "is now published", unpublish: "is back to a draft", cancel: "was cancelled" }[action]
    setNotice({ tone: "success", text: `"${event.title}" ${done}.`, problems: [] })
  }

  const renderEvent = (event) => {
    const busy = busyId === event.id
    const confirming = confirm && confirm.id === event.id ? confirm.action : null
    const hostLine = event.artistId ? `Hosted by ${event.artistName || "an artist"}${event.canManage ? "" : " · view only"}` : "Hosted by your venue"

    return (
      <li key={event.id} className="rounded-box border border-base-300 bg-base-100 p-3 space-y-2">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="font-semibold break-words">
              {event.canManage ? (
                <Link href={`/portal/venue/${venue.slug}/events/${event.id}`} className="link link-hover">{event.title || "Untitled event"}</Link>
              ) : (
                event.title || "Untitled event"
              )}
            </p>
            <p className="text-sm text-base-content/70">{describeWhen(event)}</p>
            <p className="text-xs text-base-content/60">{hostLine}</p>
          </div>
          <span className={`badge ${event.statusInfo.tone}`}>{event.statusInfo.label}</span>
        </div>

        {event.canManage ? (
          <div className="flex flex-wrap gap-2">
            {event.status === "Draft" || event.status === "Published" || event.status === "PendingReview" ? (
              <Link href={`/portal/venue/${venue.slug}/events/${event.id}`} className="btn btn-xs btn-outline">Edit</Link>
            ) : null}
            {event.status === "Draft" ? (
              <button type="button" className="btn btn-xs btn-primary" disabled={busy} onClick={() => run(event, "publish")}>Publish</button>
            ) : null}
            {event.status === "Published" ? (
              <button type="button" className="btn btn-xs btn-outline" disabled={busy} onClick={() => run(event, "unpublish")}>Unpublish</button>
            ) : null}
            {event.status === "Draft" || event.status === "Published" ? (
              <button type="button" className="btn btn-xs btn-outline btn-error" disabled={busy} onClick={() => setConfirm({ id: event.id, action: "cancel" })}>Cancel event</button>
            ) : null}
            {event.status === "Draft" ? (
              <button type="button" className="btn btn-xs btn-ghost text-error" disabled={busy} onClick={() => setConfirm({ id: event.id, action: "delete" })}>Delete</button>
            ) : null}
            {busy ? <span className="loading loading-spinner loading-xs" aria-label="Working" /> : null}
          </div>
        ) : null}

        {confirming ? (
          <div role="alert" className="alert alert-warning flex flex-wrap items-center justify-between gap-2 py-2">
            <span className="text-sm">
              {confirming === "cancel"
                ? "Cancel this event? People will see that it was cancelled, and you can't publish it again."
                : "Delete this draft? This can't be undone."}
            </span>
            <span className="flex gap-2">
              <button type="button" className="btn btn-xs" onClick={() => setConfirm(null)}>Keep it</button>
              <button type="button" className="btn btn-xs btn-error" onClick={() => run(event, confirming)}>
                {confirming === "cancel" ? "Yes, cancel it" : "Yes, delete it"}
              </button>
            </span>
          </div>
        ) : null}
      </li>
    )
  }

  return (
    <section className="space-y-4" aria-labelledby="venue-events-title">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 id="venue-events-title" className="text-xl font-semibold">Events</h2>
          <p className="text-sm text-base-content/70">Create events your venue hosts. Drafts stay private until you publish them.</p>
        </div>
        <Link href={newHref} className="btn btn-sm btn-primary">Create event</Link>
      </div>

      <div aria-live="polite">
        {notice.text ? (
          <div role={notice.tone === "error" ? "alert" : "status"} className={`alert ${notice.tone === "error" ? "alert-error" : "alert-success"} items-start`}>
            <div>
              <p>{notice.text}</p>
              {notice.problems.length > 0 ? (
                <ul className="list-disc pl-5 text-sm">{notice.problems.map((problem) => <li key={problem}>{problem}</li>)}</ul>
              ) : null}
            </div>
          </div>
        ) : null}
      </div>

      <div className="space-y-2">
        <h3 className="font-semibold">Upcoming</h3>
        {upcoming.length > 0 ? (
          <ul className="space-y-2">{upcoming.map(renderEvent)}</ul>
        ) : (
          <p className="text-sm text-base-content/70">Nothing is coming up. <Link href={newHref} className="link">Create the first event</Link>.</p>
        )}
      </div>

      {past.length > 0 ? (
        <div className="space-y-2">
          <h3 className="font-semibold">Past</h3>
          <ul className="space-y-2">{past.map(renderEvent)}</ul>
        </div>
      ) : null}
    </section>
  )
}
