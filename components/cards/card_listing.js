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
import UnifiedCard from "@/components/cards/UnifiedCard"
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

const getListingIdentity = (listing) => {
  const entity = listing?.vendor || listing?.artist || {}
  const isVendor = Boolean(listing?.vendor)
  const entityPath = entity?.path || entity?.slug || ""
  const entityImage =
    entity?.profilePic?.url ||
    entity?.profilePic?.URL ||
    entity?.profilePicUrl ||
    entity?.logoUrl ||
    entity?.image ||
    listing?.profilePic?.url ||
    "/blank_image.png"

  return {
    title: entity?.title || entity?.name || (isVendor ? "Unknown vendor" : "Unknown artist"),
    summary: entity?.byline || entity?.description || (isVendor ? "Vendor" : "Artist"),
    image: entityImage,
    href: entityPath ? `/${isVendor ? "vendors" : "artists"}/${entityPath}` : "",
    badge: isVendor ? "Vendor" : "Artist",
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
  const renderHtml = textRenderMode === "html"
  const listingTitleText = stripHtmlText(listing?.title) || "Untitled"
  const listingDescriptionText = stripHtmlText(listing?.description) || "No description available"
  const listingTitleHtml = sanitizeCardHtml(listing?.title || "Untitled")
  const listingDescriptionHtml = sanitizeCardHtml(listing?.description || "No description available")

  const listingIdentity = useMemo(() => getListingIdentity(listing), [listing])

  const totalReactionCount = impressions?.reduce((sum, imp) => sum + (imp.count || 0), 0) || 0
  const listingTags = [
    ...(Array.isArray(listing?.artForms) ? listing.artForms : []),
    ...(Array.isArray(listing?.seoTags) ? listing.seoTags : []),
  ].filter(Boolean).slice(0, 3)

  return (
    <UnifiedCard
      title={listing?.title || "Untitled listing"}
      summary={renderHtml ? listingDescriptionHtml : listingDescriptionText}
      image={galleryImages[0]?.original || galleryImages[0]?.thumbnail || galleryImages[0] || ""}
      imageAlt={listing?.title || "Listing media"}
      href={listingPath}
      badge="Listing"
      date={listing?.created}
      price={listing?.price}
      authorName={listingIdentity.title}
      authorImage={listingIdentity.image}
      authorRole={listingIdentity.badge}
      authorHref={listingIdentity.href}
      enableAuthorLink
      tags={[...listingTags, listing?.artCategory?.category].filter(Boolean).slice(0, 3)}
      size={isLargePanel ? "lg" : "md"}
      showIdentityGlow={showArtistIdentityGlow}
      showImpressions={false}
      showComments={false}
      showReport={false}
      mediaContent={!hideGallery ? (
        <PhotoGallery
          images={galleryImages}
          mode="standalone"
          navigationMode={galleryImages.length > 1 ? "hover" : "manual"}
          imageEffect="landscape"
          showThumbnails={showGalleryThumbnails}
          contentWarnings={contentWarnings}
          hasViewerConsent={Boolean(listing?.viewerHasContentConsent)}
        />
      ) : null}
      footer={(
        <>
          <div className="space-y-2 border-t border-base-300 pt-3">
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
            <Link href={listingPath} className="btn btn-primary btn-sm">View Listing</Link>
            <Link href={listingIdentity.href || `/artists/${listing?.artist?.path || ""}`} className="btn btn-outline btn-sm">
              View {listingIdentity.badge}
            </Link>
            {listing?.price !== undefined && listing?.price !== null && Number(listing.price) > 0 && (
              <AddToCartButton listing={listing} />
            )}
            <ReportButton targetType="Listing" targetId={listing?.listingID || listing?.listingid} />
          </div>
        </>
      )}
    />
  )
}

// Child component to safely hook into CartContext without breaking SSR
import { useCart } from "@/components/cart/CartContext";
import { IoCartOutline } from 'react-icons/io5';

const AddToCartButton = ({ listing }) => {
  const { addToCart } = useCart();
  const layout = useLayout();
  const toggleRightSidebar = layout?.toggleRightSidebar || (() => {});

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
