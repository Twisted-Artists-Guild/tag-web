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
import UnifiedCard from "@/components/cards/UnifiedCard"
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
		return [firstImage.original || firstImage.thumbnail || firstImage.sourceURL || "/blank_image.png"]
	}

	const images = getArtistGalleryImages(artist)
	return images.length > 0 ? [
		typeof images[0] === "string"
			? images[0]
			: (images[0]?.original || images[0]?.url || images[0]?.src || images[0]?.thumbnail || images[0]?.thumbnailURL || "/blank_image.png")
	] : ["/blank_image.png"]
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
			return item?.contentUrl || item?.contentURL || item?.url || item?.src || item?.original || item?.thumbnail || item?.thumbnailURL || ""
		})
		.map((url) => String(url || "").trim())
		.filter(Boolean)

	if (metadataUrls.length > 0) {
		return metadataUrls
	}

	return getArtistGalleryImages(artist).map((item) =>
		typeof item === "string"
			? item
			: (item?.original || item?.url || item?.src || item?.thumbnail || item?.thumbnailURL || "/blank_image.png")
	)
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
	const galleryImages = useMemo(() => getArtistGalleryImages(artist), [artist])
	const primaryImage = useMemo(() => {
		if (!galleryImages.length) return "/blank_image.png"
		const firstItem = galleryImages[0]
		if (typeof firstItem === "string") return firstItem
		return firstItem?.original || firstItem?.thumbnail || firstItem?.url || firstItem?.src || "/blank_image.png"
	}, [galleryImages])
	
	const artistId = artist?.artistid || artist?.artistID || artist?.id || artist?.path || artist?.title || "artist"
	const artistHref = artist?.path ? `/artists/${artist.path}` : "#"
	const authorRoles = [artist?.type, artist?.entityType, artist?.role, "Artist"].filter(Boolean)
	const authorRole = authorRoles[0] || "Artist"
	const galleryCount = galleryImages.length
	const hasGallery = galleryCount > 0
	
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
	const enhancedSummary = renderHtml ? artistDescriptionHtml : artistDescriptionText

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

	const metadataTags = [
		`Since: ${metadataSummary.since}`,
		...metadataSummary.categories,
		...metadataSummary.seoTags,
		...(Array.isArray(artist?.artForms) ? artist.artForms : []),
	]

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

	const unifiedCardMediaContent = hasGallery && showHeaderGallery ? (
		<PhotoGallery
			images={galleryImages}
			mode="standalone"
			navigationMode={galleryImages.length > 1 ? "hover" : "manual"}
			imageEffect="landscape"
			showThumbnails={galleryImages.length > 1}
			contentWarnings={contentWarnings}
			contentWarningSize="sm"
		/>
	) : (
		undefined
	)

	const unifiedImage = hasGallery ? primaryImage : ""

	return (
		<UnifiedCard
			title={artistTitleText}
			summary={enhancedSummary}
			image={unifiedImage}
			galleryImages={galleryImages}
			mediaContent={showHeaderGallery ? unifiedCardMediaContent : undefined}
			contentWarnings={contentWarnings}
			imageAlt={artist?.title || "Artist media"}
			href={artistHref}
			badge="Artist"
			date={artist?.since || artist?.updated || ""}
			authorName={artist?.title || "Unknown artist"}
			authorImage={getArtistLogoSrc(artist)}
			authorRole={authorRole}
			showAuthor={false}
			tags={metadataTags}
			maxTags={isLargePanel ? 10 : 3}
			size={compact ? "sm" : isLargePanel ? "lg" : "md"}
			orientation="vertical"
			compact={compact}
			showIdentityGlow={showIdentityGlow}
			showImpressions={showReactions}
			showComments={false}
			showReport={true}
			impressionTargetId={artistId}
			impressionTargetType={ImpressionTargetType.ARTIST}
			commentTargetId={artistId}
			commentTargetType={ImpressionTargetType.ARTIST}
			reportTargetId={artistId}
			reportTargetType="Artist"
			reportTargetURL={artistHref}
			interactionVisibility={{
				impressions: showReactions,
				comments: false,
				report: true,
			}}
			className="h-full"
			mediaClassName={compact ? "h-36" : "h-auto"}
		/>
	)
}


export default ArtistCard
