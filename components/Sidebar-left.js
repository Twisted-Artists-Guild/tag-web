/* This file is part of the Twisted Artists Guild project.

 Copyright (C) 2025 Twisted Artists Guild

 Licensed under the GNU General Public License v3.0
 (https://www.gnu.org/licenses/gpl-3.0.en.html).

 This software comes with NO WARRANTY; see the license for details.

 Open source · low-profit · human-first*/ 
"use client"

import { useState, useEffect, useRef } from "react"
import { useLayout } from "./LayoutProvider"
import ListingCardSmall from "@/components/cards/card_listing_small"
import UnifiedCard from "@/components/cards/UnifiedCard"
import Navigation from "@/components/Navigation"
import { useRouter } from "next/router"
import { PanelLeftOpen, PanelLeftClose } from 'lucide-react';

export default function LeftSidebar(props) {
  // Since MyLayout.js spreads the leftSidebarData, we access props directly
  const artists = props.artists || [];
  const [listings, setDisplayListings] = useState(props.listings || []);
  const [displayType, setDisplayType] = useState("auto");
  const events = props.events || [];
  const filters = props.filters || [
    { label: "All Art", value: "-1" },
    { label: "Paintings", value: "3" },
    { label: "Sculpture", value: "30" },
  ];
  const api_url = process.env.NEXT_PUBLIC_TAG_API_URL;

  // All hooks declared up front before any function definitions
  const { isLeftSidebarVisible, toggleLeftSidebar, isMobile, isHeaderVisible } = useLayout()
  const [activeTab, setActiveTab] = useState("browse")
  const [searchTerm, setSearchTerm] = useState("")
  const [activeFilter, setActiveFilter] = useState("-1")
  const [searchHighlight, setSearchHighlight] = useState(false)
  const searchInputRef = useRef(null)
  const router = useRouter()

 useEffect(() => {
  // Auto-detect content type if not specified
     const resolveContent = async () => {
    // 2. Logic: If we already have data from props, use it.
    if (props.contentType && props.contentType !== "auto") {
        setDisplayType(props.contentType);
        return;
    }
      if (artists.length > 0) {
          setDisplayType("artists");
      } else if (events.length > 0) {
          setDisplayType("events");
      } else if (props.listings && props.listings.length > 0) {
          setDisplayType("listings");
      } else {
          try {
              // Fetch the listings data
              let status = 200
              const res = await fetch(`${api_url}listing/`);
              //TODO: Change to add new API in backend to fetch top n listings instead of fetching all
              //listings and filter top 5 to show
              status = res.status
              if (!res.ok) {
                  throw new Error(`HTTP error! status: ${status}`)
              }
              const data = await res.json();
              setDisplayListings(data);
              setDisplayType("listings");
          } catch (error) {
              console.error('Error in getInitialProps:', error);
              setDisplayType("none");
          }
      }
     }
     resolveContent();
 }, [api_url, artists.length, events.length, props.contentType, props.listings]); // Re-run if props change

  // Render content based on type
  const renderContent = () => {
      const filterItem = (item) => {
          // 1. Category Filter Logic
          const categoryMatch = activeFilter === "-1" || activeFilter === -1 || String(item.artCategoryID) === String(activeFilter);

          // 2. Multi-Property Search Logic
          if (!searchTerm) return categoryMatch; // Performance optimization for empty search
          const searchLower = searchTerm.toLowerCase();
          console.log(searchLower);
          console.log([
              item.biography,
              item.byline,
              item.title,
              item.path,
              item.seotags,
              item.statement
          ]);
          // 3. Type-Specific Property Checking
          let searchMatch = false;

          switch (displayType) {
              case "artists":
                  searchMatch = [
                      item.biography,
                      item.byline,
                      item.title,
                      item.path,
                      item.seotags,
                      item.statement
                  ].some(prop =>
                      String(prop || "").toLowerCase().includes(searchLower)
                  );
                  break;

              case "events":
                  searchMatch = [
                      item.description,
                      item.title,
                      item.note,
                      item.path,
                  ].some(prop =>
                      String(prop || "").toLowerCase().includes(searchLower)
                  );
                  break;
              case "listings":
              default:
                  searchMatch = [
                      item.description,
                      item.title,
                      item.culture,
                      item.medium,
                      item.path,
                      item.artCategory
                  ].some(prop =>
                      String(prop || "").toLowerCase().includes(searchLower)
                  );
                  break;
          }

          return categoryMatch && searchMatch;
      };
    switch (displayType) {
      case "listings":
        return (
          <>
            <h3 className="font-medium text-base-content mb-3">Featured Listings</h3>
            {listings.filter(filterItem).map((listing, index) => (
              <ListingCardSmall key={listing.id || index} listing={listing} />
            ))}
          </>
        );
      case "artists":
        return (
          <>
            <h3 className="font-medium text-base-content mb-3">Featured Artists</h3>
            {artists.filter(filterItem).map((artist, index) => (
              <UnifiedCard
                key={artist.id || artist.artistID || index}
                title={artist.title || "Untitled artist"}
                summary={artist.byline || artist.description || artist.locationSummary || "Artist profile"}
                image={artist.profilePic?.url || artist.profilePic?.URL || artist.profilePicUrl || "/blank_image.png"}
                imageAlt={artist.profilePic?.alttext || `${artist.title || "Artist"} profile picture`}
                href={artist.path ? `/artists/${artist.path}` : "/artists"}
                badge="Artist"
                size="xs"
                compact
                mediaClassName="h-28 w-full"
                showAuthor={false}
                showImpressions={false}
                showComments={false}
                showReport={false}
                showIdentityGlow={false}
                className="mb-3"
              />
            ))}
          </>
        );
      case "events":
        return (
          <>
            <h3 className="font-medium text-base-content mb-3">Upcoming Events</h3>
            {events.filter(filterItem).map((event, index) => (
              <UnifiedCard
                key={event.id || event.eventID || index}
                title={event.name || event.title || "Untitled event"}
                summary={event.description || event.location?.name || event.location || event.venue?.name || "Upcoming event"}
                image={event.image || event.coverImage || event.heroImage || event.imageUrl || "/blank_image.png"}
                imageAlt={event.name || event.title || "Event media"}
                href={event.href || (event.path ? `/events/${event.path}` : "/events")}
                badge="Event"
                date={event.date || event.startDate || event.startsAt}
                size="xs"
                compact
                mediaClassName="h-28 w-full"
                showAuthor={false}
                showImpressions={false}
                showComments={false}
                showReport={false}
                className="mb-3"
              />
            ))}
          </>
        );
      default:
        return (          
            <>
                <h3 className="font-medium text-base-content mb-3">Featured Listings</h3>
                {listings.filter(filterItem).map((listing, index) => (
                    <ListingCardSmall key={listing.id || index} listing={listing} />
                ))}
            </>
        );
    }
  };
  
  const topOffset = isHeaderVisible ? "top-20" : "top-0"

  useEffect(() => {
    const handleSidebarSearchFocus = () => {
      setActiveTab("browse")
      setTimeout(() => {
        searchInputRef.current?.focus()
        setSearchHighlight(true)
        setTimeout(() => setSearchHighlight(false), 3000)
      }, 350) // wait for sidebar open animation
    }
    window.addEventListener("sidebarSearchFocus", handleSidebarSearchFocus)
    return () => window.removeEventListener("sidebarSearchFocus", handleSidebarSearchFocus)
  }, [])

  return (
    <>
      {/* Open Button - Left Edge of Screen when closed */}
          {!isLeftSidebarVisible && (
              <button
                  onClick={toggleLeftSidebar}
                  className="fixed top-1/2 left-0 transform -translate-y-1/2 z-50 bg-primary text-primary-content 
               p-1.5 rounded-r-md shadow-md hover:shadow-lg transition-all 
               border-y border-r border-primary-focus"
                  aria-label="Show left sidebar"
              >
                  <PanelLeftOpen size={20} strokeWidth={1.5} />
              </button>
          )}

      {/* Left Sidebar */}
      <aside
        className={`
          fixed ${topOffset} bottom-0 left-0 w-80 bg-base-200 border-r border-base-content/10 z-30
          transition-transform duration-300 ease-in-out
          ${isLeftSidebarVisible ? "translate-x-0" : "-translate-x-full"}
          ${isMobile ? "w-full" : "w-80"}
          h-screen overflow-y-auto
        `}
      >
        {/* Theme-reactive accent strip */}
        <div className="sidebar-accent" />

        {/* Close Button - Right Edge Center of Sidebar when open */}
        {isLeftSidebarVisible && (
            <button
                onClick={toggleLeftSidebar}
                className="absolute top-1/2 right-0 transform -translate-y-1/2 bg-base-200 text-base-content 
        hover:bg-base-300 p-1 rounded-md border border-base-content/20 
        shadow-sm z-40"
                aria-label="Hide left sidebar"
            >
                <PanelLeftClose size={18} strokeWidth={1.5} />
            </button>
        )}

        {/* Sidebar Header */}
        <div className="sidebar-inner-header flex items-center justify-between gap-3 p-4 border-b border-base-content/10 bg-base-300">
          <div className="tabs tabs-boxed">
            <button
              className={`tab ${activeTab === "browse" ? "tab-active" : ""}`}
              onClick={() => setActiveTab("browse")}
            >
              Browse
            </button>
            <button
              className={`tab ${activeTab === "navigation" ? "tab-active" : ""}`}
              onClick={() => setActiveTab("navigation")}
            >
              Navigation
            </button>
          </div>
          {/* Mobile close button in header */}
          {isMobile && (
            <button
              onClick={toggleLeftSidebar}
              className="btn btn-sm btn-circle btn-ghost touch-manipulation shrink-0"
              aria-label="Close sidebar"
              style={{ touchAction: 'manipulation' }}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>

        <div className="flex-1 overflow-y-auto p-4 pb-24 max-h-[calc(100vh-220px)]">
          {activeTab === "browse" ? (
            <div className="space-y-4">
              {/* Search Section */}
              <div className="p-2 border border-base-content/10 bg-base-100 rounded-md">
                <div className="flex gap-2 items-center">
                  <input
                    ref={searchInputRef}
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Search..."
                    className="input input-bordered input-xs flex-1"
                    onKeyDown={e => { if (e.key === 'Enter') { router.push(`/search?term=${encodeURIComponent(searchTerm)}`) } }}
                  />
                  <button
                    className={`btn btn-primary btn-xs transition-all duration-200 ${searchHighlight ? "ring-2 ring-offset-1 ring-primary animate-pulse" : ""}`}
                    onClick={() => router.push(`/search?term=${encodeURIComponent(searchTerm)}`)}
                    aria-label="Search"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                  </button>
                </div>
              </div>

              {/* Filters Section */}
              {filters.length > 0 && (
                <div className="p-4 border border-base-content/10 rounded-md">
                  <h3 className="font-medium text-base-content mb-3">Filters</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                    {filters.map((filter, index) => (
                      <label key={index} className="label cursor-pointer justify-start">
                        <input
                          type="radio"
                          name="filter"
                          className="radio radio-primary radio-xs"
                          checked={activeFilter === filter.value}
                          onChange={() => setActiveFilter(filter.value)}
                        />
                        <span className="label-text text-xs ml-2">{filter.label}</span>
                      </label>
                    ))}
                  </div>
                </div>
              )}

              <div className="space-y-4">{renderContent()}</div>
            </div>
          ) : (
            <Navigation
              embedded
              title={null}
              subtitle={null}
              className="border-0 bg-transparent p-0 shadow-none"
            />
          )}
        </div>
      </aside>

      {/* Mobile Overlay */}
      {isMobile && isLeftSidebarVisible && (
        <div 
          className="fixed inset-0 bg-black/50 z-20 touch-manipulation" 
          onClick={toggleLeftSidebar}
          onTouchEnd={toggleLeftSidebar}
          style={{ touchAction: 'manipulation' }}
        />
      )}
    </>
  )
}
