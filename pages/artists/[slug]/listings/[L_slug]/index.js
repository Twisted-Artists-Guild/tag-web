/* This file is part of the Twisted Artists Guild project.

 Copyright (C) 2025 Twisted Artists Guild

 Licensed under the GNU General Public License v3.0
 (https://www.gnu.org/licenses/gpl-3.0.en.html).

 This software comes with NO WARRANTY; see the license for details.

 Open source · low-profit · human-first*/
import TagSEO from "@/components/TagSEO"
import ListingCard from "@/components/cards/card_listing"
import dynamic from "next/dynamic"
import { useSession } from "next-auth/react"
import { useEffect, useMemo, useState } from "react"
import { useRouter } from "next/router"
import { PERMISSIONS } from "@/utils/permissions"
import { hasPermission } from "@/utils/authHelpers"
import DynamicComments, { CommentTargetType } from "@/components/social/DynamicComments"

const PhotoGallery = dynamic(() => import("@/components/cards/card_photoGallery"), { ssr: false })

// Helper functions
const mapGalleryItemsToMedia = (entity) => {
  const items =
    (Array.isArray(entity?.gallery?.galleryItems) && entity.gallery.galleryItems) ||
    (Array.isArray(entity?.gallery?.GalleryItems) && entity.gallery.GalleryItems) ||
    (Array.isArray(entity?.gallery?.items) && entity.gallery.items) ||
    (Array.isArray(entity?.relatedGallery?.galleryItems) && entity.relatedGallery.galleryItems) ||
    (Array.isArray(entity?.relatedGallery?.GalleryItems) && entity.relatedGallery.GalleryItems) ||
    []
  if (items.length === 0) return []

  return items
    .slice()
    .sort((a, b) => (Number(a?.sortOrder) || 0) - (Number(b?.sortOrder) || 0))
    .map((item) => {
      const picture = item?.picture || item?.Picture
      const video = item?.video || item?.Video
      const pictureUrl =
        picture?.url ||
        picture?.URL ||
        picture?.path ||
        picture?.Path ||
        picture?.normalizedURL ||
        picture?.NormalizedURL ||
        picture?.contentUrl ||
        picture?.contentURL ||
        picture?.src ||
        item?.url ||
        item?.URL ||
        item?.path ||
        item?.Path ||
        item?.contentUrl ||
        item?.contentURL ||
        ""

      const pictureThumb =
        picture?.thumbnailURL ||
        picture?.thumbnailUrl ||
        picture?.ThumbnailURL ||
        picture?.thumbnail ||
        item?.thumbnailURL ||
        item?.thumbnailUrl ||
        item?.ThumbnailURL ||
        pictureUrl

      const videoThumb =
        video?.thumbnailURL ||
        video?.thumbnailUrl ||
        video?.ThumbnailURL ||
        video?.thumbnail ||
        item?.thumbnailURL ||
        item?.thumbnailUrl ||
        item?.ThumbnailURL ||
        "/blank_image.png"
      const url = picture ? pictureThumb : videoThumb

      if (!url) return null
      if (picture && !pictureUrl) return null
      if (!picture && !video) return null

      return {
        original: url,
        thumbnail: url,
        mediaType: picture ? "picture" : "video",
        sourceURL: picture ? pictureUrl : (video?.url || video?.URL || ""),
        embedURL: picture ? (picture?.embedURL || picture?.EmbedURL || "") : (video?.embedURL || video?.embedUrl || video?.EmbedURL || ""),
        description:
          item?.captionOverride ||
          item?.CaptionOverride ||
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

const normalizeListingPayload = (payload) => {
  if (!payload) {
    return {}
  }

  if (Array.isArray(payload)) {
    return payload[0] || {}
  }

  return payload
}

const ListingDetails = () => {
  // ALL HOOKS MUST BE AT THE TOP - NO CONDITIONAL HOOKS!
  const router = useRouter()
  const { slug, L_slug } = router.query
  const { data: session } = useSession()
  const canAddComment = hasPermission(session, PERMISSIONS.LISTING.COMMENT)
  
  const [listing, setListing] = useState({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [blobGalleryResult, setBlobGalleryResult] = useState({ listingId: null, items: [] })

  // Calculate listingId - MUST be before any conditional returns
  const listingId = useMemo(
    () => listing?.listingID || listing?.ListingID || listing?.listingid || listing?.listingId || listing?.ListingId || null,
    [listing],
  )

  // Calculate gallery images - MUST be before any conditional returns
  const listingGalleryImages = useMemo(
    () => getListingGalleryImages(listing),
    [listing]
  )

  const blobGalleryImages = useMemo(
    () => (blobGalleryResult.listingId === listingId ? blobGalleryResult.items : []),
    [blobGalleryResult, listingId],
  )
  
  const effectiveGalleryImages = useMemo(() => {
    const merged = [...listingGalleryImages, ...blobGalleryImages]
    const seen = new Set()

    return merged.filter((item) => {
      const key = String(item?.sourceURL || item?.original || "").trim().toLowerCase()
      if (!key) return false
      if (seen.has(key)) return false
      seen.add(key)
      return true
    })
  }, [listingGalleryImages, blobGalleryImages])
  
  const hasRealGalleryMedia = effectiveGalleryImages.length > 0

  const listingForCard = useMemo(() => ({
    ...listing,
    panelSize: "half",
    images: listingGalleryImages,
    path: listing?.path || "",
    artist: {
      ...(listing?.artist || {}),
      path: listing?.artist?.path || slug || "",
    },
  }), [listing, listingGalleryImages, slug])

  const canonicalSlug = listing.seoCanonicalSlug || `artists/${slug}/listings/${L_slug}`
  const pageMetaData = useMemo(() => ({
    title: listing.seoTitle || listing.title || 'Listing Details',
    description: listing.seoDescription || listing.description || '',
    keywords: listing.seoKeywords || '',
    og: {
      title: listing.seoOgTitle || listing.title || 'Listing',
      description: listing.seoOgDescription || listing.description || '',
      image: listing.seoImage || listing.profilePic?.url || '',
    },
  }), [listing])

  // Fetch listing data
  useEffect(() => {
    const fetchListing = async () => {
      if (!router.isReady) {
        console.log("Router not ready yet...")
        return
      }

      if (!slug || !L_slug) {
        console.log("Missing slug or L_slug:", { slug, L_slug })
        return
      }

      console.log("=== STARTING LISTING FETCH ===")
      console.log("Artist slug:", slug)
      console.log("Listing slug:", L_slug)
      
      setLoading(true)
      setError(null)

      try {
        const fullUrl = `/api/listing/artist/${slug}/listing/${L_slug}`
        console.log("Full URL:", fullUrl)
        
        console.log("Fetching listing...")
        const res = await fetch(fullUrl)
        console.log("Response status:", res.status)
        console.log("Response ok:", res.ok)

        if (!res.ok) {
          const errorText = await res.text()
          console.error("API Error Response:", errorText)
          throw new Error(`Failed to fetch: ${res.status} - ${errorText}`)
        }

        const rawData = await res.json()
        console.log("Raw API response:", rawData)
        
        let data = normalizeListingPayload(rawData)
        console.log("Normalized data:", data)

        const fetchedListingId = data?.listingID || data?.ListingID || data?.listingid || data?.listingId || data?.ListingId || null
        console.log("Extracted listing ID:", fetchedListingId)
        
        const numericFromSlug = Number(L_slug)
        const fallbackListingId = Number.isInteger(numericFromSlug) && numericFromSlug > 0 ? numericFromSlug : null
        console.log("Fallback listing ID from slug:", fallbackListingId)
        
        const resolvedListingId = fetchedListingId || fallbackListingId
        console.log("Resolved listing ID:", resolvedListingId)

        if (resolvedListingId) {
          console.log("Fetching by ID:", resolvedListingId)
          const byIdUrl = `/api/listing/byID/${resolvedListingId}`
          console.log("ByID URL:", byIdUrl)
          
          const byIdRes = await fetch(byIdUrl)
          console.log("ByID Response status:", byIdRes.status)
          
          if (byIdRes.ok) {
            const byIdRaw = await byIdRes.json()
            console.log("ByID raw response:", byIdRaw)
            
            const byIdData = normalizeListingPayload(byIdRaw)
            console.log("ByID normalized data:", byIdData)
            
            data = {
              ...data,
              ...byIdData,
              artist: {
                ...(data?.artist || {}),
                ...(byIdData?.artist || {}),
              },
              gallery: byIdData?.gallery || data?.gallery || null,
              relatedGallery: byIdData?.relatedGallery || data?.relatedGallery || null,
            }
            console.log("Merged data:", data)
          }
        }

        console.log("Final listing data:", data)
        console.log("Has listingID?", !!data.listingID)
        
        setListing(data)
        setError(null)
      } catch (err) {
        console.error("=== ERROR FETCHING LISTING ===")
        console.error("Error:", err)
        console.error("Error message:", err.message)
        setError(err.message)
      } finally {
        console.log("=== FETCH COMPLETE ===")
        setLoading(false)
      }
    }

    fetchListing()
  }, [router.isReady, slug, L_slug])

  // Fetch blob gallery
  useEffect(() => {
    if (!listingId) {
      return
    }

    const galleryPrefix = `platformpics/listing/${listingId}/gallery/`

    const fetchBlobGallery = async () => {
      try {
        const res = await fetch(`/api/image/list?container=tagpictures&startPrefix=${encodeURIComponent(galleryPrefix)}&prefix=${encodeURIComponent(galleryPrefix)}`)
        if (!res.ok) return

        const payload = await res.json()
        const files = Array.isArray(payload?.files) ? payload.files : []
        const mapped = files
          .filter((file) => {
            const ct = String(file?.contentType || "").toLowerCase()
            return ct.startsWith("image/") || !ct
          })
          .map((file) => ({
            original: file?.url,
            thumbnail: file?.url,
            mediaType: "picture",
            sourceURL: file?.url,
            embedURL: "",
            description: "",
            byline: "",
            altText: file?.name || "Gallery image",
          }))
          .filter((item) => Boolean(item?.original))

        setBlobGalleryResult({ listingId, items: mapped })
      } catch (error) {
        console.error("Error loading listing gallery blobs:", error)
      }
    }

    fetchBlobGallery()
  }, [listingId])

  // NOW we can do conditional rendering AFTER all hooks are called
  const isListingEmpty = !listing || Object.keys(listing).length === 0 || !listingId

  // Show loading state
  if (loading) {
    return (
      
        <div className="container mx-auto px-4 py-6 bg-base-200 text-base-content">
          <div className="flex flex-col justify-center items-center min-h-screen">
            <div className="animate-spin rounded-full h-32 w-32 border-t-2 border-b-2 border-primary mb-4"></div>
            <p className="text-base-content/70">Loading listing details...</p>
            <p className="text-xs text-base-content/50 mt-2">
              Artist: {slug || 'N/A'}, Listing: {L_slug || 'N/A'}
            </p>
            <p className="text-xs text-base-content/50 mt-1">
              Router ready: {router.isReady ? 'Yes' : 'No'}
            </p>
          </div>
        </div>
      
    )
  }

  // Show error state
  if (error) {
    return (
      
        <div className="container mx-auto px-4 py-6 bg-base-200 text-base-content">
          <div className="flex flex-col justify-center items-center min-h-screen">
            <div className="alert alert-error max-w-2xl">
              <div>
                <h3 className="font-bold">Error Loading Listing</h3>
                <div className="text-sm mt-2">{error}</div>
                <div className="text-xs mt-2 opacity-70">
                  Artist: {slug}, Listing: {L_slug}
                </div>
              </div>
            </div>
            <button 
              onClick={() => router.reload()} 
              className="btn btn-primary mt-4"
            >
              Retry
            </button>
          </div>
        </div>
      
    )
  }

  // Show empty state
  if (isListingEmpty) {
    return (
      
        <div className="container mx-auto px-4 py-6 bg-base-200 text-base-content">
          <div className="flex flex-col justify-center items-center min-h-screen">
            <div className="alert alert-warning max-w-2xl">
              <div>
                <h3 className="font-bold">Listing Not Found</h3>
                <div className="text-sm mt-2">
                  The listing could not be found or returned empty data.
                </div>
                <div className="text-xs mt-2 opacity-70">
                  Artist: {slug}, Listing: {L_slug}
                </div>
              </div>
            </div>
            <button 
              onClick={() => router.push('/artists')} 
              className="btn btn-primary mt-4"
            >
              Browse Artists
            </button>
          </div>
        </div>
      
    )
  }

  // Render the full page
  return (
    
      <div className="container mx-auto px-4 py-6 bg-base-200 text-base-content">
        <TagSEO metadataProp={pageMetaData} canonicalSlug={canonicalSlug} />
        <div className="mb-8">
          <div className="card bg-base-100 text-base-content border border-base-300 shadow-lg p-4 rounded-box">
            <div className="space-y-4">
              <h2 className="text-xl font-bold border-b pb-2 text-primary">Listing Gallery</h2>
              {hasRealGalleryMedia ? (
                <PhotoGallery
                  images={effectiveGalleryImages}
                  mode="standalone"
                  navigationMode="manual"
                  imageEffect="landscape"
                  showThumbnails={effectiveGalleryImages.length > 1}
                  showContentWarnings={false}
                />
              ) : (
                <div className="rounded-box border border-base-300 bg-base-200 p-4 text-sm text-base-content/70">
                  No gallery media is available for this listing yet.
                </div>
              )}
            </div>
          </div>

          <div className="mt-8">
            <h2 className="text-xl font-bold mb-4 border-b pb-2 text-primary">Listing Details</h2>
            <ListingCard listing={listingForCard} panelSize="half" showArtistIdentityGlow={false} />
          </div>

          <div className="mt-8">
            <h2 className="text-xl font-bold mb-4 border-b pb-2 text-primary">Additional Information</h2>
            <table className="table w-full border border-base-300">
              <tbody>
                <tr className="border-b border-base-300">
                  <th className="bg-base-100 text-base-content font-medium">Price</th>
                  <td className="bg-base-100 text-base-content">
                    {listing.price !== null && listing.price !== undefined ? `$${Number(listing.price).toFixed(2)}` : "Contact for pricing"}
                  </td>
                </tr>
                <tr className="border-b border-base-300">
                  <th className="bg-base-100 text-base-content font-medium">Status</th>
                  <td className="bg-base-100 text-base-content">{listing.status || "Available"}</td>
                </tr>
                <tr className="border-b border-base-300">
                  <th className="bg-base-100 text-base-content font-medium">Dimensions</th>
                  <td className="bg-base-100 text-base-content">
                    {listing.width && listing.height
                      ? `${listing.width} x ${listing.height} ${listing.dimensionUnit || "in"}`
                      : "N/A"}
                  </td>
                </tr>
                <tr className="border-b border-base-300">
                  <th className="bg-base-100 text-base-content font-medium">Medium</th>
                  <td className="bg-base-100 text-base-content">{listing.medium || "N/A"}</td>
                </tr>
                <tr className="border-b border-base-300">
                  <th className="bg-base-100 text-base-content font-medium">Work Dates</th>
                  <td className="bg-base-100 text-base-content">
                    {listing.work_BeginDate || "N/A"} - {listing.work_CompletionDate || "N/A"}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Comments Section */}
          <div className="mt-8">
            <h2 className="text-xl font-bold mb-4 border-b pb-2 text-primary">Comments & Feedback</h2>
            <DynamicComments
              targetId={listingId}
              targetType={CommentTargetType.LISTING}
              allowMedia={true}
              enabled={true}
            />
          </div>
        </div>
      </div>
    
  )
}

export default ListingDetails

