/* This file is part of the Twisted Artists Guild project.

 Copyright (C) 2025 Twisted Artists Guild

 Licensed under the GNU General Public License v3.0
 (https://www.gnu.org/licenses/gpl-3.0.en.html).

 This software comes with NO WARRANTY; see the license for details.

 Open source · low-profit · human-first*/
"use client"

import { useMemo } from "react"
import { useSession } from "next-auth/react"
import PhotoGallery from "@/components/cards/card_photoGallery"
import UnifiedCard from "@/components/cards/UnifiedCard"
import useEntityLogo from "@/components/cards/useEntityLogo"
import ImpressionReactions from "@/components/social/ImpressionReactions"
import { extractContentWarnings } from "@/components/social/ContentTags"
import { CARD_SHELL_CLASS } from "@/components/cards/sizes/panel-layout"
import { useImpressions, ImpressionTargetType } from "@/hooks/useImpressions"
import { useEntityImage } from "@/hooks/useEntityProfileImage"
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
      const pictureThumb = picture?.thumbnailURL || picture?.thumbnailUrl || picture?.ThumbnailURL || pictureUrl
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
        originalAlt: picture?.altText || picture?.alttext || item?.captionOverride || picture?.title || video?.title || "Listing gallery media",
        thumbnailAlt: picture?.altText || picture?.alttext || item?.captionOverride || picture?.title || video?.title || "Listing gallery media",
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

  return []
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
    entity?.image ||
    "/blank_image.png"

  return {
    title: entity?.title || entity?.name || (isVendor ? "Unknown vendor" : "Unknown artist"),
    summary: entity?.byline || entity?.description || (isVendor ? "Vendor" : "Artist"),
    image: entityImage,
    href: entityPath ? `/${isVendor ? "vendors" : "artists"}/${entityPath}` : "",
    badge: isVendor ? "Vendor" : "Artist",
    logoEntityType: isVendor ? "vendor" : "artist",
    logoEntityId: entity?.vendorID || entity?.VendorID || entity?.artistID || entity?.artistid || "",
    logoImage: entity?.logoPic?.url || entity?.logoPic?.URL || entity?.logoPic?.normalizedURL || entity?.logoPic?.NormalizedURL || entity?.logo?.url || entity?.logo?.URL || entity?.logoUrl || entity?.logoURL || "",
  }
}

export const ListingCardContent = ({
  listing, 
  coverImage = "",
  panelSize = "third", 
  showGalleryThumbnails = true,
  hideGallery = false,
  currentUser: propCurrentUser = null,
  enableDynamicImpressions = true,
  textRenderMode = "strip",
  showArtistIdentityGlow = true,
}) => {
  const { data: session } = useSession()
  const currentUser = propCurrentUser || session?.user || null
  
  const listingId = listing?.listingID || listing?.listingid
  const listingSeed = listingId || listing?.path || listing?.title
  const profileImage = useEntityImage("listing", listingId, "profile")

  const { 
    impressions, 
    loading: impressionsLoading,
    toggleReaction
  } = useImpressions(listingId, ImpressionTargetType.LISTING, enableDynamicImpressions)

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
  const artistLogo = useEntityLogo({
    logoImage: listingIdentity.logoImage,
    entityType: listingIdentity.logoEntityType,
    entityId: listingIdentity.logoEntityId,
  })

  const totalReactionCount = impressions?.reduce((sum, imp) => sum + (imp.count || 0), 0) || 0
  const listingTags = [
    ...(Array.isArray(listing?.artForms) ? listing.artForms : []),
    ...(Array.isArray(listing?.seoTags) ? listing.seoTags : []),
  ].filter(Boolean).slice(0, 3)

  return (
    <UnifiedCard
      title={listing?.title || "Untitled listing"}
      summary={renderHtml ? listingDescriptionHtml : listingDescriptionText}
      imageAlt={listing?.title || "Listing media"}
      profileImage={profileImage}
      profileImageAlt={listing?.profilePic?.altText || listing?.profilePic?.alttext || `${listingTitleText} profile picture`}
      profileImageClassName="rounded-none"
      backgroundImage={coverImage}
      galleryImages={!hideGallery ? galleryImages : []}
      mediaPosition="bottom"
      mediaClassName="w-full h-auto! shrink-0"
      contentWarnings={contentWarnings}
      href={listingPath}
      badge="Listing"
      date={listing?.created}
      headerActions={<ReportButton targetType="Listing" targetId={listingId} targetURL={listingPath} />}
      price={listing?.price}
      priceActions={<AddToCartButton listing={listing} />}
      authorName={listingIdentity.title}
      authorImage={listingIdentity.image}
      authorImageClassName="h-27 w-21"
      authorImageSizes="84px"
      authorLogoImage={artistLogo}
      authorClassName="flex min-w-0 max-w-full flex-row-reverse items-center gap-3 justify-self-end text-right @min-[34rem]:col-start-2 @min-[34rem]:row-start-1 @min-[34rem]:row-span-2"
      authorRole={listingIdentity.badge}
      authorHref={listingIdentity.href}
      enableAuthorLink
      tags={[...listingTags, listing?.artCategory?.category].filter(Boolean).slice(0, 3)}
      className="@container"
      detailsClassName="grid grid-cols-1 items-center gap-4 @min-[34rem]:grid-cols-2 @min-[34rem]:gap-x-6"
      size={isLargePanel ? "lg" : "md"}
      showIdentityGlow={showArtistIdentityGlow}
      showImpressions={false}
      showComments={false}
      showReport={false}
      mediaContent={!hideGallery && galleryImages.length > 0 ? (
        <PhotoGallery
          images={galleryImages}
          mode="standalone"
          navigationMode="manual"
          imageEffect="landscape"
          showThumbnails={showGalleryThumbnails && galleryImages.length > 1}
          contentWarnings={contentWarnings}
          hasViewerConsent={Boolean(listing?.viewerHasContentConsent)}
        />
      ) : null}
      footer={(
        <>
          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-base-300 pt-3">
            {!impressionsLoading && impressions && impressions.length > 0 ? (
              <ImpressionReactions
                impressions={impressions}
                currentUser={currentUser}
                onToggle={toggleReaction}
                readOnly={false}
                size="sm"
                showDetails
                targetId={`listing-${listingId}`}
                targetType="listing"
              />
            ) : impressionsLoading ? (
              <div className="text-sm text-base-content/50">Loading reactions...</div>
            ) : (
              <div className="text-sm text-base-content/50">No reactions data</div>
            )}
            <p className="ml-auto text-right text-xs text-base-content/65">
              {totalReactionCount} reactions • {listing.commentCount ?? getSeededCount(listingSeed, 15, 1, "comments")} comments
            </p>
          </div>
        </>
      )}
    />
  )
}

const ListingCard = ({ listing, ...cardProps }) => {
  const listingId = listing?.listingID || listing?.listingid
  const coverImage = useEntityImage("listing", listingId, "cover")

  return <ListingCardContent {...cardProps} listing={listing} coverImage={coverImage} />
}

// Child component to safely hook into CartContext without breaking SSR
import { useCart } from "@/components/cart/CartContext";
import { IoCartOutline } from 'react-icons/io5';

const AddToCartButton = ({ listing }) => {
  const { addToCart } = useCart();
  const { toggleRightSidebar } = useLayout();

  const handleAddToCart = () => {
      const normalizedListing = {
          ...listing,
          id: listing.listingID || listing.listingid || listing.id,
          price: Number(listing.price || 0)
      };

      addToCart(normalizedListing, 1);
      toggleRightSidebar(true);
  };

  return (
    <button 
      type="button"
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
