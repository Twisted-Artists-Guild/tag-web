import Link from "next/link"
import { useEffect, useMemo, useState } from "react"
import { sanitizeCardHtml, sanitizeDefaultHtml, stripHtmlText } from "@/components/security/sanitize"
import serverFetch from "@/libs/serverFetch"
import useEntityLogo from "@/components/cards/useEntityLogo"

function normalizeSlug(value) {
  return String(value || "").trim().toLowerCase()
}

function pickField(record, ...keys) {
  for (const key of keys) {
    const value = record?.[key]
    if (value !== undefined && value !== null) {
      return value
    }
  }

  return undefined
}

function splitMedia(files = []) {
  const items = Array.isArray(files) ? files : []
  const profile = items.find((item) => String(item?.name || item?.url || "").toLowerCase().includes("/profile/"))
  const cover = items.find((item) => String(item?.name || item?.url || "").toLowerCase().includes("/cover/"))
  const gallery = items.filter((item) => String(item?.name || item?.url || "").toLowerCase().includes("/gallery/"))

  return {
    profile,
    cover,
    gallery,
  }
}

export default function VendorProfilePage({ vendor }) {
  const [galleryState, setGalleryState] = useState({ loading: false, error: "", files: [] })

  const vendorId = Number(vendor?.vendorID || vendor?.VendorID || 0)
  const vendorName = String(vendor?.companyName || vendor?.CompanyName || "Vendor")
  const vendorNotes = String(vendor?.notesOnVendors || vendor?.NotesOnVendors || "")
  const contractNotes = String(vendor?.notesOnContracts || vendor?.NotesOnContracts || "")
  const vendorNameRichtext = pickField(vendor, "companyNameRichtext", "CompanyNameRichtext") || vendorName
  const vendorNotesRichtext = pickField(vendor, "notesOnVendorsRichtext", "NotesOnVendorsRichtext") || vendorNotes
  const contractNotesRichtext = pickField(vendor, "notesOnContractsRichtext", "NotesOnContractsRichtext") || contractNotes
  const activeLogoUrl = useEntityLogo({
    logoImage: vendor?.logoPic?.url || vendor?.logoPic?.URL || vendor?.logoPic?.normalizedURL || vendor?.logoPic?.NormalizedURL || vendor?.LogoPic?.url || vendor?.LogoPic?.URL || vendor?.LogoPic?.normalizedURL || vendor?.LogoPic?.NormalizedURL || "",
    entityType: "Vendor",
    entityId: vendorId,
  })
  const mediaPrefix = useMemo(() => (
    vendorId > 0 ? `platformpics/vendorcontent/${vendorId}/` : ""
  ), [vendorId])

  useEffect(() => {
    if (!mediaPrefix) {
      return
    }

    let ignore = false

    const loadGallery = async () => {
      setGalleryState({ loading: true, error: "", files: [] })

      try {
        const folders = [""]
        const results = await Promise.all(folders.map(async (folder) => {
          const prefix = `${mediaPrefix}${folder}`
          const query = new URLSearchParams({ container: "tagpictures", startPrefix: mediaPrefix, prefix })
          const response = await fetch(`/api/image/list?${query.toString()}`)
          if (!response.ok) throw new Error(`Unable to load media (${response.status}).`)
          const data = await response.json()
          return Array.isArray(data?.files) ? data.files : []
        }))
        const files = results.flat()

        if (!ignore) {
          setGalleryState({ loading: false, error: "", files })
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

  const { profile, cover, gallery } = useMemo(() => splitMedia(galleryState.files), [galleryState.files])

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 md:py-12 space-y-6">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex min-w-0 items-center gap-3">
          {activeLogoUrl ? <img src={activeLogoUrl} alt={`${vendorName} logo`} className="h-14 w-14 rounded-box border border-base-300 bg-base-100 object-contain p-1" /> : null}
          <h1
            className="text-3xl font-bold"
            dangerouslySetInnerHTML={{ __html: sanitizeCardHtml(vendorNameRichtext) }}
          />
        </div>
        <Link href="/search" className="btn btn-sm btn-outline">Back to Search</Link>
      </div>

      {cover?.url ? (
        <div className="rounded-box overflow-hidden border border-base-300 bg-base-200/40">
          <img src={cover.url} alt={`${vendorName} cover`} className="w-full h-56 md:h-72 object-cover" />
        </div>
      ) : null}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="rounded-box border border-base-300 bg-base-100 shadow p-4 space-y-3 lg:col-span-2">
          <h2 className="text-xl font-semibold">Vendor Profile</h2>
          <p className="text-sm text-base-content/70">This basic profile uses the same vendor API-backed fields configured during onboarding.</p>
          <div className="text-sm space-y-2">
            <div>
              <span className="font-semibold">Company:</span>{" "}
              <span dangerouslySetInnerHTML={{ __html: sanitizeCardHtml(vendorNameRichtext) }} />
            </div>
            <div><span className="font-semibold">POC:</span> {vendor?.pocName || vendor?.POCName || "Not listed"}</div>
            <div><span className="font-semibold">POC Email:</span> {vendor?.pocEmail || vendor?.POCEmail || "Not listed"}</div>
            <div><span className="font-semibold">POC Phone:</span> {vendor?.pocPhone || vendor?.POCPhone || "Not listed"}</div>
            <div><span className="font-semibold">Contract Link:</span> {vendor?.linkToContract || vendor?.LinkToContract || "Not listed"}</div>
          </div>
          {vendorNotesRichtext ? (
            <div
              className="text-sm"
              dangerouslySetInnerHTML={{ __html: sanitizeDefaultHtml(vendorNotesRichtext) }}
            />
          ) : null}
          {contractNotesRichtext ? (
            <div
              className="text-sm text-base-content/70"
              dangerouslySetInnerHTML={{ __html: sanitizeDefaultHtml(contractNotesRichtext) }}
            />
          ) : null}
        </div>

        <div className="rounded-box border border-base-300 bg-base-100 shadow p-4">
          <h3 className="font-semibold mb-3">Profile Image</h3>
          <img
            src={profile?.url || "/blank_image.png"}
            alt={`${stripHtmlText(vendorNameRichtext || vendorName)} profile`}
            className="w-full h-56 object-cover rounded-box border border-base-300"
          />
        </div>
      </div>

      <div className="rounded-box border border-base-300 bg-base-100 shadow p-4 space-y-3">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <h2 className="text-xl font-semibold">Gallery</h2>
          <span className="text-xs text-base-content/60">Root: {mediaPrefix || "Unavailable"}</span>
        </div>

        {galleryState.loading ? <div className="text-sm text-base-content/70">Loading gallery...</div> : null}
        {galleryState.error ? <div className="alert alert-error"><span>{galleryState.error}</span></div> : null}

        {!galleryState.loading && gallery.length === 0 ? (
          <div className="text-sm text-base-content/70">No gallery items yet.</div>
        ) : null}

        {gallery.length > 0 ? (
          <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-3">
            {gallery.map((item) => (
              <div key={item.url} className="rounded-box overflow-hidden border border-base-300 bg-base-200/40">
                <img src={item.url} alt={item.name || "vendor gallery item"} className="w-full h-36 object-cover" />
              </div>
            ))}
          </div>
        ) : null}
      </div>
    </div>
  )
}

export async function  getServerSideProps(context) {
  const slug = normalizeSlug(context?.params?.slug)
  if (!slug) {
    return { notFound: true }
  }

  try {
    const vendor = await serverFetch(`/vendor/by-slug/${encodeURIComponent(slug)}`)
    if (!vendor) {
      return { notFound: true }
    }

    return {
      props: {
        vendor,
      },
    }
  } catch {
    return { notFound: true }
  }
}
