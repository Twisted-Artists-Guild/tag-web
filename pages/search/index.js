/* This file is part of the Twisted Artists Guild project.

 Copyright (C) 2025 Twisted Artists Guild

 Licensed under the GNU General Public License v3.0
 (https://www.gnu.org/licenses/gpl-3.0.en.html).

 This software comes with NO WARRANTY; see the license for details.

 Open source · low-profit · human-first*/
import React, { useState } from "react"
import Link from "next/link"
import TagSEO from "@/components/TagSEO"
import ArtistCardSmall from "@/components/cards/card_artist_small"
import ListingCardSmall from "@/components/cards/card_listing_small"

const ENTITY_TYPES = ["artist", "listing", "event", "user", "venue"]
const SEARCH_TYPE_OPTIONS = ["all", ...ENTITY_TYPES]

const SEARCH_ENDPOINTS = {
	artist: "search/artist",
	listing: "search/listing",
	event: "search/event",
	user: "search/user",
	venue: "search/venue",
}

const SEARCH_TYPE_LABELS = {
	all: "All",
	artist: "Artists",
	listing: "Listings",
	event: "Events",
	user: "Users",
	venue: "Venues",
}

function buildEmptyResultsByType() {
	return ENTITY_TYPES.reduce((acc, type) => {
		acc[type] = []
		return acc
	}, {})
}

function getSearchTypes(searchType) {
	if (searchType === "all") return ENTITY_TYPES
	return ENTITY_TYPES.includes(searchType) ? [searchType] : ["artist"]
}

async function fetchSearchResults(type, queryText, limit = 20, baseUrl = "") {
	const endpointPath = SEARCH_ENDPOINTS[type]
	if (!endpointPath || !queryText) return []

	const endpoint = `/api/${endpointPath}?q=${encodeURIComponent(queryText)}&limit=${limit}`
	const response = await fetch(endpoint)
	// User search needs sign-in, so signed-out visitors simply get no user results.
	if (type === "user" && response.status === 401) return []
	if (!response.ok) {
		throw new Error(`Search ${type} failed with status ${response.status}`)
	}

	const data = await response.json()
	return Array.isArray(data) ? data : []
}

async function fetchArtistPathById(artistId, baseUrl = "") {
	if (!artistId) return ""
	try {
		const response = await fetch(`/api/artist/byID/${artistId}`)
		if (!response.ok) return ""
		const artist = await response.json()
		return artist?.path || ""
	} catch {
		return ""
	}
}

async function attachArtistPathsToListings(listings, artistResults = [], baseUrl = "") {
	if (!Array.isArray(listings) || listings.length === 0) return []

	const artistPathById = new Map()
	artistResults.forEach((artist) => {
		const artistId = Number(artist?.artistID || artist?.artistId || 0)
		if (artistId > 0 && artist?.path) {
			artistPathById.set(artistId, artist.path)
		}
	})

	const unresolvedArtistIds = [...new Set(
		listings
			.map((listing) => Number(listing?.artistID || listing?.artistId || 0))
			.filter((artistId) => artistId > 0 && !artistPathById.has(artistId))
	)]

	if (unresolvedArtistIds.length > 0) {
		const resolvedPaths = await Promise.all(
			unresolvedArtistIds.map((artistId) => fetchArtistPathById(artistId, baseUrl))
		)
		resolvedPaths.forEach((artistPath, idx) => {
			if (artistPath) {
				artistPathById.set(unresolvedArtistIds[idx], artistPath)
			}
		})
	}

	return listings.map((listing) => {
		const artistId = Number(listing?.artistID || listing?.artistId || 0)
		const artistPath =
			listing?.artist?.path ||
			listing?.artistPath ||
			listing?.artistpath ||
			(artistId > 0 ? artistPathById.get(artistId) : "") ||
			""

		return {
			...listing,
			artistPath,
			artist: {
				...(listing.artist || {}),
				path: artistPath,
			},
		}
	})
}

function normalizeResults(data, searchType) {
	if (!Array.isArray(data)) return []

	return data.map((item, index) => {
		if (searchType === "artist") {
			const path = item.path || item.slug || ""
			return {
				key: item.artistID || item.artistid || `artist-${index}`,
				href: path ? `/artists/${path}` : null,
				label: item.byline || item.title || "Untitled artist",
				canLink: Boolean(path),
				cardData: {
					...item,
					path,
				},
			}
		}

		if (searchType === "listing") {
			const listingPath = item.path || ""
			const artistPath = item?.artist?.path || item.artistPath || item.artistpath || ""
			const canLink = Boolean(listingPath && artistPath)
			return {
				key: item.listingID || item.listingid || `listing-${index}`,
				href: canLink ? `/artists/${artistPath}/listings/${listingPath}` : null,
				label: item.title || "Untitled listing",
				canLink,
				artistLabel: item?.artist?.title || item.artistTitle || `Artist #${item.artistID || item.artistId || "unknown"}`,
				cardData: {
					...item,
					path: listingPath,
					artist: {
						...(item.artist || {}),
						path: artistPath,
					},
				},
			}
		}

		if (searchType === "event") {
			const path = item.path || item.slug || ""
			return {
				key: item.eventID || item.eventid || `event-${index}`,
				href: path ? `/events/regional/${path}` : "/events",
				label: item.title || "Untitled event",
				byline: item.byline || item.description || "",
				canLink: Boolean(path),
			}
		}

		if (searchType === "user") {
			const name = [item.firstName, item.famName].filter(Boolean).join(" ").trim()
			const username = item.username || ""
			return {
				key: item.userID || item.userid || `user-${index}`,
				href: username ? `/portal/user/${username}/edit` : "/portal/user",
				label: name || item.username || "Unknown user",
				byline: item.emailOne || item.emailTwo || "",
				canLink: true,
			}
		}

		if (searchType === "venue") {
			const slug = item.slug || item.path || ""
			return {
				key: item.venueID || item.venueid || `venue-${index}`,
				href: slug ? `/venue/${slug}` : null,
				label: item.name || "Unnamed venue",
				byline: item.byline || item.description || "",
				canLink: Boolean(slug),
			}
		}

		return {
			key: `result-${index}`,
			href: null,
			label: "Unknown result",
			canLink: false,
		}
	})
}

function normalizeResultsByType(rawByType) {
	const normalized = buildEmptyResultsByType()
	ENTITY_TYPES.forEach((type) => {
		normalized[type] = normalizeResults(rawByType?.[type] || [], type)
	})
	return normalized
}

function hasAnyResults(resultsByType, selectedTypes) {
	return selectedTypes.some((type) => (resultsByType[type] || []).length > 0)
}

function SearchResultSmallCard({ title, subtitle, href }) {
	return (
		<div className="card bg-base-100 border border-base-300 shadow-sm">
			<div className="card-body p-4">
				{href ? (
					<Link href={href} className="card-title text-primary hover:underline text-base leading-tight">
						{title}
					</Link>
				) : (
					<p className="card-title text-base leading-tight">{title}</p>
				)}
				{subtitle ? <p className="text-sm text-base-content/70 line-clamp-2">{subtitle}</p> : null}
			</div>
		</div>
	)
}

const SearchPage = ({ initialSearchTerm, searchType: initialSearchType = "all", resultsByType: initialResultsByType }) => {
	const pageMetaData = {
		title: "Search",
		description: "Search artists, listings, and related content across Platform.",
		keywords: "search artists, search listings, discover creators, TAG search",
		robots: "noindex, follow",
		og: {
			title: "Search Platform",
			description: "Find artists, listings, and content across the platform.",
		},
	}

	const [searchTerm, setSearchTerm] = useState(initialSearchTerm || "")
	const [searchType, setSearchType] = useState(initialSearchType)
	const [orderBy, setOrderBy] = useState("relevance")
	const [resultsByType, setResultsByType] = useState(normalizeResultsByType(initialResultsByType || buildEmptyResultsByType()))
	const [isLoading, setIsLoading] = useState(false)
	const [searchError, setSearchError] = useState("")

	const handleSearch = async () => {
		const trimmedSearchTerm = searchTerm.trim()
		if (!trimmedSearchTerm) {
			setResultsByType(buildEmptyResultsByType())
			setSearchError("")
			return
		}

		const typesToSearch = getSearchTypes(searchType)
		const nextResults = buildEmptyResultsByType()
		const nextRawResults = buildEmptyResultsByType()
		setSearchError("")
		setIsLoading(true)

		try {
			const settled = await Promise.allSettled(
typesToSearch.map((type) => fetchSearchResults(type, trimmedSearchTerm, 30))
		)

		settled.forEach((result, idx) => {
			const type = typesToSearch[idx]
			if (result.status === "fulfilled") {
				nextRawResults[type] = result.value
			}
		})

		if (typesToSearch.includes("listing")) {
			nextRawResults.listing = await attachArtistPathsToListings(nextRawResults.listing, nextRawResults.artist)
			}

			typesToSearch.forEach((type) => {
				nextResults[type] = normalizeResults(nextRawResults[type], type)
			})

			if (settled.some((entry) => entry.status === "rejected")) {
				setSearchError("Some results could not be loaded. Try narrowing by type.")
			}

			setResultsByType(nextResults)
		} catch (error) {
			console.error("An error has occurred with your search request: ", error)
			setResultsByType(buildEmptyResultsByType())
			setSearchError("Search request failed. Please try again.")
		} finally {
			setIsLoading(false)
		}
	}

	const visibleTypes = getSearchTypes(searchType)
	const hasResults = hasAnyResults(resultsByType, visibleTypes)

	return (
		<div className="p-4">
			<TagSEO metadataProp={pageMetaData} canonicalSlug="search" />
			<h1 className="text-2xl font-bold mb-4">Search</h1>
			<div className="flex flex-col gap-4 mb-6">
				<input
					type="text"
					value={searchTerm}
					onChange={(e) => setSearchTerm(e.target.value)}
					placeholder="Search..."
					className="input input-bordered w-full max-w-md"
				/>
				<select
					value={searchType}
					onChange={(e) => setSearchType(e.target.value)}
					className="select select-bordered w-full max-w-md"
				>
					{SEARCH_TYPE_OPTIONS.map((type) => (
						<option key={type} value={type}>
							{SEARCH_TYPE_LABELS[type]}
						</option>
					))}
				</select>
				<select
					value={orderBy}
					onChange={(e) => setOrderBy(e.target.value)}
					className="select select-bordered w-full max-w-md"
				>
					<option value="relevance">Relevance</option>
					<option value="date">Date</option>
					<option value="popularity">Popularity</option>
				</select>
				<button onClick={handleSearch} className="btn btn-primary w-full max-w-md" disabled={isLoading}>
					{isLoading ? "Searching..." : "Search"}
				</button>
			</div>
			{searchError ? (
				<div className="alert alert-warning mb-4">
					<span>{searchError}</span>
				</div>
			) : null}
			<div>
				<h2 className="text-xl font-semibold mb-4">Results</h2>
				{!hasResults ? (
					<p className="text-base-content/60">No results found</p>
				) : (
					<div className="space-y-8">
						{visibleTypes.map((type) => {
							const items = resultsByType[type] || []
							if (items.length === 0) return null

							return (
								<section key={type} className="space-y-4">
									<div className="flex items-center justify-between border-b border-base-300 pb-2">
										<h3 className="text-lg font-semibold">{SEARCH_TYPE_LABELS[type]}</h3>
										<span className="badge badge-ghost">{items.length}</span>
									</div>

									{type === "artist" ? (
										<div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
											{items.map((item) => (
												item?.cardData?.path ? (
													<ArtistCardSmall key={item.key} artist={item.cardData} />
												) : (
													<SearchResultSmallCard
														key={item.key}
														title={item.label}
														subtitle={item?.cardData?.title || "Artist"}
														href={item.href}
													/>
												)
											))}
										</div>
									) : null}

									{type === "listing" ? (
										<div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
											{items.map((item) => (
												item.canLink ? (
													<ListingCardSmall key={item.key} listing={item.cardData} textRenderMode="html" />
												) : (
													<SearchResultSmallCard
														key={item.key}
														title={item.label}
														subtitle={`Artist: ${item.artistLabel}`}
														href={item.href || (item?.cardData?.artist?.path ? `/artists/${item.cardData.artist.path}` : null)}
													/>
												)
											))}
										</div>
									) : null}

									{type !== "artist" && type !== "listing" ? (
										<div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
											{items.map((item) => (
												<SearchResultSmallCard key={item.key} title={item.label} subtitle={item.byline} href={item.href} />
											))}
										</div>
									) : null}
								</section>
							)
						})}
					</div>
				)}
			</div>
		</div>
	)
}

SearchPage.getInitialProps = async function ({ query, req }) {
	const initialResultsByType = buildEmptyResultsByType()
	let status = 200
	const searchTerm = query.term || ""
	const searchType = query.type || "all"
	const trimmedSearchTerm = String(searchTerm).trim()
	const typesToSearch = getSearchTypes(searchType)
	
	// Build base URL for server-side fetches
	const baseUrl = req 
		? `http://${req.headers.host}`
		: (process.env.NEXT_PUBLIC_API_URL || `http://localhost:3000`)

	if (process.env.DEBUG === "true") {
		console.log("Search fetch starting via API for types: ", typesToSearch.join(", "))
	}

	try {
		if (trimmedSearchTerm) {
			const settled = await Promise.allSettled(
				typesToSearch.map((type) => fetchSearchResults(type, trimmedSearchTerm, 30, baseUrl))
			)

			settled.forEach((result, idx) => {
				const type = typesToSearch[idx]
				if (result.status === "fulfilled") {
					initialResultsByType[type] = result.value
				} else {
					status = 206
				}
			})

			if (typesToSearch.includes("listing")) {
				initialResultsByType.listing = await attachArtistPathsToListings(initialResultsByType.listing, initialResultsByType.artist, baseUrl)
			}
		}
	} catch (error) {
		console.error("An error has occurred with your search fetch request: ", error)
		status = 500
	}

	if (process.env.DEBUG === "true") {
		console.log("Search counts by type:", ENTITY_TYPES.reduce((acc, type) => {
			acc[type] = initialResultsByType[type].length
			return acc
		}, {}))
	}

	return {
		initialSearchTerm: searchTerm,
		resultsByType: initialResultsByType,
		searchType,
		status: status,
	}
}

export default SearchPage

