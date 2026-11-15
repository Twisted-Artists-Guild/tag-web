/* This file is part of the Twisted Artists Guild project.

 Copyright (C) 2025 Twisted Artists Guild

 Licensed under the GNU General Public License v3.0
 (https://www.gnu.org/licenses/gpl-3.0.en.html).

 This software comes with NO WARRANTY; see the license for details.

 Open source · low-profit · human-first*/

import Link from "next/link"
import { getServerSession } from "next-auth/next"
import TagSEO from "@/components/TagSEO"
import VenueEventsPanel from "@/components/venues/VenueEventsPanel"
import serverFetch from "@/libs/serverFetch"
import { authOptions } from "@/pages/api/auth/[...nextauth]"
import { fetchJsonWithSession } from "@/utils/venue-form"
import { loadManagedVenue } from "@/utils/venue-events"

export default function VenuePortalSlugIndex({ venue, events }) {
	const pageMetaData = {
		title: "Venue Portal",
		description: "Venue workspace for managing events and information.",
		keywords: "venue, portal, events",
		robots: "no-index, no-follow",
	}

	return (
		<div className="min-h-screen bg-base-200 p-4 md:p-8">
			<TagSEO metadataProp={pageMetaData} canonicalSlug={`portal/venue/${venue.slug}`} />

			<div className="mx-auto max-w-5xl space-y-6">
				<section className="card bg-base-100 border border-base-300 shadow">
					<div className="card-body gap-4">
						<div className="flex items-start justify-between gap-4 flex-wrap">
							<div>
								<div className="text-xs uppercase tracking-widest text-base-content/50">Venue Portal</div>
								<h1 className="text-3xl font-bold text-primary mt-1">{venue.name || venue.slug}</h1>
								<p className="text-base-content/70 mt-2 max-w-3xl">
									Manage your venue&apos;s information and the events it hosts.
								</p>
							</div>
							<div className="flex gap-2 flex-wrap">
								<Link href={`/portal/venue/${venue.slug}/edit`} className="btn btn-sm btn-accent">Edit Profile</Link>
								<Link href={`/venue/${venue.slug}`} className="btn btn-sm btn-outline">View public page</Link>
								<Link href="/portal/venue" className="btn btn-sm btn-ghost">Back to Venue Portal</Link>
							</div>
						</div>
					</div>
				</section>

				<section className="card bg-base-100 border border-base-300 shadow">
					<div className="card-body">
						<VenueEventsPanel venue={venue} initialEvents={events} />
					</div>
				</section>
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

	// The venue's own events in any state, plus other people's events at the venue once they are published.
	const events = await fetchJsonWithSession({
		req: context.req,
		path: `/event/venue/${loaded.venue.id}/manage`,
		fetchApi: serverFetch,
	})

	return { props: { venue: loaded.venue, events: Array.isArray(events) ? events : [] } }
}
