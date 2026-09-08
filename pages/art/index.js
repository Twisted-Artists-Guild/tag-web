/* This file is part of the Twisted Artists Guild project.

 Copyright (C) 2025 Twisted Artists Guild

 Licensed under the GNU General Public License v3.0
 (https://www.gnu.org/licenses/gpl-3.0.en.html).

 This software comes with NO WARRANTY; see the license for details.

 Open source · low-profit · human-first*/



import TagSEO from "@/components/TagSEO"
import ListingCard from "@/components/cards/card_listing"
import { getRandomStockPhotoByCategory } from "@/utils/stockPhotos"
import { getPanelClass } from "@/components/cards/sizes/panel-layout"
import serverFetch from "@/libs/serverFetch"

const Listings = (props) => {
  const pageMetaData = {
    title: "Browse Art",
    description: "Shop and explore curated paintings, sculpture, digital work, and more from independent creators.",
    keywords: "art listings, paintings, sculpture, digital art, gallery, buy art, browse art",
    robots: "index, follow",
    author: "Bobb Shields",
    viewport: "width=device-width, initial-scale=1.0",
    og: {
      title: "Browse Art on TAG",
      description: "Discover curated artwork across mediums and categories from independent artists.",
    },
  }
  return (
    <div className="relative isolate min-h-screen bg-base-100 text-base-content">
      <TagSEO metadataProp={pageMetaData} canonicalSlug="art" />
      {/* Hero Section */}
      <section className="relative text-center py-6 md:py-8">
        <h1 className="text-3xl md:text-4xl font-bold tracking-tight mb-2 text-primary">
          Browse Art
        </h1>
        <p className="text-sm md:text-base text-secondary/90 mb-0">
          Curated paintings, sculpture, digital work, and more from independent creators.
        </p>
      </section>
      <main className="relative container mx-auto px-4 py-8 flex-1 w-full">
        {/* Filter Bar - light touch placeholder */}
        <div className="mb-8 pb-6 border-b border-base-200">
          <div className="flex flex-wrap gap-3 items-center">
            <div className="dropdown dropdown-hover">
              <button className="btn btn-sm btn-ghost gap-2">
                Category ▾
              </button>
              <ul className="dropdown-content menu bg-base-100 rounded-box w-52 p-2 shadow">
                <li><a>Painting</a></li>
                <li><a>Sculpture</a></li>
                <li><a>Digital Art</a></li>
                <li><a>Photography</a></li>
                <li><a>Mixed Media</a></li>
              </ul>
            </div>
            
            <div className="dropdown dropdown-hover">
              <button className="btn btn-sm btn-ghost gap-2">
                Genre ▾
              </button>
              <ul className="dropdown-content menu bg-base-100 rounded-box w-52 p-2 shadow">
                <li><a>Abstract</a></li>
                <li><a>Figurative</a></li>
                <li><a>Landscape</a></li>
                <li><a>Portrait</a></li>
                <li><a>Still Life</a></li>
              </ul>
            </div>
            
            <div className="divider divider-horizontal mx-1 my-0"></div>
            <span className="text-sm text-base-content/60">{props.listings.length} results</span>
          </div>
        </div>

        {/* Dynamic listings section */}
        <div className="mb-16">
          <div className="grid grid-cols-1 items-start md:grid-cols-6 lg:grid-cols-12 gap-6">
            {props.listings.map((listing, index) => (
              <div
                key={listing.path || listing.listingid || `${listing.title || "listing"}-${index}`}
                className={`${getPanelClass(listing.panelSize)} self-start`}
              >
                <ListingCard listing={listing} panelSize={listing.panelSize} showArtistIdentityGlow={false} />
              </div>
            ))}
          </div>
        </div>

      </main>
    </div>
    
  )
}

Listings.getInitialProps = async (context) => {
  const { query } = context

  let data = []
  let status = 200

  try {
    const queryParams = new URLSearchParams(query).toString()
    const res = await serverFetch(`/listing/?${queryParams}`)
    status = res.status
    if (!res.ok) {
      throw new Error(`HTTP error! status: ${status}`)
    }
    data = await res.json()
  } catch (error) {
    console.error("An error has occurred with your fetch request: ", error)
  }

  const enrichListing = (listing) => ({
    ...listing,
    panelSize: "half",
  })

  const listings = (Array.isArray(data) ? data : []).map(enrichListing)

  // Generate some fake artists for sidebar
  const featuredArtists = [
    {
      id: "sidebar-artist-1",
      name: "Elena Rodriguez",
      avatar: "/placeholder.svg?height=48&width=48",
      specialty: "Abstract Painting",
      rating: 4.8,
      location: "San Francisco, CA"
    },
    {
      id: "sidebar-artist-2", 
      name: "Marcus Chen",
      avatar: "/placeholder.svg?height=48&width=48",
      specialty: "Digital Sculpture",
      rating: 4.9,
      location: "Portland, OR"
    },
    {
      id: "sidebar-artist-3",
      name: "Sophia Williams",
      avatar: "/placeholder.svg?height=48&width=48", 
      specialty: "Mixed Media",
      rating: 4.7,
      location: "Austin, TX"
    }
  ]

  return {
    listings,
    status: status,
    sidebarProps: {
      leftSidebarData: {
        artists: featuredArtists,
        contentType: "artists",
        filters: [
          { label: "All Art", value: "all" },
          { label: "Paintings", value: "paintings" },
          { label: "Sculptures", value: "sculptures" },
          { label: "Digital Art", value: "digital" },
          { label: "Photography", value: "photography" },
          { label: "Mixed Media", value: "mixed" },
          { label: "Under $100", value: "budget" },
          { label: "$100 - $500", value: "mid" },
          { label: "Premium", value: "premium" }
        ]
      },
      rightSidebarData: {
        cartItems: [
          {
            id: "art-cart-1",
            name: "Abstract Digital Print",
            price: 85.0,
            quantity: 1,
            image: getRandomStockPhotoByCategory('painting'),
            artist: "Elena Rodriguez"
          },
          {
            id: "art-cart-2",
            name: "Sculpture Commission",
            price: 340.0,
            quantity: 1,
            image: getRandomStockPhotoByCategory('general'),
            artist: "Marcus Chen"
          },
          {
            id: "art-cart-3",
            name: "Photography Bundle",
            price: 120.0,
            quantity: 2,
            image: getRandomStockPhotoByCategory('general'),
            artist: "Sophia Williams"
          },
          {
            id: "art-cart-4",
            name: "Mixed Media Piece",
            price: 200.0,
            quantity: 1,
            image: getRandomStockPhotoByCategory('painting'),
            artist: "Various Artists"
          }
        ],
        stories: [
          {
            id: "art-story-1",
            author: "Art Collector",
            avatar: getRandomStockPhotoByCategory('artist'),
            content: "Just discovered this amazing piece! The technique and composition are absolutely stunning.",
            timestamp: "30 minutes ago"
          },
          {
            id: "art-story-2",
            author: "Gallery Director", 
            avatar: getRandomStockPhotoByCategory('artist'),
            content: "New arrivals this week include some exceptional contemporary works. Don't miss out!",
            timestamp: "3 hours ago"
          },
          {
            id: "art-story-3",
            author: "Art Critic",
            avatar: getRandomStockPhotoByCategory('artist'),
            content: "The emerging talent in our community continues to amaze me. Such innovative approaches to traditional mediums.",
            timestamp: "6 hours ago"
          },
          {
            id: "art-story-4",
            author: "Student Artist",
            avatar: getRandomStockPhotoByCategory('artist'),
            content: "Learned so much from studying the pieces in this collection. Inspiration everywhere!",
            timestamp: "1 day ago"
          },
          {
            id: "art-story-5",
            author: "Curator",
            avatar: getRandomStockPhotoByCategory('artist'),
            content: "Planning our next exhibition theme. The diversity of styles here is perfect for our spring show.",
            timestamp: "2 days ago"
          }
        ],
        notifications: [
          {
            id: "art-notif-1",
            message: "Flash sale: 20% off all digital prints this weekend!",
            type: "success"
          },
          {
            id: "art-notif-2",
            message: "New artwork uploaded by featured artists",
            type: "info"
          }
        ]
      }
    }
  }
}

export default Listings

