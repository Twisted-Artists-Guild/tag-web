import { fetchVenueAccess, getSessionTokenFromRequest } from './venue-form.js'

// What a venue may store as media. Venue pictures are shown to the public, so only common web image types are accepted
// (no SVG, which can carry scripts) and the limits are checked on the server as well as in the browser.
export const VENUE_IMAGE_EXTENSIONS = ['jpg', 'jpeg', 'png', 'gif', 'webp']
export const VENUE_IMAGE_MAX_BYTES = 10 * 1024 * 1024
export const VENUE_LOGO_MAX_BYTES = 5 * 1024 * 1024
export const VENUE_MEDIA_FOLDERS = ['profile', 'cover', 'logo', 'gallery']

const MIME_BY_EXTENSION = {
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  png: 'image/png',
  gif: 'image/gif',
  webp: 'image/webp',
}

const MEDIA_ROOT = /^platformpics\/venue\/(\d+)(?:\/([^/]+))?(?:\/|$)/i

function normalizeBlobPath(value) {
  return String(value || '').trim().replace(/\\/g, '/').replace(/\/{2,}/g, '/').replace(/^\//, '')
}

// Which venue a blob belongs to. Blob names look like platformpics/venue/12/profile/photo.jpg. The same files can also be
// reached as the container "platformpics", whose names have no platformpics/ in front. Returns null for anything else.
export function getVenueMediaTarget(blobName, container = 'tagpictures') {
  const path = normalizeBlobPath(blobName)
  const fullPath = String(container || '').toLowerCase() === 'platformpics' ? `platformpics/${path}` : path
  const match = MEDIA_ROOT.exec(fullPath)
  if (!match) return null

  const venueId = Number(match[1])
  if (!Number.isInteger(venueId) || venueId <= 0) return null

  const folder = String(match[2] || '').toLowerCase()
  return { venueId, folder: VENUE_MEDIA_FOLDERS.includes(folder) ? folder : null }
}

// A blob name from a full blob URL (https://account.blob.core.windows.net/tagpictures/platformpics/venue/12/cover/a.jpg).
export function blobNameFromUrl(imageUrl, container = 'tagpictures') {
  const marker = `/${container}/`
  const text = String(imageUrl || '').split(/[?#]/)[0]
  const index = text.indexOf(marker)
  if (index < 0) return ''
  try {
    return decodeURIComponent(text.slice(index + marker.length))
  } catch {
    return text.slice(index + marker.length)
  }
}

export function getFileExtension(name) {
  const base = String(name || '').split(/[\\/]/).pop()
  const dot = base.lastIndexOf('.')
  return dot > 0 ? base.slice(dot + 1).toLowerCase() : ''
}

export function isAllowedVenueImageName(name) {
  return VENUE_IMAGE_EXTENSIONS.includes(getFileExtension(name))
}

export function getVenueImageMaxBytes(folder) {
  return folder === 'logo' ? VENUE_LOGO_MAX_BYTES : VENUE_IMAGE_MAX_BYTES
}

function formatMegabytes(bytes) {
  return `${(bytes / (1024 * 1024)).toFixed(1).replace(/\.0$/, '')} MB`
}

// The image type a file really is, from its first bytes, or '' when it is not one of the accepted types.
export function sniffImageType(bytes) {
  const b = bytes || []
  const at = (index) => b[index]
  const text = (start, end) => String.fromCharCode(...Array.from(b).slice(start, end))
  if (b.length >= 3 && at(0) === 0xff && at(1) === 0xd8 && at(2) === 0xff) return 'image/jpeg'
  if (b.length >= 8 && at(0) === 0x89 && text(1, 4) === 'PNG' && at(4) === 0x0d && at(5) === 0x0a && at(6) === 0x1a && at(7) === 0x0a) return 'image/png'
  if (b.length >= 6 && (text(0, 6) === 'GIF87a' || text(0, 6) === 'GIF89a')) return 'image/gif'
  if (b.length >= 12 && text(0, 4) === 'RIFF' && text(8, 12) === 'WEBP') return 'image/webp'
  return ''
}

// Checks an image before it is uploaded to a venue folder. Returns an error message a person can read, or null when it is fine.
// `header` is the first bytes of the file when they are available (the server has them; the browser check skips this).
export function validateVenueImage({ name, type, size, folder, header } = {}) {
  const label = String(name || 'This file')
  const extension = getFileExtension(name)
  const allowed = 'Use a JPG, PNG, GIF or WebP image.'

  if (!VENUE_IMAGE_EXTENSIONS.includes(extension)) return `${label} is not a supported image type. ${allowed}`

  const reportedType = String(type || '').toLowerCase()
  if (reportedType && reportedType !== 'image/jpg' && reportedType !== MIME_BY_EXTENSION[extension]) {
    return `${label} does not look like a ${extension.toUpperCase()} image. ${allowed}`
  }

  const bytes = Number(size)
  if (!Number.isFinite(bytes) || bytes <= 0) return `${label} is empty.`
  const max = getVenueImageMaxBytes(folder)
  if (bytes > max) return `${label} is too large (${formatMegabytes(bytes)}). ${folder === 'logo' ? 'Logos' : 'Images'} can be up to ${formatMegabytes(max)}.`

  if (header !== undefined) {
    const sniffed = sniffImageType(header)
    if (!sniffed || sniffed !== MIME_BY_EXTENSION[extension]) return `${label} is not a valid ${extension.toUpperCase()} image. ${allowed}`
  }

  return null
}

// Decides whether the caller may change venue media. Anything that touches a venue's folder needs the venue's owner or
// staff, as the venue API says; blobs that are not venue media are not decided here. Returns { ok } or { ok: false, status, error }.
export async function authorizeVenueMediaChange({ req, blobNames, container = 'tagpictures', fetchApi }) {
  const venueIds = [...new Set((blobNames || []).map((name) => getVenueMediaTarget(name, container)).filter(Boolean).map((target) => target.venueId))]
  if (venueIds.length === 0) return { ok: true, venueIds }

  if (!getSessionTokenFromRequest(req)) return { ok: false, status: 401, error: 'Sign in to change venue media.' }

  for (const id of venueIds) {
    const access = await fetchVenueAccess({ req, id, fetchApi })
    if (access?.canManage !== true) return { ok: false, status: 403, error: "Only the venue's owners and staff can change its media." }
  }

  return { ok: true, venueIds }
}
