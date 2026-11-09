/* This file is part of the Twisted Artists Guild project.

 Copyright (C) 2025 Twisted Artists Guild

 Licensed under the GNU General Public License v3.0
 (https://www.gnu.org/licenses/gpl-3.0.en.html).

 This software comes with NO WARRANTY; see the license for details.

 Open source · low-profit · human-first*/

import Link from "next/link"
import { getServerSession } from "next-auth/next"
import TagSEO from "@/components/TagSEO"
import VenueContextNav from "@/components/portal/VenueContextNav"
import { authOptions } from "@/pages/api/auth/[...nextauth]"
import serverFetch from "@/libs/serverFetch"
import { fetchJsonWithSession } from "@/utils/venue-form"

export default function VenuePortalIndex({ venues }) {
	const pageMetaData = {
		title: "Venue Portal",
		description: "Venue workspace and routing hub.",
		keywords: "venue, portal, events, slug",
		robots: "noindex, nofollow",
		og: { title: "Venue Portal", description: "Venue workspace and routing hub." },
	}

	return (
		<div className="min-h-screen bg-base-200 p-4 md:p-8">
			<TagSEO metadataProp={pageMetaData} canonicalSlug="portal/venue" />
			<VenueContextNav />
			<div className="mx-auto max-w-6xl space-y-6">
				<section className="card bg-base-100 shadow-lg border border-base-300">
					<div className="card-body gap-3">
						<div className="flex items-center justify-between gap-3 flex-wrap">
							<div>
								<p className="text-xs uppercase tracking-widest text-base-content/50">Portal Domain</p>
								<h1 className="text-3xl font-bold text-primary mt-1">Venue Workspace</h1>
							</div>

						</div>
						<p className="text-base-content/75 max-w-3xl">
							Access venue-specific slug routes and profile editing from a consistent portal workspace pattern.
						</p>
					</div>
				</section>
				{Array.isArray(venues) && venues.length > 0 ? (
					<section className="card bg-base-100 shadow border border-base-300">
						<div className="card-body gap-4">
							<h2 className="text-xl font-semibold text-base-content">Linked Venues</h2>
							<p className="text-sm text-base-content/70">Venue entities attributed to your user account.</p>
							<div className="overflow-x-auto rounded-xl border border-base-300">
								<table className="table table-zebra table-sm">
									<thead>
										<tr>
											<th>Venue</th>
											<th>Slug</th>
											<th className="text-right">Portal</th>
										</tr>
									</thead>
									<tbody>
										{venues.map((venue) => {
											const slug = venue.slug || venue.path || venue.Path || ""
											return (
												<tr key={`${venue.id || venue.ID || venue.venueID || slug || venue.name}`}> 
													<td className="font-medium">{venue.name || venue.Name || slug || "Unnamed Venue"}</td>
													<td><code>{slug || "(no slug)"}</code></td>
													<td className="text-right">
														{slug ? (
															<Link href={`/portal/venue/${slug}`} className="btn btn-xs btn-primary">Open</Link>
														) : (
															<span className="badge badge-ghost badge-sm">n/a</span>
														)}
													</td>
												</tr>
											)
										})}
									</tbody>
								</table>
							</div>
						</div>
					</section>
				) : (
					<section className="card bg-base-100 shadow border border-base-300">
						<div className="card-body gap-4">
							<p className="text-base-content/70">No linked venues found for this account.</p>
							<Link href="/join/venue" className="btn btn-primary">
								Register as a Venue
							</Link>
						</div>
					</section>
				)}
			</div>
		</div>
	)
}

export async function getServerSideProps(context) {
	const session = await getServerSession(context.req, context.res, authOptions)

	if (!session?.user) {
		return {
			redirect: {
				destination: `/api/auth/signin?callbackUrl=${encodeURIComponent("/portal/venue")}`,
				permanent: false,
			},
		}
	}

	const userId = session.user.id

	if (!userId) {
		return { props: { venues: [] } }
	}

	try {
		// serverFetch returns a Response, and the endpoint needs the session token; the helper handles both.
		const venues = await fetchJsonWithSession({
			req: context.req,
			path: `/linker_usertovenue/byUserID/${userId}`,
			fetchApi: serverFetch,
		})

		if (venues) {
			return {
				props: {
					venues: Array.isArray(venues) ? venues : [],
				},
			}
		}
	} catch (error) {
		console.error("Error fetching venues:", error)
	}

	return { props: { venues: [] } }
}
