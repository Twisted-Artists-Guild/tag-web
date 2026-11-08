/* This file is part of the Twisted Artists Guild project.

 Copyright (C) 2025 Twisted Artists Guild

 Licensed under the GNU General Public License v3.0
 (https://www.gnu.org/licenses/gpl-3.0.en.html).

 This software comes with NO WARRANTY; see the license for details.

 Open source · low-profit · human-first*/

// Venues can exist without a website or phone, and the venue API replaces the whole record on save.
// These helpers keep missing IDs as null (never 0) and send the optional fields back unchanged.

export function toNullableId(value) {
  const parsed = Number(value)
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null
}

export function mapVenueOptionalFields(venueData) {
  const data = venueData || {}
  return {
    externalLinkID: toNullableId(data.externalLinkID ?? data.ExternalLinkID),
    phoneContactID: toNullableId(data.phoneContactID ?? data.PhoneContactID),
    description: String(data.descriptionRichtext ?? data.DescriptionRichtext ?? ""),
    eventSourceUrl: String(data.eventSourceUrl ?? data.EventSourceUrl ?? ""),
  }
}

export function buildVenueOptionalPayload(venueForm) {
  const form = venueForm || {}
  return {
    externalLinkID: toNullableId(form.externalLinkID),
    phoneContactID: toNullableId(form.phoneContactID),
    description: String(form.description || "").trim() || null,
    eventSourceUrl: String(form.eventSourceUrl || "").trim() || null,
  }
}

// Splits the files listed from a venue's media folders. The profile and cover pictures are the newest file
// directly inside their folder; files in nested folders are archived versions and are ignored for those two.
export function splitVenueMedia(files = []) {
  const items = Array.isArray(files) ? files : []
  const pathOf = (item) => String(item?.name || item?.url || "").toLowerCase()
  const directChildOf = (folder) => items.filter((item) => {
    const rest = pathOf(item).split(`/${folder}/`)[1]
    return rest !== undefined && rest.length > 0 && !rest.includes("/")
  })
  const newest = (list) => [...list].sort((left, right) => new Date(right?.lastModified || 0) - new Date(left?.lastModified || 0))[0]

  return {
    profile: newest(directChildOf("profile")),
    cover: newest(directChildOf("cover")),
    gallery: items.filter((item) => pathOf(item).includes("/gallery/")),
  }
}

// Same cookie names the /api proxy (proxy.js) reads to authenticate calls to the backend.
export function getSessionTokenFromRequest(req) {
  const cookies = req?.cookies || {}
  return cookies["__Secure-next-auth.session-token"] || cookies["next-auth.session-token"] || ""
}

// Loads a venue inside getServerSideProps. The venue API requires sign-in, so the session token is sent along.
// The numeric id is tried first because a slug is derived from the venue name and can drift from the URL.
export async function fetchVenueForPage({ req, id, slug, fetchApi }) {
  const token = getSessionTokenFromRequest(req)
  if (!token) return null

  const paths = []
  const numericId = Number(id)
  if (Number.isInteger(numericId) && numericId > 0) paths.push(`/venue/byID/${numericId}`)
  const normalizedSlug = String(slug || "").trim().toLowerCase()
  if (normalizedSlug) paths.push(`/venue/by-slug/${encodeURIComponent(normalizedSlug)}`)

  for (const path of paths) {
    try {
      const response = await fetchApi(path, { headers: { Authorization: `Bearer ${token}` } })
      if (response.ok) return await response.json()
    } catch {
      // Fall through to the next lookup.
    }
  }

  return null
}
