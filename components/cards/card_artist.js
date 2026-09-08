/* This file is part of the Twisted Artists Guild project.

 Copyright (C) 2025 Twisted Artists Guild

 Licensed under the GNU General Public License v3.0
 (https://www.gnu.org/licenses/gpl-3.0.en.html).

 This software comes with NO WARRANTY; see the license for details.

 Open source · low-profit · human-first*/
"use client"

import Link from "next/link"
import Image from "next/image"
import { useMemo, useState } from "react"
import { useSession } from "next-auth/react"
import PhotoGallery from "@/components/cards/card_photoGallery"
import ImpressionReactions from "@/components/social/ImpressionReactions"
import { extractContentWarnings } from "@/components/social/ContentTags"
import { CARD_SHELL_CLASS } from "@/components/cards/sizes/panel-layout"
import { useImpressions, ImpressionTargetType } from "@/hooks/useImpressions"
import { sanitizeCardHtml } from "@/components/security/sanitize"
import ReportButton from "@/components/moderation/ReportButton"
import { getIdentityGlowStyle } from "@/utils/identityGlow"

const stripHtmlTags = (value) =>
	String(value || "")
		.replace(/<[^>]*>/g, " ")
		.replace(/&nbsp;/gi, " ")
		.replace(/\s+/g, " ")
		.trim()

const getArtistLogoSrc = (artist) => artist?.profilePic?.url || "/blank_image.png"

const getArtistDescription = (artist) =>
	artist?.description ||
	artist?.roleSummary ||
	artist?.byline ||
	artist?.biography ||
	"Creative portfolio and artist highlights."

const mapGalleryItemsToMedia = (entity) => {
	const items = Array.isArray(entity?.gallery?.galleryItems) ? entity.gallery.galleryItems : []
	if (items.length === 0) return []

	return items
		.slice()
		.sort((a, b) => (Number(a?.sortOrder) || 0) - (Number(b?.sortOrder) || 0))
		.map((item) => {
			const picture = item?.picture
			const video = item?.video
			const pictureUrl = picture?.url || picture?.URL || ""
			const pictureThumb = picture?.thumbnailURL || picture?.ThumbnailURL || pictureUrl
			const videoThumb = video?.thumbnailURL || video?.ThumbnailURL || video?.url || video?.URL || ""
			const url = picture ? pictureThumb : videoThumb

			if (!url) return null

			return {
				original: url,
				thumbnail: url,
				mediaType: picture ? "picture" : "video",
				sourceURL: picture ? pictureUrl : (video?.url || video?.URL || ""),
				embedURL: picture ? (picture?.embedURL || picture?.EmbedURL || "") : (video?.embedURL || video?.EmbedURL || ""),
				description:
					item?.captionOverride ||
					picture?.description ||
					video?.description ||
					picture?.title ||
					video?.title ||
					"",
				byline: picture?.byline || video?.byline || "",
				altText: picture?.altText || picture?.alttext || "",
			}
		})
		.filter(Boolean)
}

const getArtistGalleryImages = (artist) => {
	const galleryMedia = mapGalleryItemsToMedia(artist)
	if (galleryMedia.length > 0) {
		return galleryMedia
	}

	if (Array.isArray(artist?.images) && artist.images.length > 0) {
		return artist.images
	}

	const fallback = artist?.profilePic?.url || "/blank_image.png"
	return [fallback]
}

const getArtistHeaderGalleryImages = (artist) => {
	const headerUrl = artist?.coverPic?.url || artist?.headerImage?.url || artist?.bannerImage?.url
	if (headerUrl) {
		return [headerUrl]
	}

	const galleryMedia = mapGalleryItemsToMedia(artist)
	const firstImage = galleryMedia.find((item) => item?.mediaType !== "video") || galleryMedia[0]
	if (firstImage) {
		return [firstImage]
	}

	const images = getArtistGalleryImages(artist)
	return images.length > 0 ? [images[0]] : ["/blank_image.png"]
}

const getArtistContentGalleryImages = (artist) => {
	const metadataCollections = [
		artist?.pictureMetadata,
		artist?.imageMetadata,
		artist?.imagesMetadata,
		artist?.contentImages,
		artist?.content,
	]

	const metadataUrls = metadataCollections
		.flatMap((collection) => (Array.isArray(collection) ? collection : []))
		.map((item) => {
			if (typeof item === "string") return item
			return item?.contentUrl || item?.contentURL || item?.url || item?.src || ""
		})
		.map((url) => String(url || "").trim())
		.filter(Boolean)

	if (metadataUrls.length > 0) {
		return metadataUrls
	}

	return getArtistGalleryImages(artist)
}

const formatSinceMonthYear = (value) => {
	if (!value) {
		return "n/a"
	}

	if (typeof value === "number" || /^\d{4}$/.test(String(value).trim())) {
		const year = String(value).trim()
		const parsed = new Date(`${year}-01-01T00:00:00Z`)
		if (!Number.isNaN(parsed.getTime())) {
			return new Intl.DateTimeFormat("en-US", { month: "long", year: "numeric" }).format(parsed)
		}
	}

	const parsed = new Date(value)
	if (!Number.isNaN(parsed.getTime())) {
		return new Intl.DateTimeFormat("en-US", { month: "long", year: "numeric" }).format(parsed)
	}

	return String(value)
}

const ArtistCard = ({
	artist,
	compact = false,
	showHeaderGallery = true,
	showContentGallery = true,
	currentUser: propCurrentUser = null,
	enableDynamicImpressions = false,
	showReactions = false,
	textRenderMode = "strip",
	showIdentityGlow = true,
}) => {
	const { data: session } = useSession()
	const currentUser = propCurrentUser || session?.user || null

	const [logoSrc, setLogoSrc] = useState(getArtistLogoSrc(artist))
	const artistDescription = getArtistDescription(artist)
	const headerGalleryImages = useMemo(() => getArtistHeaderGalleryImages(artist), [artist])
	const contentGalleryImages = useMemo(() => getArtistContentGalleryImages(artist), [artist])
	const contentWarnings = useMemo(() => extractContentWarnings(artist), [artist])
	
	const artistId = artist?.artistid || artist?.artistID || artist?.id || artist?.path || artist?.title || "artist"
	
	const panelSize = artist?.panelSize || "third"
	const isLargePanel = ["twoThirds", "threeQuarters", "full"].includes(panelSize)
	const isMediumPanel = panelSize === "half"

	const { 
		impressions, 
		loading: impressionsLoading,
		toggleReaction,
		error: impressionError
	} = useImpressions(artistId, ImpressionTargetType.ARTIST, enableDynamicImpressions && showReactions)

	const totalReactionCount = impressions?.reduce((sum, imp) => sum + (imp.count || 0), 0) || 0
	const renderHtml = textRenderMode === "html"
	const artistTitleText = stripHtmlTags(artist?.title) || "Untitled Artist"
	const artistDescriptionText = stripHtmlTags(artistDescription) || "Creative portfolio and artist highlights."
	const artistTitleHtml = sanitizeCardHtml(artist?.title || "Untitled Artist")
	const artistDescriptionHtml = sanitizeCardHtml(artistDescription || "Creative portfolio and artist highlights.")

	const metadataSummary = useMemo(() => {
		const categories = Array.isArray(artist?.artistCategoryLinks)
			? artist.artistCategoryLinks
					.map((link) => {
						if (typeof link === "string") return link.trim()
						if (link && typeof link === "object") {
							return (
								String(link.category?.name || link.categoryName || link.name || link.label || link.title || "").trim() ||
								String(link.categoryName || link.name || "").trim()
							)
						}
						return ""
					})
					.filter(Boolean)
			: []

		const seoTags = Array.isArray(artist?.seoTags)
			? artist.seoTags.map((tag) => String(tag).trim()).filter(Boolean)
			: typeof artist?.seoTags === "string" && artist.seoTags.trim().length > 0
				? artist.seoTags.split(",").map((tag) => tag.trim()).filter(Boolean)
				: []

		return {
			since: formatSinceMonthYear(artist?.since),
			categories,
			categoryCount: categories.length,
			seoTags,
		}
	}, [artist])

	const detailRows = useMemo(() => {
		const rows = []

		if (artist?.roleSummary) {
			rows.push({ label: "Role", value: artist.roleSummary })
		}

		if (Array.isArray(artist?.artForms) && artist.artForms.length > 0) {
			rows.push({ label: "Art Forms", value: artist.artForms.join(", ") })
		}

		return rows
	}, [artist])

	return (
		<article className={`${CARD_SHELL_CLASS} h-auto self-start w-full overflow-hidden`}>
			<div className={`card-body ${compact ? "gap-2 p-3" : "gap-4 p-4"}`}>
				{!compact && showHeaderGallery && (
					<PhotoGallery
						images={headerGalleryImages}
						mode="standalone"
						navigationMode={headerGalleryImages.length > 1 ? "hover" : "manual"}
						imageEffect="landscape"
						showThumbnails={false}
						contentWarnings={contentWarnings}
						contentWarningSize="sm"
					/>
				)}

				{!compact && showContentGallery && contentGalleryImages.length > 0 && (
					<PhotoGallery
						images={contentGalleryImages}
						mode="standalone"
						navigationMode={contentGalleryImages.length > 1 ? "hover" : "manual"}
						imageEffect="landscape"
						showThumbnails={contentGalleryImages.length > 1}
						contentWarnings={contentWarnings}
						contentWarningSize="sm"
					/>
				)}

				<div className={`flex items-start ${compact ? "gap-2" : "gap-3"}`}>
					<div className="avatar mt-0.5">
						<div
							className={`${compact ? "w-9" : "w-11"} rounded-full border-2 bg-base-200 overflow-hidden ${showIdentityGlow ? "" : "border-base-300"}`}
							style={showIdentityGlow ? getIdentityGlowStyle(artist, { type: "artist" }) : undefined}
						>
							<Image
								src={logoSrc}
								alt={artist?.profilePic?.alttext || `${artist?.title || "Artist"} logo`}
								width={compact ? 36 : 44}
								height={compact ? 36 : 44}
								onError={() => setLogoSrc("/blank_image.png")}
								style={{ objectFit: "cover" }}
							/>
						</div>
					</div>
					<div className="min-w-0 flex-1">
						{renderHtml ? (
							<Link
								href={`/artists/${artist?.path || ""}`}
								className={`hover:underline block text-primary leading-tight ${compact ? "[&_h1]:text-base [&_h2]:text-base [&_h3]:text-base" : "[&_h1]:text-lg [&_h2]:text-lg [&_h3]:text-lg"} [&_h1]:font-semibold [&_h2]:font-semibold [&_h3]:font-semibold`}
								dangerouslySetInnerHTML={{ __html: artistTitleHtml }}
							/>
						) : (
							<h3 className={`${compact ? "text-base" : "text-lg"} font-semibold text-primary leading-tight`}>
								<Link href={`/artists/${artist?.path || ""}`} className="hover:underline">
									{artistTitleText}
								</Link>
							</h3>
						)}
						{renderHtml ? (
							<div
								className={`${compact ? "mt-0.5 text-xs line-clamp-2" : "mt-1 text-sm leading-relaxed"} text-base-content/70`}
								dangerouslySetInnerHTML={{ __html: artistDescriptionHtml }}
							/>
						) : (
							<p className={`${compact ? "mt-0.5 text-xs line-clamp-2" : "mt-1 text-sm leading-relaxed"} text-base-content/70`}>
								{artistDescriptionText}
							</p>
						)}
					</div>
				</div>

				{showReactions && (
					<div className={compact ? "mt-1" : "mt-2"}>
						{!impressionsLoading && impressions && impressions.length > 0 ? (
							<div className="space-y-1">
								<ImpressionReactions
									impressions={impressions}
									currentUser={currentUser}
									onToggle={toggleReaction}
									readOnly={false}
									size="sm"
									showDetails={!compact}
									targetId={artistId}
									targetType="artist"
								/>
								{totalReactionCount > 0 && !compact && (
									<p className="text-xs text-base-content/65">
										{totalReactionCount} reactions
									</p>
								)}
							</div>
						) : impressionsLoading ? (
							<div className="text-xs text-base-content/50">Loading reactions...</div>
						) : impressionError ? (
							<div className="text-xs text-error">Error loading reactions</div>
						) : (
							<div className="text-xs text-base-content/50">No reactions available</div>
						)}
					</div>
				)}

				<div className={`flex flex-wrap ${compact ? "gap-1.5" : "gap-2"}`}>
					<span className="badge badge-outline badge-sm">Since: {metadataSummary.since}</span>
					{(isMediumPanel || isLargePanel) && metadataSummary.categories.length > 0 && (
						<>
							<span className="badge badge-info badge-sm">(Categories)</span>
							{metadataSummary.categories.slice(0, isLargePanel ? metadataSummary.categories.length : 3).map((cat) => (
								<span key={cat} className="badge badge-primary badge-sm badge-outline">{cat}</span>
							))}
						</>
					)}
					{(isMediumPanel || isLargePanel) && metadataSummary.seoTags.length > 0 && (
						<>
							<span className="badge badge-warning badge-sm">(SEO)</span>
							{metadataSummary.seoTags.slice(0, isLargePanel ? metadataSummary.seoTags.length : 3).map((tag) => (
								<span key={tag} className="badge badge-warning badge-sm badge-outline">{tag}</span>
							))}
						</>
					)}
				</div>

				{!compact && (isMediumPanel || isLargePanel) && detailRows.length > 0 && (
					<div className="rounded-box border border-base-300 bg-base-100/70 p-3">
						<div className="space-y-2">
							{detailRows.slice(0, isLargePanel ? detailRows.length : 2).map((row) => (
								<div key={row.label} className="grid grid-cols-1 gap-1 sm:grid-cols-[7rem_1fr]">
									<span className="text-xs font-semibold uppercase tracking-wide text-primary/90">{row.label}</span>
									<p className="text-sm text-base-content/75 line-clamp-3">{row.value}</p>
								</div>
							))}
						</div>
					</div>
				)}

				{!compact && (
					<div className="card-actions mt-1 justify-start">
						<ReportButton targetType="Artist" targetId={artist?.artistID || artist?.artistid} />
					</div>
				)}
			</div>
		</article>
	)
}

export default ArtistCard
