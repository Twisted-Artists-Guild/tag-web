/* This file is part of the Twisted Artists Guild project.

 Copyright (C) 2025 Twisted Artists Guild

 Licensed under the GNU General Public License v3.0
 (https://www.gnu.org/licenses/gpl-3.0.en.html).

 This software comes with NO WARRANTY; see the license for details.

 Open source · low-profit · human-first*/
"use client"

import Link from "next/link"
import { useMemo } from "react"
import { useSession } from "next-auth/react"
import PhotoGallery from "@/components/cards/card_photoGallery"
import ArtistCard from "@/components/cards/card_artist"
import ImpressionReactions from "@/components/social/ImpressionReactions"
import { extractContentWarnings } from "@/components/social/ContentTags"
import { CARD_SHELL_CLASS } from "@/components/cards/sizes/panel-layout"
import { useImpressions, ImpressionTargetType } from "@/hooks/useImpressions"
import { sanitizeCardHtml, stripHtmlText } from "@/components/security/sanitize"
import { useLayout } from "@/components/LayoutProvider";
import ReportButton from "@/components/moderation/ReportButton"

const getSeededCount = (seed, max, min = 1, salt = "") => {
  const base = `${seed || "listing"}-${salt}`
  const hash = base.split("").reduce((acc, char) => acc + char.charCodeAt(0), 0)
  return (hash % max) + min
}

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
      const videoThumb = video?.thumbnailURL || video?.thumbnailUrl || video?.ThumbnailURL || "/blank_image.png"
      const url = picture ? pictureThumb : videoThumb

      if (!url) return null

      return {
        original: url,
        thumbnail: url,
        mediaType: picture ? "picture" : "video",
        sourceURL: picture ? pictureUrl : (video?.url || video?.URL || ""),
        embedURL: picture ? (picture?.embedURL || picture?.EmbedURL || "") : (video?.embedURL || video?.embedUrl || video?.EmbedURL || ""),
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

const getListingGalleryImages = (listing) => {
  const galleryMedia = mapGalleryItemsToMedia(listing)
  if (galleryMedia.length > 0) {
    return galleryMedia
  }

  if (Array.isArray(listing?.images) && listing.images.length > 0) {
    return listing.images
  }

  const fallback = listing?.profilePic?.url || "/blank_image.png"
  return [fallback]
}

const formatCreatedDate = (value) => {
  if (!value) return "No date available"

  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) {
    return String(value)
  }

  return parsed.toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  })
}

const getSmallerArtistPanelSize = (listingPanelSize) => {
  switch (listingPanelSize) {
    case "full":
      return "twoThirds"
    case "threeQuarters":
      return "half"
    case "twoThirds":
      return "half"
    case "half":
      return "third"
    case "third":
      return "quarter"
    default:
      return "quarter"
  }
}

const getArtistProfilePic = (listing) => {
  const artist = listing?.artist || {}
  const profilePic = artist?.profilePic || artist?.profilepic || null
  return {
    url:
      profilePic?.url ||
      artist?.profilePicUrl ||
      artist?.profile_image ||
      artist?.image ||
      listing?.profilePic?.url ||
      "/blank_image.png",
    alttext:
      profilePic?.alttext ||
      profilePic?.altText ||
      `${artist?.title || "Artist"} profile picture`,
  }
}

const ListingCard = ({ 
  listing, 
  panelSize = "third", 
  showGalleryThumbnails = false, 
  hideGallery = false,
  currentUser: propCurrentUser = null,
  enableDynamicImpressions = true,
  textRenderMode = "strip",
  showArtistIdentityGlow = true,
}) => {
  const { data: session } = useSession()
  const currentUser = propCurrentUser || session?.user || null
  
  const listingSeed = listing?.listingid || listing?.listingID || listing?.path || listing?.title
  const targetId = listingSeed
  const targetType = ImpressionTargetType.LISTING

  const { 
    impressions, 
    loading: impressionsLoading,
    toggleReaction
  } = useImpressions(targetId, targetType, enableDynamicImpressions)

  const isLargePanel = ["twoThirds", "threeQuarters", "full"].includes(panelSize)
  const galleryImages = useMemo(() => getListingGalleryImages(listing), [listing])
  const contentWarnings = useMemo(() => extractContentWarnings(listing), [listing])
  const listingPath = `/artists/${listing?.artist?.path}/listings/${listing?.path}`
  const artistProfilePic = useMemo(() => getArtistProfilePic(listing), [listing])
  const renderHtml = textRenderMode === "html"
  const listingTitleText = stripHtmlText(listing?.title) || "Untitled"
  const listingDescriptionText = stripHtmlText(listing?.description) || "No description available"
  const listingTitleHtml = sanitizeCardHtml(listing?.title || "Untitled")
  const listingDescriptionHtml = sanitizeCardHtml(listing?.description || "No description available")

  const artistForCard = useMemo(
    () => ({
      path: listing?.artist?.path || "",
      title: listing?.artist?.title || "Unknown artist",
      description: listing?.artist?.description || listing?.artist?.byline || listing?.artist?.title || "Artist",
      byline: listing?.artist?.byline || listing?.artist?.title || "Artist",
      since: listing?.artist?.since,
      roleSummary: listing?.artist?.roleSummary,
      artForms: listing?.artist?.artForms,
      panelSize: getSmallerArtistPanelSize(panelSize),
      images: Array.isArray(listing?.artist?.images) && listing.artist.images.length > 0
        ? listing.artist.images
        : [artistProfilePic.url],
      profilePic: artistProfilePic,
          artistID: listing?.artistID,
    }),
    [artistProfilePic, listing, panelSize],
  )

  const totalReactionCount = impressions?.reduce((sum, imp) => sum + (imp.count || 0), 0) || 0

  return (
    <article className={`${CARD_SHELL_CLASS} h-auto w-full overflow-hidden`}>
      <div className="card-body gap-4 p-4">
        {!hideGallery && (
          <PhotoGallery
            images={galleryImages}
            mode="standalone"
            navigationMode={galleryImages.length > 1 ? "hover" : "manual"}
            imageEffect="landscape"
            showThumbnails={showGalleryThumbnails}
            contentWarnings={contentWarnings}
            hasViewerConsent={Boolean(listing?.viewerHasContentConsent)}
          />
        )}

        <div className="space-y-2">
          <Link href={listingPath} className="block text-xl font-semibold leading-tight text-primary hover:underline">
            {renderHtml ? (
              <span dangerouslySetInnerHTML={{ __html: listingTitleHtml }} />
            ) : (
              listingTitleText
            )}
          </Link>
          {renderHtml ? (
            <p
              className="text-sm text-base-content/80 line-clamp-3"
              dangerouslySetInnerHTML={{ __html: listingDescriptionHtml }}
            />
          ) : (
            <p className="text-sm text-base-content/80 line-clamp-3">
              {listingDescriptionText}
            </p>
          )}
        </div>

        <div className="flex flex-wrap gap-2">
          <span className="badge badge-outline badge-sm">Created: {formatCreatedDate(listing?.created)}</span>
          <span className="badge badge-outline badge-sm">Category: {listing?.artCategory?.category || "No category"}</span>
          {isLargePanel && listing?.price !== undefined && listing?.price !== null && (
            <span className="badge badge-primary badge-outline badge-sm">${Number(listing.price).toFixed(2)}</span>
          )}
        </div>

        <div className="rounded-box border border-base-300 bg-base-100/70 p-1.5 md:max-w-120">
          <ArtistCard
            artist={artistForCard}
            compact
            enableDynamicImpressions={true}
            showReactions={true}
            textRenderMode={textRenderMode}
            showIdentityGlow={showArtistIdentityGlow}
          />
        </div>

        <div className="space-y-2">
          {!impressionsLoading && impressions && impressions.length > 0 ? (
            <ImpressionReactions
              impressions={impressions}
              currentUser={currentUser}
              onToggle={toggleReaction}
              readOnly={false}
              size="sm"
              showDetails
              targetId={`listing-${targetId}`}
              targetType="listing"
            />
          ) : impressionsLoading ? (
            <div className="text-sm text-base-content/50">Loading reactions...</div>
          ) : (
            <div className="text-sm text-base-content/50">No reactions data</div>
          )}
          <p className="text-xs text-base-content/65">
            {totalReactionCount} reactions • {listing.commentCount ?? getSeededCount(listingSeed, 15, 1, "comments")} comments
          </p>
        </div>

        <div className="card-actions mt-1 justify-start gap-2">
          <Link href={listingPath} className="btn btn-primary btn-sm">
            View Listing
          </Link>
          <Link href={`/artists/${listing?.artist?.path || ""}`} className="btn btn-outline btn-sm">
            View Artist
          </Link>
          {/* Add to Cart Button Logic */}
          {listing?.price !== undefined && listing?.price !== null && Number(listing.price) > 0 && (
            <AddToCartButton listing={listing} />
          )}
          <ReportButton targetType="Listing" targetId={listing?.listingID || listing?.listingid} />
        </div>
      </div>
    </article>
  )
}

// Child component to safely hook into CartContext without breaking SSR
import { useCart } from "@/components/cart/CartContext";
import { IoCartOutline } from 'react-icons/io5';

const AddToCartButton = ({ listing }) => {
  const { addToCart } = useCart();
  
  // Try to safely access the toggleRightSidebar - if it's deeply nested, the global CartContext uses setIsCartOpen equivalent
  const { toggleRightSidebar } = useLayout ? useLayout() : { toggleRightSidebar: () => {} };

  const handleAddToCart = () => {
      // Normalize listing ID property safely
      const normalizedListing = {
          ...listing,
          id: listing.listingID || listing.id,
          price: Number(listing.price || 0)
      };

      addToCart(normalizedListing, 1);
      
      // Attempt to force the layout sidebar open if context allows it
      if (typeof toggleRightSidebar === 'function') {
          // If it acts as a toggle, we only fire it if it's closed
          setTimeout(() => toggleRightSidebar(true), 100);
      }
  };

  return (
    <button 
      onClick={handleAddToCart}
      className="btn btn-secondary btn-sm"
      title="Add to Cart"
    >
      <IoCartOutline size={18} />
      Add to Cart
    </button>
  );
};

export default ListingCard
