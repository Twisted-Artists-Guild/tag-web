/* This file is part of the Twisted Artists Guild project.
 Copyright (C) 2025 Twisted Artists Guild
 Licensed under the GNU General Public License v3.0
 (https://www.gnu.org/licenses/gpl-3.0.en.html).
 This software comes with NO WARRANTY; see the license for details.
 Open source - low-profit - human-first */
 
import Image from "next/image"
import Link from "next/link"
import { useEffect, useState } from "react"
import TagSEO from "@/components/TagSEO"
import longDateOptions from "@/utils/longdateoptions"
import ListingCardSmall from "@/components/cards/card_listing_small"
import serverFetch from "@/libs/serverFetch"
import PageManagementPanel from "@/components/page-management-panel"

function ContestView(props) {
  const [contestState, setContestState] = useState(props.contest || {})
  const [loading, setLoading] = useState(!props.contest || Object.keys(props.contest || {}).length === 0)
  const [error, setError] = useState(null)

  const slug = props.slug || (props.contest && props.contest.path) || ""
  const canonicalSlug = `contests/${contestState.path || slug || ""}`

  useEffect(() => {
    if (contestState && (contestState.title || contestState.id)) {
      setLoading(false)
      return
    }

    if (!slug) {
      setLoading(false)
      return
    }

    let mounted = true
    const fetchContest = async () => {
      setLoading(true)
      try {
        if (process.env.DEBUG === "true") {
          console.log(`Client fetching contest: $/api/contest/slug/${slug}`)
        }
        const res = await fetch(`/api/contest/slug/${slug}`)
        if (!res.ok) throw new Error(`Contest fetch failed: ${res.status}`)
          const data = await res.json()
          
        const contestData = Array.isArray(data) ? data[0] : data || {}

        const entries =
          Array.isArray(contestData.entries) && contestData.entries.length > 0
            ? contestData.entries
            : Array.isArray(contestData.listings) && contestData.listings.length > 0
            ? contestData.listings
            : Array.isArray(contestData.participating) && contestData.participating.length > 0
            ? contestData.participating
            : []

        if (mounted) {
          setContestState({
            ...contestData,
            entries,
            startDate: contestData.startDate || contestData.starts || contestData.created || null,
            endDate: contestData.endDate || contestData.ends || contestData.closed || contestData.deadline || null,
          })
        }
      } catch (e) {
        console.error("Failed to fetch contest (client)", e)
        if (mounted) setError(e)
      } finally {
        if (mounted) setLoading(false)
      }
    }

    fetchContest()
    return () => {
      mounted = false
    }
  }, [slug, contestState])

  const contest = contestState || {}

  const parseDate = (v) => {
    if (!v) return null
    const d = new Date(v)
    return Number.isNaN(d.getTime()) ? null : d
  }

  const startDate = parseDate(contest.startDate || contest.starts || contest.created || contest.opened)
  const warmupEndDate = parseDate(contest.warmupEndDate);
  const endDate = parseDate(contest.endDate || contest.ends || contest.closed || contest.deadline)
  const now = new Date()
  const hasEnded = endDate ? endDate < now : false
  const isActive = !hasEnded && (!startDate || startDate <= now)
  const isUpcoming = isActive && warmupEndDate > now;

  const entries = Array.isArray(contest.entries) ? contest.entries : []

  const pageMetaData = {
    title: contest.title || "Contest",
    description: contest.byline || contest.description || contest.summary || `Contest: ${contest.title || ""}`,
    keywords: `contest, art contest, ${contest.title || ""}`,
    og: {
      title: contest.title || "Contest",
      description: contest.byline || contest.description || contest.summary || "",
      image: contest.coverPicUrl || "",
    },
  }
    
  return (
    <div className="min-h-screen bg-base-100 text-base-content">
      <TagSEO metadataProp={pageMetaData} canonicalSlug={canonicalSlug} />
      <div className="container mx-auto px-4">
        <PageManagementPanel entityType="contest" entity={contest} slug={slug} />
      </div>

      <header className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
          <div className="lg:col-span-2">
            <h1 className="text-4xl md:text-5xl font-extrabold text-primary mb-3" dangerouslySetInnerHTML={{ __html: contest.title || (loading ? "Loading..." : "Contest") }}></h1>
            {contest.byline && <p className="text-lg text-secondary mb-4">{contest.byline}</p>}

                      <div className="prose max-w-none mb-6" suppressHydrationWarning>
              <p dangerouslySetInnerHTML={{ __html: contest.description || contest.summary || "" }} />
            </div>

            <div className="space-y-3">
              {contest.guidelines && (
                <div className="rounded-box border border-base-300 bg-base-100/70 p-4">
                  <h3 className="text-lg font-semibold text-primary mb-2">Guidelines</h3>
                  <div dangerouslySetInnerHTML={{ __html: contest.guidelines }} />
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {contest.prompt && (
                  <div className="rounded-box border border-base-300 bg-base-100/60 p-4">
                    <h4 className="text-sm font-semibold text-secondary uppercase tracking-wide">Prompt</h4>
                    <p className="mt-2 text-base-content">{contest.prompt}</p>
                  </div>
                )}

                <div className="rounded-box border border-base-300 bg-base-100/60 p-4 flex flex-col justify-between">
                  <div>
                    <h4 className="text-sm font-semibold text-secondary uppercase tracking-wide">Period</h4>
                    <p className="mt-2 text-base-content">
                      {startDate ? new Date(startDate).toLocaleDateString("en-US", longDateOptions) : "Start date: TBD"}
                      {" - "}
                      {endDate ? new Date(endDate).toLocaleDateString("en-US", longDateOptions) : "End date: TBD"}
                    </p>
                  </div>

                  <div className="mt-4">
                    {hasEnded ? (
                      <span className="badge badge-error badge-lg">Contest Ended</span>
                    ) : isActive && !isUpcoming ? (
                      <span className="badge badge-success badge-lg">Open - Accepting Entries</span>
                    ) : (
                      <span className="badge badge-info badge-lg">Upcoming</span>
                    )}
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-6">
              {isActive && !isUpcoming && (
                <Link
                  href={`/contests/${slug}/enter`}
                  className="btn btn-primary btn-lg"
                >
                  Enter to Participate
                </Link>
              )}
            </div>
          </div>

          <aside className="lg:col-span-1">
            <div className="rounded-box overflow-hidden border border-base-300 bg-base-100 shadow-md">
              <div className="relative h-64 w-full">
                <Image
                  src={contest.coverPicUrl || "/placeholder.svg"}
                  alt={contest.title || "Contest cover"}
                  fill
                  style={{ objectFit: "cover" }}
                />
              </div>              
            </div>
          </aside>
        </div>
      </header>
      {isActive && !isUpcoming && (
              <main className="container mx-auto px-4 pb-12">
                  <section className="mb-8">
                      <div className="flex items-center justify-between mb-4">
                          <h2 className="text-2xl font-bold text-primary">Participating Entries</h2>
                          <p className="text-sm text-base-content/70">{entries.length} entries</p>
                      </div>

                      {loading ? (
                          <div className="rounded-box border border-base-300 bg-base-100/60 p-6 text-center text-base-content/70">
                              Loading contest entries...
                          </div>
                      ) : error ? (
                          <div className="rounded-box border border-error bg-error/5 p-6 text-center text-error">
                              There was an error loading contest data.
                          </div>
                      ) : entries.length === 0 ? (
                          <div className="rounded-box border border-base-300 bg-base-100/60 p-6 text-center text-base-content/70">
                              No entries have been submitted yet.
                          </div>
                      ) : (
                          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                              {entries.map((entry) => (
                                  <ListingCardSmall key={entry.listing?.listingid} listing={entry.listing} artist={entry.artist} />
                              ))}
                          </div>
                      )}
                  </section>
              </main>
      )}
    </div>
  )
}

ContestView.getInitialProps = async function (context) {
  const { slug } = context.query

  try {
    const res = await serverFetch(`/contest/slug/${slug}`)
    const data = await res.json()
    const contestData = Array.isArray(data) ? data[0] : data || {}

    const formattedStart = contestData.startDate || contestData.starts || contestData.created || null
    const formattedEnd = contestData.endDate || contestData.ends || contestData.closed || contestData.deadline || null

    const entries =
      Array.isArray(contestData.entries) && contestData.entries.length > 0
        ? contestData.entries
        : Array.isArray(contestData.listings) && contestData.listings.length > 0
        ? contestData.listings
        : Array.isArray(contestData.participating) && contestData.participating.length > 0
        ? contestData.participating
        : []

    return {
      contest: {
        ...contestData,
        startDate: formattedStart,
        endDate: formattedEnd,
        entries,
      },
      slug,
    }
  } catch (e) {
    if (process.env.DEBUG === "true") {
      console.error("Failed to fetch contest", e)
    }
    return { contest: {}, slug }
  }
}

export default ContestView