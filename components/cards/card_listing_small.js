/* This file is part of the Twisted Artists Guild project.

 Copyright (C) 2025 Twisted Artists Guild

 Licensed under the GNU General Public License v3.0
 (https://www.gnu.org/licenses/gpl-3.0.en.html).

 This software comes with NO WARRANTY; see the license for details.

 Open source · low-profit · human-first*/
"use client"

import UnifiedCard from "@/components/cards/UnifiedCard"
import { useCart } from "@/components/cart/CartContext"
import { useLayout } from "@/components/LayoutProvider"
import { hasExplicitWarning, extractContentWarnings } from "@/components/social/ContentTags"
import { IoCartOutline } from "react-icons/io5"

const getListingIdentity = (listing) => {
  const entity = listing?.vendor || listing?.artist || {}
  const isVendor = Boolean(listing?.vendor)
  const entityPath = entity?.path || entity?.slug || ""
  const entityName = entity?.title || entity?.name || (isVendor ? "Unknown vendor" : "Unknown artist")
  const image =
    entity?.profilePic?.url ||
    entity?.profilePic?.URL ||
    entity?.profilePicUrl ||
    entity?.logoUrl ||
    entity?.image ||
    listing?.profilePic?.url ||
    "/blank_image.png"

  return {
    name: entityName,
    image,
    role: isVendor ? "Vendor" : "Artist",
    href: entityPath ? `/${isVendor ? "vendors" : "artists"}/${entityPath}` : "",
  }
}

const ListingCardSmall = ({ listing, artist, textRenderMode = "strip" }) => {
  if (!listing) return null

  if (!listing.artist && artist) {
    listing.artist = artist
  }

  const contentWarnings = extractContentWarnings(listing)
  const hideImage = hasExplicitWarning(contentWarnings)
  const listingPath = listing?.artist && listing?.path
    ? `/artists/${listing.artist.path}/listings/${listing.path}`
    : "#"

  const identity = getListingIdentity(listing)
  const image = listing?.profilePic?.url || listing?.defaultImageURL || listing?.image || "/blank_image.png"
  const summary = listing?.description || listing?.byline || "No description available"
  const tags = [listing?.artCategory?.category, listing?.medium].filter(Boolean).slice(0, 2)

  const mediaContent = hideImage ? (
    <div className="flex h-full w-full items-center justify-center bg-base-200 text-center">
      <div className="space-y-1 px-3">
        <p className="text-[10px] font-semibold uppercase tracking-wide text-error">18+ Explicit</p>
        <p className="text-[10px] text-base-content/70">Preview hidden</p>
      </div>
    </div>
  ) : null

  return (
    <UnifiedCard
      title={listing?.title || "Untitled listing"}
      summary={summary}
      image={image}
      mediaContent={mediaContent}
      imageAlt={listing?.profilePic?.alttext || `${listing?.title || "Unknown"}'s listing`}
      href={listingPath}
      badge="Listing"
      date={listing?.created}
      price={listing?.price}
      authorName={identity.name}
      authorImage={identity.image}
      authorRole={identity.role}
      authorHref={identity.href}
      enableAuthorLink
      tags={tags}
      size="xs"
      orientation="vertical"
      compact
      mediaClassName="w-full h-32"
      className="mb-3"
      showImpressions={false}
      showComments={false}
      showReport={false}
      showIdentityGlow={false}
      footer={
        listing?.price !== undefined && listing?.price !== null && Number(listing.price) > 0 ? (
          <div className="card-actions justify-end mt-1">
            <AddToCartButtonSmall listing={listing} />
          </div>
        ) : null
      }
    />
  )
}

const AddToCartButtonSmall = ({ listing }) => {
  const { addToCart } = useCart()
  const layout = useLayout()
  const toggleRightSidebar = layout?.toggleRightSidebar || (() => {})

  const handleAddToCart = (e) => {
    e.preventDefault()

    const normalizedListing = {
      ...listing,
      id: listing.listingID || listing.id,
      price: Number(listing.price || 0),
    }

    addToCart(normalizedListing, 1)

    if (typeof toggleRightSidebar === "function") {
      setTimeout(() => toggleRightSidebar(true), 100)
    }
  }

  return (
    <button
      onClick={handleAddToCart}
      className="btn btn-secondary btn-sm"
      title="Add to Cart"
      type="button"
    >
      <IoCartOutline size={18} />
      Add to Cart
    </button>
  )
}

export default ListingCardSmall
