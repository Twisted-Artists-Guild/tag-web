import { useEffect, useMemo, useState } from "react"
import { useRouter } from "next/router"
import { useSession } from "next-auth/react"
import EntityContextNav from "@/components/portal/EntityContextNav"
import { stripHtmlText } from "@/components/security/sanitize"

export default function ArtistContextNav() {
  const router = useRouter()
  const { data: session } = useSession()
  const [linkedArtists, setLinkedArtists] = useState([])
  const [selectedSlug, setSelectedSlug] = useState("")

  // Sync selectedSlug from URL when navigating into a slug-scoped page
  useEffect(() => {
    const urlSlug = String(router.query?.slug || "").trim()
    if (urlSlug) {
      setSelectedSlug(urlSlug)
    }
  }, [router.query?.slug])

  // Fetch linked artists and default-select the first
  useEffect(() => {
    const userId = Number(session?.user?.id || 0)
    if (userId <= 0) return

    let cancelled = false

    fetch(`/api/linker_usertoartist/byUserID/${userId}`)
      .then((r) => (r.ok ? r.json() : []))
      .then((data) => {
        if (cancelled) return
        const artists = Array.isArray(data) ? data : []
        setLinkedArtists(artists)
        setSelectedSlug((prev) => {
          if (prev) return prev
          return stripHtmlText(String(artists[0]?.path ?? artists[0]?.Path ?? ""))
        })
      })
      .catch(() => {
        if (!cancelled) setLinkedArtists([])
      })

    return () => {
      cancelled = true
    }
  }, [session?.user?.id])

  const items = useMemo(() => {
    const slug = selectedSlug
    return [
      {
        key: "artist-home",
        label: "Artist Home",
        href: "/portal/artist",
        purpose: "Overview page for artist-linked entities.",
      },
      {
        key: "artist-slug",
        label: "Artist Workspace",
        href: slug ? `/portal/artist/${slug}` : "",
        purpose: "Open slug-scoped artist workspace.",
        disabled: !slug,
      },
      {
        key: "artist-edit",
        label: "Edit Profile",
        href: slug ? `/portal/artist/${slug}/edit` : "",
        purpose: "Manage artist profile, contacts, and media in one place.",
        disabled: !slug,
      },
      {
        key: "artist-create-listing",
        label: "Art Listing Management",
        href: slug ? `/portal/artist/${slug}/listing/create` : "",
        purpose: "Create and manage art listings inside this artist workspace.",
        disabled: !slug,
      },
    ]
  }, [selectedSlug])

  const artistPickerContent = useMemo(() => {
    if (linkedArtists.length === 0) return null
    return (
      <select
        className="select select-sm select-bordered max-w-xs"
        value={selectedSlug}
        onChange={(e) => {
          const newSlug = e.target.value
          setSelectedSlug(newSlug)
          if (newSlug) {
            router.push(`/portal/artist/${newSlug}`)
          }
        }}
      >
        {linkedArtists.map((artist) => {
          const path = stripHtmlText(String(artist?.path ?? artist?.Path ?? ""))
          const title = stripHtmlText(String(artist?.title ?? artist?.Title ?? path))
          return (
            <option key={path} value={path}>
              {title}
            </option>
          )
        })}
      </select>
    )
  }, [linkedArtists, router, selectedSlug])

  return (
    <EntityContextNav
      title="Artist Context"
      items={items}
      showEntitySwitcher
      defaultEntityHref="/portal/artist"
      titleSideContent={artistPickerContent}
    />
  )
}
