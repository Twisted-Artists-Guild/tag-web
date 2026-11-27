/* This file is part of the Twisted Artists Guild project.

 Copyright (C) 2025 Twisted Artists Guild

 Licensed under the GNU General Public License v3.0
 (https://www.gnu.org/licenses/gpl-3.0.en.html).

 This software comes with NO WARRANTY; see the license for details.

 Open source · low-profit · human-first*/

import { getServerSession } from "next-auth/next"
import TagSEO from "@/components/TagSEO"
import VenueEventForm from "@/components/venues/VenueEventForm"
import EventHostsPanel from "@/components/venues/EventHostsPanel"
import serverFetch from "@/libs/serverFetch"
import { authOptions } from "@/pages/api/auth/[...nextauth]"
import { fetchJsonWithSession } from "@/utils/venue-form"
import { loadManagedVenue, normalizeEvent } from "@/utils/venue-events"

// Create an event for the venue (/events/new) or edit one (/events/<id>). The venue is fixed by the address, so an event
// can only be made for the venue it is opened under, and an event of another venue is treated as missing.
export default function VenueEventPage({ venue, event, notice }) {
	const pageMetaData = {
		title: event ? "Edit Event" : "Create Event",
		description: "Create and manage an event hosted by your venue.",
		keywords: "venue, portal, events",
		robots: "no-index, no-follow",
	}

	return (
		<div className="min-h-screen bg-base-200 p-4 md:p-8">
			<TagSEO metadataProp={pageMetaData} canonicalSlug={`portal/venue/${venue.slug}/events/${event ? event.id : "new"}`} />
			<div className="mx-auto max-w-3xl space-y-6">
				<VenueEventForm key={event ? event.id : "new"} venue={venue} event={event} notice={notice} />
				{event ? <EventHostsPanel eventId={event.id} /> : null}
			</div>
		</div>
	)
}

export async function getServerSideProps(context) {
	const session = await getServerSession(context.req, context.res, authOptions)
	if (!session?.user) {
		return {
			redirect: {
				destination: `/api/auth/signin?callbackUrl=${encodeURIComponent(context.resolvedUrl || "/portal/venue")}`,
				permanent: false,
			},
		}
	}

	const loaded = await loadManagedVenue({ req: context.req, slug: context.params?.slug, fetchApi: serverFetch })
	if (loaded.notFound) return { notFound: true }
	if (loaded.redirect) return { redirect: { destination: loaded.redirect, permanent: false } }

	const { venue } = loaded
	const rawId = String(context.params?.eventId || "")
	const notice = ["created", "published"].includes(String(context.query?.notice)) ? String(context.query.notice) : null

	if (rawId === "new") {
		return { props: { venue, event: null, notice: null } }
	}

	const eventId = Number(rawId)
	if (!Number.isInteger(eventId) || eventId <= 0) return { notFound: true }

	const raw = await fetchJsonWithSession({ req: context.req, path: `/event/${eventId}`, fetchApi: serverFetch })
	if (!raw) return { notFound: true }

	const event = normalizeEvent(raw)
	if (event.venueId !== venue.id) return { notFound: true }

	// An artist's event at this venue is view only here.
	if (!event.canManage) {
		return { redirect: { destination: `/portal/venue/${venue.slug}`, permanent: false } }
	}

	return { props: { venue, event, notice } }
}
