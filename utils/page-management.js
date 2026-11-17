import { hasPermission, isAdmin, isStaff } from "./authHelpers.js"
import { PERMISSIONS } from "./permissions.js"

const editableTypes = ["artist", "listing", "blog", "vendor", "venue"]

function positiveId(value) {
  const id = Number(value)
  return Number.isSafeInteger(id) && id > 0 ? id : null
}

function sameId(left, right) {
  return positiveId(left) !== null && positiveId(left) === positiveId(right)
}

export function getPageManagementTarget(entityType, entity = {}, slug = "", artistSlug = "") {
  const titleCase = entityType.charAt(0).toUpperCase() + entityType.slice(1)
  const id = positiveId(entity[`${entityType}ID`] ?? entity[`${titleCase}ID`] ?? entity[`${entityType}id`] ?? entity.id)
  const path = encodeURIComponent(slug || entity.path || entity.Path || "")
  const artist = entity.artist || entity.Artist || {}
  const owner = entityType === "listing" ? artist : entity
  const ownerUserId = owner.userId ?? owner.userID ?? owner.UserID
  const ownerArtistId = entityType === "listing"
    ? positiveId(entity.artistID ?? entity.ArtistID ?? artist.artistID ?? artist.ArtistID)
    : entityType === "artist" ? id : null
  const parentPath = encodeURIComponent(artistSlug || artist.path || artist.Path || "")
  const editHref = {
    artist: path ? `/portal/artist/${path}/edit` : null,
    listing: parentPath && id ? `/portal/artist/${parentPath}/listing/update/${id}` : null,
    blog: id ? `/portal/staff/tagblog/${id}/update` : null,
    vendor: path && id ? `/portal/vendor/${path}/edit?step=2&id=${id}` : null,
    venue: path && id ? `/portal/venue/${path}/edit?step=2&id=${id}` : null,
  }[entityType] || null

  return { entityType, id, ownerUserId, ownerArtistId, editHref }
}

export function getPageManagementAccess(session, target, isOwner = false) {
  if (session?.user?.id && target.entityType === "blog" && target.isIndex) {
    return {
      canEdit: false,
      canModerate: false,
      canManageContests: false,
      needsReason: false,
      canCreateBlog: isAdmin(session) || isStaff(session) || !!session.user.roles?.includes("author"),
    }
  }
  if (!session?.user?.id || !target.id) {
    return { canEdit: false, canModerate: false, canManageContests: false, needsReason: false }
  }

  const admin = isAdmin(session)
  const staff = isStaff(session)
  const blogPermission = target.entityType === "blog" && hasPermission(session, PERMISSIONS.BLOG.UPDATE)
  const canEdit = editableTypes.includes(target.entityType) && (isOwner || admin || blogPermission)

  return {
    canEdit,
    canModerate: staff || admin || !!session.user.roles?.includes("moderator"),
    canManageContests: target.entityType === "contest" && (staff || admin),
    needsReason: canEdit && admin && !isOwner && !blogPermission,
  }
}

export function getPageManagementRelationship(session, target, isOwner = false) {
  if (isOwner) {
    return {
      artist: "Artist Owner",
      listing: "Artist Owner",
      blog: "Blog Owner",
      vendor: "Vendor Owner",
      venue: "Venue Owner",
    }[target.entityType] || "Owner"
  }
  if (isAdmin(session)) return "Admin"
  if (target.entityType === "blog" && target.isIndex && session?.user?.roles?.includes("author")) return "Blog Author"
  if (target.entityType === "blog" && hasPermission(session, PERMISSIONS.BLOG.UPDATE)) return "Blog Editor"
  if (isStaff(session)) return "Staff / Content Moderator"
  if (session?.user?.roles?.includes("moderator")) return "Content Moderator"
  return "No management access"
}

export async function resolvePageOwnership(target, userId, fetchFn = fetch) {
  if (!positiveId(userId) || !target.id) return false
  if (sameId(target.ownerUserId, userId)) return true

  let url
  if (target.ownerArtistId) {
    url = `/api/linker_usertoartist/byUserID/${encodeURIComponent(userId)}`
  } else if (target.entityType === "venue") {
    url = `/api/venue/${target.id}/access`
  } else if (target.entityType === "vendor") {
    url = "/api/linker_vendortouser"
  } else {
    return false
  }

  const response = await fetchFn(url)
  if (!response.ok) throw new Error(`Unable to check page ownership (${response.status}).`)
  const data = await response.json()

  if (target.entityType === "venue") return data?.isOwner === true
  if (!Array.isArray(data)) throw new Error("Unable to check page ownership: invalid response.")
  if (target.entityType === "vendor") {
    return data.some((row) =>
      sameId(row.userID ?? row.UserID, userId) && sameId(row.vendorID ?? row.VendorID, target.id))
  }
  return data.some((artist) => sameId(artist.artistID ?? artist.ArtistID, target.ownerArtistId))
}

export function getModerationPageContext(query) {
  const targetTypes = ["Artist", "Listing", "Blog", "Vendor", "Venue", "Contest"]
  const targetType = targetTypes.includes(query.targetType) ? query.targetType : ""
  const targetId = positiveId(query.targetId)
  const targetUrl = typeof query.targetUrl === "string" && query.targetUrl.startsWith("/")
    && !query.targetUrl.startsWith("//") && !query.targetUrl.includes("\\") ? query.targetUrl : ""
  return targetType && targetId ? { targetType, targetId, targetUrl } : null
}
