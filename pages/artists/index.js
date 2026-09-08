/* This file is part of the Twisted Artists Guild project.

 Copyright (C) 2025 Twisted Artists Guild

 Licensed under the GNU General Public License v3.0
 (https://www.gnu.org/licenses/gpl-3.0.en.html).

 This software comes with NO WARRANTY; see the license for details.

 Open source · low-profit · human-first*/
import { useEffect, useMemo, useState } from "react"
import TagSEO from "@/components/TagSEO"
import ArtistCard from "@/components/cards/card_artist"
import { getRandomStockPhotoByCategory } from "@/utils/stockPhotos"
import { getPanelClass } from "@/components/cards/sizes/panel-layout"
import serverFetch from "@/libs/serverFetch"

const BATCH_SIZE = 12

const pickArtistDescription = (artist) =>
  artist?.description || artist?.roleSummary || artist?.byline || ""

const inferPanelSizeFromDescription = (artist) => {
  const description = pickArtistDescription(artist)
  const length = description.trim().length

  if (length > 280) return "full"
  if (length > 210) return "threeQuarters"
  if (length > 150) return "twoThirds"
  if (length > 90) return "half"
  if (length > 45) return "third"
  return "quarter"
}

const normalizeArtistKey = (value) => {
  if (!value) {
    return ""
  }

  return value
    .toString()
    .trim()
    .toLowerCase()
    .replace(/^\/artists\//, "")
    .replace(/^\/+/, "")
    .replace(/\/+$/, "")
}

/**
 * Artists page component that displays list of artist members
 * @param {Object} props - Component props containing artists data
 * @returns {JSX.Element} - Artists page component
 */
const Artists = (props) => {
  const [visibleCount, setVisibleCount] = useState(BATCH_SIZE)

  const loadedArtists = useMemo(
    () =>
      (props.artists || []).map((artist) => ({
        ...artist,
        panelSize: inferPanelSizeFromDescription(artist),
      })),
    [props.artists],
  )

  const hasMoreLoadedArtists = visibleCount < loadedArtists.length

  const visibleLoadedArtists = useMemo(
    () => loadedArtists.slice(0, visibleCount),
    [loadedArtists, visibleCount],
  )

  useEffect(() => {
    const onScroll = () => {
      if (hasMoreLoadedArtists === false) {
        return
      }

      const nearBottom = window.innerHeight + window.scrollY >= document.body.offsetHeight - 300
      if (nearBottom) {
        setVisibleCount((prev) => Math.min(prev + BATCH_SIZE, loadedArtists.length))
      }
    }

    window.addEventListener("scroll", onScroll, { passive: true })
    return () => window.removeEventListener("scroll", onScroll)
  }, [hasMoreLoadedArtists, loadedArtists.length])

	const pageMetaData = {
  title: "Artists and Portfolios",
  description: "Find independent artists, explore portfolios, and connect directly for commissions, collaborations, and support.",
    keywords: "artists, portfolios, creator profiles, discover artists, art community",
		robots: "index, follow",
		author: "Bobb Shields",
		viewport: "width=device-width, initial-scale=1.0",
		og: {
    title: "Find Independent Artists on Platform",
    description: "Explore artist portfolios and connect directly with creators in the community.",
		},
	}

  return (
    
      <div className="min-h-screen flex flex-col bg-base-100 text-base-content">
			<TagSEO metadataProp={pageMetaData} canonicalSlug="artists" />
			{/* Hero Section */}
			<section className="text-center py-12">
				<h1 className="text-5xl md:text-7xl font-extrabold mb-4 text-primary">
					Artist Portfolios
				</h1>
				<p className="text-xl md:text-2xl text-secondary mb-6">
					Discover the creative energy of Twisted Artists Guild members. Each portfolio showcases the artist’s unique voice, featured works, and ways to connect or support them.
				</p>
			</section>
      <main className="container mx-auto px-4 py-8 flex-1 w-full">
				{/* Call to Action - Commented as create artist is not allowed */}
				{/*<div className="flex justify-end mb-8">*/}
				{/*	<Link href="/portal/artist/create" className="btn btn-primary">Create a new artist</Link>*/}
				{/*</div>*/}
        {/* Main Artist Card Grid */}
				<section className="w-full flex-1 min-h-100 flex flex-col justify-stretch">
          {loadedArtists.length > 0 ? (
            <>
              <div className="grid grid-cols-1 items-start md:grid-cols-6 lg:grid-cols-12 gap-6">
                {visibleLoadedArtists.map((artist, index) => {
                  const artistKey = `${artist.path || artist.artistid || artist.title || "artist"}-${index}`
                  return (
                    <div key={artistKey} className={`${getPanelClass(artist.panelSize)} self-start`}>
                      <ArtistCard artist={artist} showIdentityGlow={false} />
                    </div>
                  )
                })}
              </div>

              {hasMoreLoadedArtists && (
                <div className="flex justify-center py-8">
                  <div className="badge badge-outline badge-lg">Loading more artist cards...</div>
                </div>
              )}
            </>
					) : (
						<div className="alert alert-info w-full flex justify-center">
							<span>No artists found. Be the first to create an artist profile!</span>
						</div>
					)}
				</section>
			</main>
      </div>
    
	)
}

Artists.getInitialProps = async () => {
  let data = []
  let status = 200
  let listings = []

  // Function to generate a random number for social counters
  const getRandomCount = () => Math.floor(Math.random() * 1000) + 1 // Random number between 1 and 1000

  // Function to generate random placeholder images for slideshow
  const getRandomImages = (count = 3) => {
    const pool = [
      {
        url: getRandomStockPhotoByCategory("artist"),
        alt: "Curated artist portrait",
      },
      {
        url: getRandomStockPhotoByCategory("painting"),
        alt: "Curated painting detail",
      },
      {
        url: getRandomStockPhotoByCategory("general"),
        alt: "Curated creative image",
      },
    ]

    return Array.from({ length: count }, (_, index) => {
      const item = pool[(index + Math.floor(Math.random() * pool.length)) % pool.length]
      return item
    })
  }

  const toImageUrl = (image) => {
    if (!image) {
      return null
    }

    if (typeof image === "string") {
      return image
    }

    return image.url || image.original || image.thumbnailURL || null
  }

  const dedupeImageUrls = (items) => {
    const seen = new Set()
    const output = []

    items.forEach((item) => {
      const url = toImageUrl(item)
      if (!url || seen.has(url)) {
        return
      }
      seen.add(url)
      output.push(url)
    })

    return output
  }

  // If we are running in debug mode, log the active API URL
  if (process.env.DEBUG === "true") {
    console.log("Artist data fetch starting via API: \n /api/artist/")
  }
  try {
    const listingsRes = await serverFetch("/listing/")
    if (listingsRes.ok) {
      listings = await listingsRes.json()
    }

    // Fetch the artist data
    const res = await serverFetch("/artist/")
    status = res.status
    if (!res.ok) {
      throw new Error(`HTTP error! status: ${status}`)
    }
    data = await res.json()

    const listingImagesByArtistPath = (Array.isArray(listings) ? listings : []).reduce((map, listing) => {
      const artistPath = normalizeArtistKey(listing?.artist?.path)
      const listingImageUrl = toImageUrl(listing?.profilePic)

      if (!artistPath || !listingImageUrl) {
        return map
      }

      if (!map.has(artistPath)) {
        map.set(artistPath, [])
      }

      map.get(artistPath).push(listingImageUrl)
      return map
    }, new Map())

    // Populate galleries from DB-first sources, then fallback to stock photos.
    data = data.map((artist) => ({
      ...(() => {
        const artistPathKey = normalizeArtistKey(artist?.path)

        const dbGalleryImages = dedupeImageUrls([
          ...(Array.isArray(artist?.images) ? artist.images : []),
          artist?.profilePic,
          artist?.coverPic,
          ...(Array.isArray(artist?.listings) ? artist.listings.map(l => l?.profilePic).filter(Boolean) : []),
          ...(listingImagesByArtistPath.get(artistPathKey) || []),
        ])

        const galleryImages = dbGalleryImages.length > 0
          ? dbGalleryImages
          : getRandomImages(Math.floor(Math.random() * 3) + 2)

        const fallbackProfilePic = artist?.profilePic?.url || toImageUrl(galleryImages[0]) || "/blank_image.png"

        return {
          ...artist,
          loves: getRandomCount(),
          likes: getRandomCount(),
          followers: getRandomCount(),
          images: galleryImages,
          profilePic: {
            ...(artist?.profilePic || {}),
            url: fallbackProfilePic,
            alttext: artist?.profilePic?.alttext || `${artist?.title || "Artist"} profile image`,
          },
        }
      })(),
    }))
  } catch (error) {
    console.error("An error has occurred with your artist fetch request: ", error)
  }
  // If we are running in debug mode, log the artist data
  if (process.env.DEBUG === "true") {
    console.log(`Artist data fetched. Count: ${data.length}`)
  }
  // Return the artist data and status with sidebar data
  return {
    artists: data,
    status: status,
    sidebarProps: {
      leftSidebarData: {
        artists: data.slice(0, 5), // Show first 5 artists as featured in sidebar
        contentType: "artists",
        filters: [
          { label: "All Artists", value: "all" },
          { label: "Painters", value: "painter" },
          { label: "Sculptors", value: "sculptor" },
          { label: "Digital Artists", value: "digital" },
          { label: "Mixed Media", value: "mixed" },
          { label: "Photographers", value: "photographer" }
        ]
      },
      rightSidebarData: {
        cartItems: [
          {
            id: "artist-cart-1",
            name: "Artist Portfolio Review",
            price: 25.0,
            quantity: 1,
            image: getRandomStockPhotoByCategory('painting'),
            artist: "TAG Services"
          },
          {
            id: "artist-cart-2", 
            name: "Featured Artist Spotlight",
            price: 50.0,
            quantity: 1,
            image: getRandomStockPhotoByCategory('artist'),
            artist: "TAG Promotion"
          },
          {
            id: "artist-cart-3",
            name: "Artist Mentorship Session",
            price: 75.0,
            quantity: 1,
            image: getRandomStockPhotoByCategory('general'),
            artist: "TAG Education"
          }
        ],
        stories: [
          {
            id: "artist-story-1",
            author: "TAG Community",
            avatar: getRandomStockPhotoByCategory('artist'),
            content: "Welcome to our artist community! Discover amazing talent and connect with creative minds.",
            timestamp: "2 hours ago"
          },
          {
            id: "artist-story-2", 
            author: "Gallery Curator",
            avatar: getRandomStockPhotoByCategory('artist'),
            content: "Featured artist spotlight coming this week - stay tuned for exciting announcements!",
            timestamp: "1 day ago"
          },
          {
            id: "artist-story-3",
            author: "Art Collector",
            avatar: getRandomStockPhotoByCategory('artist'),
            content: "Just discovered some incredible emerging talent through TAG. The quality and creativity is outstanding!",
            timestamp: "2 days ago"
          },
          {
            id: "artist-story-4",
            author: "Artist Mentor",
            avatar: getRandomStockPhotoByCategory('artist'),
            content: "Loving the collaborative spirit in our community. So many artists helping each other grow!",
            timestamp: "3 days ago"
          }
        ],
        notifications: [
          {
            id: "artist-notif-1",
            message: "New artist applications are now open!",
            type: "info"
          },
          {
            id: "artist-notif-2", 
            message: "Portfolio review deadline: March 31st",
            type: "warning"
          }
        ]
      }
    }
  }
}

export default Artists


