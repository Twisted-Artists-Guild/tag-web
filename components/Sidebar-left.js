/* This file is part of the Twisted Artists Guild project.

 Copyright (C) 2025 Twisted Artists Guild

 Licensed under the GNU General Public License v3.0
 (https://www.gnu.org/licenses/gpl-3.0.en.html).

 This software comes with NO WARRANTY; see the license for details.

 Open source · low-profit · human-first*/
"use client"

import { Fragment, useEffect, useRef, useState } from "react"
import Image from "next/image"
import Link from "next/link"
import { useRouter } from "next/router"
import { useSession } from "next-auth/react"
import { PanelLeft, Search, ShoppingCart } from "lucide-react"
import { BROWSE_PANEL_ID, useLayout } from "./LayoutProvider"
import { useCart } from "@/components/cart/CartContext"
import { hasExplicitWarning, extractContentWarnings } from "@/components/social/ContentTags"

const ROWS_PER_SECTION = 6
const MONTHS = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"]
const DEFAULT_FILTERS = [
  { label: "All art", value: "-1" },
  { label: "Paintings", value: "3" },
  { label: "Sculpture", value: "30" },
]
const SEARCH_FIELDS = {
  artists: ["biography", "byline", "title", "path", "seotags", "statement"],
  events: ["description", "title", "note", "path"],
  listings: ["description", "title", "culture", "medium", "path", "artCategory"],
}

// Demo data: there is no favorites API yet, so removing one only lasts until reload
const DEMO_FAVORITES = {
  artists: [
    { id: "fav-artist-twistedpassions", label: "TwistedPassions", href: "/artists/TwistedPassions" },
  ],
  artListings: [
    { id: "fav-tiedye3", label: "TwistedPassions - tiedye3", href: "/artists/TwistedPassions/listings/tiedye3" },
    { id: "fav-tiedye2", label: "TwistedPassions - tiedye2", href: "/artists/TwistedPassions/listings/tiedye2" },
  ],
}

/** Browse panel: search, category chips, favorites, and featured listings, artists and events. */
export default function LeftSidebar(props) {
  const artists = props.artists || []
  const events = props.events || []
  const filters = props.filters || DEFAULT_FILTERS
  const api_url = process.env.NEXT_PUBLIC_TAG_API_URL

  const { isLeftSidebarVisible, toggleLeftSidebar, toggleRightSidebar } = useLayout()
  const { addToCart } = useCart()
  const { data: session } = useSession()
  const router = useRouter()
  const [listings, setListings] = useState(props.listings || [])
  const [favorites, setFavorites] = useState(DEMO_FAVORITES)
  const [searchTerm, setSearchTerm] = useState("")
  const [activeFilter, setActiveFilter] = useState("-1")
  const searchInputRef = useRef(null)
  const hasFetchedRef = useRef(false)

  const shouldFetchListings = (!props.contentType || props.contentType === "auto")
    && !props.listings?.length && !artists.length && !events.length

  // Listings load the first time the panel opens
  useEffect(() => {
    if (!isLeftSidebarVisible || !shouldFetchListings || hasFetchedRef.current) return
    hasFetchedRef.current = true
    let cancelled = false
    ;(async () => {
      try {
        //TODO: Change to add new API in backend to fetch top n listings instead of fetching all
        const res = await fetch(`${api_url}listing/`)
        if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`)
        const data = await res.json()
        if (!cancelled && Array.isArray(data)) setListings(data)
      } catch (error) {
        console.error("Error loading sidebar listings:", error)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [api_url, isLeftSidebarVisible, shouldFetchListings])

  // The header's search button opens this panel and focuses the field
  useEffect(() => {
    const handleSidebarSearchFocus = () => {
      toggleLeftSidebar(true)
      window.setTimeout(() => searchInputRef.current?.focus(), 350) // after the slide-in
    }
    window.addEventListener("sidebarSearchFocus", handleSidebarSearchFocus)
    return () => window.removeEventListener("sidebarSearchFocus", handleSidebarSearchFocus)
  }, [toggleLeftSidebar])

  function handleAddToCart(listing) {
    addToCart({ ...listing, id: listing.listingID || listing.id, price: Number(listing.price || 0) }, 1)
    toggleRightSidebar(true)
  }

  // Categories only exist on listings; artists and events are filtered by the search text alone
  const search = searchTerm.toLowerCase()
  const [listingHits, artistHits, eventHits] = [
    [listings, "listings", activeFilter],
    [artists, "artists", "-1"],
    [events, "events", "-1"],
  ].map(([items, type, category]) => (Array.isArray(items) ? items : []).filter((item) => (
    (category === "-1" || String(item?.artCategoryID) === category)
    && (!search || SEARCH_FIELDS[type].some((field) => String(item?.[field] ?? "").toLowerCase().includes(search)))
  )))
  const nothingFound = searchTerm && !listingHits.length && !artistHits.length && !eventHits.length

  const sections = [
    {
      id: "tag-favorites-title",
      title: "Your favorites",
      groups: session?.user ? [
        { key: "artists", title: "Artists", media: "avatar" },
        { key: "artListings", title: "Art listings", media: "thumb" },
      ].map((group) => ({
        key: group.key,
        title: group.title,
        rows: favorites[group.key].map((favorite) => ({
          key: favorite.id,
          href: favorite.href,
          title: favorite.label,
          media: { kind: group.media },
          action: (
            <button
              type="button"
              className="tag-row__action"
              onClick={() => setFavorites((current) => ({
                ...current,
                [group.key]: current[group.key].filter((item) => item.id !== favorite.id),
              }))}
              aria-label={`Unsubscribe from ${favorite.label}`}
              title="Unsubscribe"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
                <path d="M6 6l12 12M18 6L6 18" />
              </svg>
            </button>
          ),
        })),
      })) : [],
    },
    {
      id: "tag-browse-listings",
      title: "Featured listings",
      seeAllHref: "/art/",
      groups: [{
        key: "listings",
        rows: listingHits.slice(0, ROWS_PER_SECTION).map((listing, index) => {
          const artist = listing?.artist || listing?.vendor || {}
          const price = Number(listing?.price || 0)
          return {
            key: listing?.id || listing?.listingID || listing?.path || listing?.title || index,
            href: listing?.artist?.path && listing?.path ? `/artists/${listing.artist.path}/listings/${listing.path}` : "/art/",
            title: listing?.title || "Untitled listing",
            meta: artist?.title || artist?.name || "",
            media: { kind: "thumb", src: listing?.profilePic?.url || listing?.defaultImageURL || listing?.image || "" },
            explicit: hasExplicitWarning(extractContentWarnings(listing)),
            price,
            action: price > 0 ? (
              <button
                type="button"
                className="tag-row__action"
                aria-label={`Add ${listing?.title || "listing"} to cart`}
                title="Add to cart"
                onClick={() => handleAddToCart(listing)}
              >
                <ShoppingCart aria-hidden="true" />
              </button>
            ) : null,
          }
        }),
      }],
    },
    {
      id: "tag-browse-artists",
      title: "Featured artists",
      seeAllHref: "/artists",
      groups: [{
        key: "artists",
        rows: artistHits.slice(0, ROWS_PER_SECTION).map((artist, index) => ({
          key: artist?.id || artist?.artistID || artist?.path || artist?.title || index,
          href: artist?.path ? `/artists/${artist.path}` : "/artists",
          title: artist?.title || "Untitled artist",
          meta: artist?.byline || artist?.locationSummary || "",
          media: { kind: "avatar", src: artist?.profilePic?.url || artist?.profilePic?.URL || artist?.profilePicUrl || "" },
        })),
      }],
    },
    {
      id: "tag-browse-events",
      title: "Upcoming events",
      seeAllHref: "/events",
      groups: [{
        key: "events",
        rows: eventHits.slice(0, ROWS_PER_SECTION).map((event, index) => {
          const rawDate = event?.date || event?.startDate || event?.startsAt
          const date = rawDate ? new Date(rawDate) : null
          const valid = date && !Number.isNaN(date.getTime())
          return {
            key: event?.id || event?.eventID || event?.path || event?.title || index,
            href: event?.href || (event?.path ? `/events/${event.path}` : "/events"),
            title: event?.name || event?.title || "Untitled event",
            meta: typeof event?.location === "string" ? event.location : event?.location?.name || event?.venue?.name || "",
            // UTC so the server and the browser render the same day (no hydration mismatch)
            media: { kind: "date", day: valid ? date.getUTCDate() : "?", month: valid ? MONTHS[date.getUTCMonth()] : "TBA" },
          }
        }),
      }],
    },
  ]

  return (
    <>
      <button
        type="button"
        className={`tag-edge-tab tag-edge-tab--left${isLeftSidebarVisible ? " is-hidden" : ""}`}
        aria-label="Open browse panel"
        aria-controls={BROWSE_PANEL_ID}
        aria-expanded={isLeftSidebarVisible}
        tabIndex={isLeftSidebarVisible ? -1 : 0}
        onClick={() => toggleLeftSidebar(true)}
      >
        <PanelLeft aria-hidden="true" />
        <span className="tag-edge-tab__label" aria-hidden="true">Browse</span>
      </button>

      <aside
        id={BROWSE_PANEL_ID}
        className={`tag-panel tag-panel--left${isLeftSidebarVisible ? " is-open" : ""}`}
        aria-label="Browse"
        inert={!isLeftSidebarVisible}
      >
        <div className="tag-panel__head">
          <h2 className="tag-panel__title">Browse</h2>
          <button type="button" className="tag-panel__close" aria-label="Close browse" onClick={() => toggleLeftSidebar(false)}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
              <path d="M6 6l12 12M18 6L6 18" />
            </svg>
          </button>
        </div>

        <div className="tag-panel__body">
          <form
            className="tag-panel__search"
            role="search"
            onSubmit={(event) => {
              event.preventDefault()
              router.push(`/search?term=${encodeURIComponent(searchTerm)}`)
            }}
          >
            <Search className="tag-panel__search-icon" aria-hidden="true" />
            <label className="sr-only" htmlFor="tag-browse-search">Search the guild</label>
            <input
              id="tag-browse-search"
              ref={searchInputRef}
              type="search"
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              placeholder="Search art, artists, events…"
              autoComplete="off"
            />
            <button type="submit" className="tag-panel__search-go" aria-label="Search">
              <Search aria-hidden="true" />
            </button>
          </form>

          {filters.length > 0 && (
            <div className="tag-panel__chips" role="group" aria-label="Filter by category">
              {filters.map((filter) => (
                <button
                  key={filter.value}
                  type="button"
                  className="tag-chip"
                  aria-pressed={String(activeFilter) === String(filter.value)}
                  onClick={() => setActiveFilter(String(filter.value))}
                >
                  {filter.label}
                </button>
              ))}
            </div>
          )}

          {sections.map((section) => {
            const groups = section.groups.filter((group) => group.rows.length)
            if (!groups.length) return null
            return (
              <section key={section.id} className="tag-panel__section" aria-labelledby={section.id}>
                <h3 id={section.id} className="tag-panel__section-title">
                  {section.title}
                  {section.seeAllHref ? <Link href={section.seeAllHref}>See all</Link> : null}
                </h3>
                {groups.map((group) => {
                  const list = (
                    <ul className="tag-rows">
                      {group.rows.map((row) => (
                        <li key={row.key} className="tag-row">
                          <Link href={row.href} className="tag-row__link">
                            {row.explicit ? (
                              <span className="tag-row__tile tag-row__tile--explicit" aria-label="Preview hidden: 18+ explicit">18+</span>
                            ) : row.media.kind === "date" ? (
                              <span className="tag-row__date" aria-hidden="true">
                                <b>{row.media.day}</b>
                                <small>{row.media.month}</small>
                              </span>
                            ) : row.media.src ? (
                              <Image
                                src={row.media.src}
                                alt=""
                                width={52}
                                height={52}
                                unoptimized
                                className={row.media.kind === "avatar" ? "tag-row__avatar" : "tag-row__thumb"}
                              />
                            ) : (
                              <span className={row.media.kind === "avatar" ? "tag-row__avatar tag-row__avatar--initials" : "tag-row__tile"} aria-hidden="true">
                                {String(row.title || "?").split(/[\s_-]+/).filter(Boolean).slice(0, 2).map((word) => word[0].toUpperCase()).join("") || "?"}
                              </span>
                            )}
                            <span className="tag-row__meta">
                              <strong title={row.title}>{row.title}</strong>
                              {row.meta ? <span title={row.meta}>{row.meta}</span> : null}
                            </span>
                          </Link>
                          {row.price > 0 ? <span className="tag-price">${row.price.toFixed(2)}</span> : null}
                          {row.action}
                        </li>
                      ))}
                    </ul>
                  )
                  return group.title ? (
                    <div key={group.key} className="tag-panel__group">
                      <span className="tag-panel__group-title">{group.title}</span>
                      {list}
                    </div>
                  ) : (
                    <Fragment key={group.key}>{list}</Fragment>
                  )
                })}
              </section>
            )
          })}

          {nothingFound ? (
            <p className="tag-panel__empty-note" role="status">
              Nothing here matches “{searchTerm}”. Press Enter to search the whole guild.
            </p>
          ) : null}
        </div>
      </aside>
    </>
  )
}
