/* This file is part of the Twisted Artists Guild project.

 Copyright (C) 2025 Twisted Artists Guild

 Licensed under the GNU General Public License v3.0
 (https://www.gnu.org/licenses/gpl-3.0.en.html).

 This software comes with NO WARRANTY; see the license for details.

 Open source · low-profit · human-first*/


import Link from "next/link"
import TagSEO from "@/components/TagSEO"
import shortDateOptions from "@/utils/shortdateoptions"
import UnifiedCard from "@/components/cards/UnifiedCard"
import serverFetch from "@/libs/serverFetch"

/**
 * 
 * @param {*} props 
 * @returns 
 */
const Events = (props) => {
	const options = shortDateOptions
	const pageMetaData = {
		title: "Regional Events Main Page",
		description: "A list of regional events",
		keywords: "events, ticket, art, performances, classes, teaching",
		robots: "index, follow",
		author: "Bobb Shields",
		viewport: "width=device-width, initial-scale=1.0",
		og: {
			title: "Regional Events Main Page",
			description: "A list of regional events",
		},
	}

	return (
		<div className="p-4">
			<TagSEO metadataProp={pageMetaData} canonicalSlug="regionalevents" />
			<div className="mb-4">
				<Link href="/portal/event/create">
					<a className="btn btn-primary">Create a new event</a>
				</Link>
			</div>
			<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
				{props.events.map((event) => (
					<UnifiedCard
						key={event.eventnum || event.eventID || event.EventID}
						title={event.title || "Untitled event"}
						summary={event.byline || event.description || "Event details"}
						image={event.logoPic?.url || event.logoPic?.URL || event.logoPic?.normalizedURL || event.logoPic?.NormalizedURL || event.logo?.url || event.logo?.URL || "/blank_image.png"}
						imageAlt={event.title || "Event image"}
						logoImage={event.logoPic?.url || event.logoPic?.URL || event.logoPic?.normalizedURL || event.logoPic?.NormalizedURL || event.logo?.url || event.logo?.URL || ""}
						logoEntityType="event"
						logoEntityId={event.eventID || event.EventID || event.eventnum || ""}
						href={`/events/${event.path}`}
						badge="Event"
						date={event.applied}
						size="md"
						showImpressions={false}
						showComments={false}
						showReport={false}
						footer={(
							<Link href="/portal/event/create" className="btn btn-xs btn-outline">Event Gallery Management</Link>
						)}
					/>
				))}
			</div>
		</div>
	)
}

Events.getInitialProps = async function () {
	let data = []

	// If we are running in debug mode, log the active API URL
	if (process.env.DEBUG === "true") {
		console.log("regional event data fetch starting\n /api/artist/") //broke!
	}
	const res = await serverFetch("/event")
		.then((res) => {
			return res.json()
		})
		.then((res) => (data = res))
		.catch((error) => {
			console.log("An error has occured with your fetch request.. ", error)
		})

	console.log(`event data fetched. Count: ${data.length}`)
	//console.log(data); // Print the contents of the data variable

	return {
		events: data,
		status: res.status,
	}
}

export default Events
