/* This file is part of the Twisted Artists Guild project.

 Copyright (C) 2025 Twisted Artists Guild

 Licensed under the GNU General Public License v3.0
 (https://www.gnu.org/licenses/gpl-3.0.en.html).

 This software comes with NO WARRANTY; see the license for details.

 Open source · low-profit · human-first*/
import { useEffect, useMemo, useRef, useState } from "react"
import { useRouter } from "next/router"
import TagSEO from "@/components/TagSEO"
import VenueCard from "@/components/venues/VenueCard"
import VenueFilters from "@/components/venues/VenueFilters"
import serverFetch from "@/libs/serverFetch"
import { getApiErrorMessage } from "@/utils/venue-form"
import {
  appendVenuePage,
  buildApiQuery,
  buildPageQuery,
  describeResults,
  hasActiveFilters,
  parseVenueListQuery,
} from "@/utils/venue-list"

const LIST_API = "/api/venue/list"

async function fetchVenuePage(filters, cursor) {
  let response
  try {
    response = await fetch(`${LIST_API}?${buildApiQuery(filters, { cursor })}`)
  } catch {
    throw new Error("Could not reach the server. Check your connection and try again.")
  }
  if (!response.ok) throw new Error(getApiErrorMessage(await response.text(), response.status, "load venues"))
  const data = await response.json()
  return { items: Array.isArray(data?.items) ? data.items : [], nextCursor: data?.nextCursor ?? null }
}

export default function VenuesPage({ initialPage }) {
  const router = useRouter()

  // The address bar is the source of truth for the filters, so a reload, a shared link and the Back button all agree.
  const queryKey = JSON.stringify(parseVenueListQuery(router.query))
  const filters = useMemo(() => JSON.parse(queryKey), [queryKey])

  const [items, setItems] = useState(initialPage?.items || [])
  const [nextCursor, setNextCursor] = useState(initialPage?.nextCursor ?? null)
  const [status, setStatus] = useState(initialPage ? "ready" : "loading")
  const [error, setError] = useState("")
  const [isLoadingMore, setIsLoadingMore] = useState(false)
  const [moreError, setMoreError] = useState("")
  const [retryKey, setRetryKey] = useState(0)

  // The first page can arrive with the page itself. It is only used for the address it was fetched for.
  const servedKey = useRef(initialPage ? queryKey : null)
  const requestId = useRef(0)

  useEffect(() => {
    if (servedKey.current === queryKey) {
      servedKey.current = null
      return undefined
    }

    servedKey.current = null
    const current = ++requestId.current
    let ignore = false

    const loadFirstPage = async () => {
      setStatus("loading")
      setError("")
      setMoreError("")
      try {
        const page = await fetchVenuePage(filters, "")
        if (ignore || requestId.current !== current) return
        setItems(page.items)
        setNextCursor(page.nextCursor)
        setStatus("ready")
      } catch (loadError) {
        if (ignore || requestId.current !== current) return
        setItems([])
        setNextCursor(null)
        setError(loadError.message || "Unable to load venues.")
        setStatus("error")
      }
    }

    loadFirstPage()
    return () => { ignore = true }
  }, [queryKey, filters, retryKey])

  const loadMore = async () => {
    if (!nextCursor || isLoadingMore) return
    const current = requestId.current
    setIsLoadingMore(true)
    setMoreError("")
    try {
      const page = await fetchVenuePage(filters, nextCursor)
      if (requestId.current !== current) return
      setItems((existing) => appendVenuePage(existing, page))
      setNextCursor(page.nextCursor)
    } catch (loadError) {
      if (requestId.current === current) setMoreError(loadError.message || "Unable to load more venues.")
    } finally {
      setIsLoadingMore(false)
    }
  }

  const search = (nextFilters) => router.push({ pathname: "/venues", query: buildPageQuery(nextFilters) }, undefined, { shallow: true })
  const clear = () => router.push({ pathname: "/venues" }, undefined, { shallow: true })
  const filtersAreSet = hasActiveFilters(filters)

  const pageMetaData = {
    title: "Venues",
    description: "Browse venues on the Twisted Artists Guild. Search by name, category, amenities, region and location to find the right space for your event.",
    keywords: "venues, event spaces, theaters, galleries, studios, find a venue",
    robots: "index, follow",
    og: {
      title: "Venues | Twisted Artists Guild",
      description: "Find the right space for your event.",
    },
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 md:py-12">
      <TagSEO metadataProp={pageMetaData} canonicalSlug="venues" />

      <header className="mb-6 space-y-2">
        <h1 className="text-3xl font-bold">Venues</h1>
        <p className="max-w-3xl text-base-content/75">
          Browse spaces for your next event. Search by name, narrow by category, amenities, region or location, and open a venue to learn more.
        </p>
      </header>

      <div className="grid gap-6 lg:grid-cols-[22rem_minmax(0,1fr)]">
        <aside aria-label="Search and filters">
          <div className="card bg-base-100 border border-base-300 shadow-sm">
            <div className="card-body">
              <VenueFilters filters={filters} onSearch={search} onClear={clear} hasFilters={filtersAreSet} isBusy={status === "loading"} />
            </div>
          </div>
        </aside>

        <section aria-labelledby="venue-results-heading" aria-busy={status === "loading"}>
          <h2 id="venue-results-heading" className="sr-only">Results</h2>
          <p role="status" aria-live="polite" className="mb-3 min-h-6 text-sm text-base-content/70">
            {status === "ready" ? describeResults(items.length, Boolean(nextCursor)) : ""}
          </p>

          {status === "loading" ? (
            <div className="flex items-center justify-center gap-3 py-16" role="status">
              <span className="loading loading-spinner loading-md" aria-hidden="true" />
              <span>Loading venues...</span>
            </div>
          ) : null}

          {status === "error" ? (
            <div role="alert" className="alert alert-error flex-wrap">
              <span>{error}</span>
              <button type="button" className="btn btn-sm" onClick={() => setRetryKey((key) => key + 1)}>Try again</button>
            </div>
          ) : null}

          {status === "ready" && items.length === 0 ? (
            <div className="rounded-box border border-base-300 bg-base-100 p-8 text-center space-y-3">
              <p className="text-lg font-semibold">{filtersAreSet ? "No venues match your search." : "No venues are listed yet."}</p>
              {filtersAreSet ? (
                <>
                  <p className="text-base-content/70">Try fewer filters or a different spelling.</p>
                  <button type="button" className="btn btn-outline" onClick={clear}>Clear filters</button>
                </>
              ) : null}
            </div>
          ) : null}

          {status === "ready" && items.length > 0 ? (
            <>
              <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3" aria-label="Venues">
                {items.map((venue) => (
                  <li key={venue.venueID}><VenueCard venue={venue} /></li>
                ))}
              </ul>

              {moreError ? (
                <div role="alert" className="alert alert-error mt-4 flex-wrap">
                  <span>{moreError}</span>
                </div>
              ) : null}

              {nextCursor ? (
                <div className="mt-6 flex justify-center">
                  <button type="button" className="btn btn-outline" onClick={loadMore} disabled={isLoadingMore} aria-busy={isLoadingMore}>
                    {isLoadingMore ? "Loading..." : moreError ? "Try again" : "Load more venues"}
                  </button>
                </div>
              ) : null}
            </>
          ) : null}
        </section>
      </div>
    </div>
  )
}

// The first page is fetched on the server so the list is in the page that search engines and slow connections get.
// If the API can't be reached here, the page still loads and fetches the list in the browser instead.
export async function getServerSideProps(context) {
  const filters = parseVenueListQuery(context.query)

  try {
    const response = await serverFetch(`/venue/list?${buildApiQuery(filters)}`)
    if (response.ok) {
      const data = await response.json()
      return {
        props: {
          initialPage: {
            items: Array.isArray(data?.items) ? data.items : [],
            nextCursor: data?.nextCursor ?? null,
          },
        },
      }
    }
  } catch {
    // Fall through to the browser fetch.
  }

  return { props: { initialPage: null } }
}
