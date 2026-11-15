import Head from "next/head"
import { useEffect, useMemo, useState } from "react"
import TagSEO from "@/components/TagSEO"
import VenueProfile from "@/components/venues/VenueProfile"
import config from "@/config"
import serverFetch from "@/libs/serverFetch"
import { fetchVenueForPage, splitVenueMedia } from "@/utils/venue-form"
import { buildVenueProfileView, selectVenueEvents, serializeJsonLd } from "@/utils/venue-page"

function normalizeSlug(value) {
  return String(value || "").trim().toLowerCase()
}

const SITE_URL = `https://${config.domainName}`

export default function VenueProfilePage({ venue, contacts, events }) {
  const [galleryState, setGalleryState] = useState({ loading: false, error: "", files: [] })

  const venueId = Number(venue?.venueID || venue?.VenueID || 0)
  const mediaPrefix = useMemo(() => (
    venueId > 0 ? `platformpics/venue/${venueId}/` : ""
  ), [venueId])

  useEffect(() => {
    if (!mediaPrefix) {
      return
    }

    let ignore = false

    const loadGallery = async () => {
      setGalleryState({ loading: true, error: "", files: [] })

      try {
        // The image list API returns one folder level at a time, so each media folder is listed on its own.
        const folders = ["profile/", "cover/", "gallery/"]
        const results = await Promise.all(folders.map(async (folder) => {
          const prefix = `${mediaPrefix}${folder}`
          const query = new URLSearchParams({ container: "tagpictures", startPrefix: mediaPrefix, prefix })
          const response = await fetch(`/api/image/list?${query.toString()}`)
          if (!response.ok) throw new Error(`Unable to load media (${response.status}).`)
          const data = await response.json()
          return Array.isArray(data?.files) ? data.files : []
        }))

        if (!ignore) {
          setGalleryState({ loading: false, error: "", files: results.flat() })
        }
      } catch (error) {
        if (!ignore) {
          setGalleryState({ loading: false, error: error?.message || "Failed to load media.", files: [] })
        }
      }
    }

    loadGallery()

    return () => {
      ignore = true
    }
  }, [mediaPrefix])

  // The newest file in a folder is the fallback for venues that have not chosen an active picture.
  const folderMedia = useMemo(() => splitVenueMedia(galleryState.files), [galleryState.files])
  const view = useMemo(() => buildVenueProfileView({ venue, contacts, events, folderMedia, siteUrl: SITE_URL }), [venue, contacts, events, folderMedia])
  // Search engines and link previews only get what the server knew, so the head does not change as the gallery loads.
  const headView = useMemo(() => buildVenueProfileView({ venue, contacts, events, siteUrl: SITE_URL }), [venue, contacts, events])

  const pageMetaData = {
    title: headView.seo.title,
    description: headView.seo.description,
    keywords: ["venue", "event space", ...headView.categories.map((category) => category.name), ...headView.tags].join(", "),
    robots: headView.isPublic ? "index, follow" : "noindex, nofollow",
    og: {
      title: headView.seo.title,
      description: headView.seo.description,
      type: "website",
      locale: "en_US",
      site_name: "Twisted Artists Guild",
      image: headView.seo.image || "/tag_logo.png",
      url: `${SITE_URL}/venue/${headView.slug}`,
    },
  }

  return (
    <>
      <TagSEO metadataProp={pageMetaData} canonicalSlug={`venue/${headView.slug}`} />
      {headView.jsonLd ? (
        <Head>
          <script key="venue-jsonld" type="application/ld+json" dangerouslySetInnerHTML={{ __html: serializeJsonLd(headView.jsonLd) }} />
        </Head>
      ) : null}
      <VenueProfile view={view} gallery={{ loading: galleryState.loading, error: galleryState.error }} />
    </>
  )
}

// A public call to the API. A failure only means that section is left out, never that the page fails.
async function fetchPublicJson(path) {
  try {
    const response = await serverFetch(path)
    return response.ok ? await response.json() : null
  } catch {
    return null
  }
}

export async function getServerSideProps(context) {
  const slug = normalizeSlug(context?.params?.slug)
  if (!slug) {
    return { notFound: true }
  }

  try {
    // The venue API needs the session token, and serverFetch returns a Response, not the venue itself.
    // A venue that is not published, or is blocked, is only returned to its owners and staff, so everyone else gets a 404.
    const venue = await fetchVenueForPage({ req: context.req, slug, fetchApi: serverFetch })
    if (!venue) {
      return { notFound: true }
    }

    const venueId = Number(venue?.venueID || venue?.VenueID || 0)
    const [contactData, eventData] = venueId > 0
      ? await Promise.all([
        fetchPublicJson(`/contact/venue/${venueId}`),
        fetchPublicJson(`/event?venueId=${venueId}&upcoming=true&limit=10`),
      ])
      : [null, null]

    // Only what the page shows is sent to the browser: the event list carries whole artist and venue records.
    const events = selectVenueEvents(eventData, venueId).map((event) => ({
      eventID: event?.eventID ?? event?.EventID ?? null,
      title: event?.title ?? event?.Title ?? "",
      startTime: event?.startTime ?? event?.StartTime ?? "",
      artist: { title: event?.artist?.title ?? event?.Artist?.Title ?? "" },
    }))

    return {
      props: {
        venue,
        contacts: Array.isArray(contactData?.contacts) ? contactData.contacts : [],
        events,
      },
    }
  } catch {
    return { notFound: true }
  }
}
