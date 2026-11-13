/* This file is part of the Twisted Artists Guild project.

 Copyright (C) 2025 Twisted Artists Guild

 Licensed under the GNU General Public License v3.0
 (https://www.gnu.org/licenses/gpl-3.0.en.html).

 This software comes with NO WARRANTY; see the license for details.

 Open source · low-profit · human-first*/
const apiUrl = (process.env.DOTNET_API_URL || "https://api.twistedartistsguild.com/api").replace(/\/+$/, "")

module.exports = {
	// REQUIRED: add your own domain name here (e.g. https://shipfa.st),
	siteUrl: process.env.SITE_URL || "https://twistedartistsguild.com",
	generateRobotsTxt: true,
	// use this to exclude routes from the sitemap (i.e. a user dashboard)
	exclude: ["/portal/*","/dashboard/*"],
	// Published venues are public pages, so they are listed too. A failed lookup must never fail the build.
	additionalPaths: async (config) => {
		try {
			const response = await fetch(`${apiUrl}/venue`)
			if (!response.ok) return []
			const venues = await response.json()
			const entries = await Promise.all(
				(Array.isArray(venues) ? venues : [])
					.filter((venue) => venue?.slug)
					.map((venue) => config.transform(config, `/venue/${encodeURIComponent(venue.slug)}`))
			)
			return entries.filter(Boolean)
		} catch {
			return []
		}
	},
}
