/* This file is part of the Twisted Artists Guild project.

 Copyright (C) 2025 Twisted Artists Guild

 Licensed under the GNU General Public License v3.0
 (https://www.gnu.org/licenses/gpl-3.0.en.html).

 This software comes with NO WARRANTY; see the license for details.

 Open source · low-profit · human-first*/

import { useEffect, useState } from 'react'

const SUPPORTED_ENTITY_TYPES = new Set(['user', 'artist', 'listing'])
const SUPPORTED_IMAGE_KINDS = new Set(['profile', 'cover'])
const imageCache = new Map()
const resolvedImages = new Map()

function buildCacheKey(entityType, entityId, imageKind = 'profile') {
  const type = String(entityType || '').toLowerCase()
  const id = Number(entityId)
  if (!SUPPORTED_ENTITY_TYPES.has(type) || !Number.isInteger(id) || id <= 0 || !SUPPORTED_IMAGE_KINDS.has(imageKind)) return null
  return `${type}/${id}/${imageKind}`
}

/**
 * Resolves an active profile or cover picture from blob storage,
 * using the newest file in the selected folder.
 * Results are cached per entity for the lifetime of the page.
 */
export function fetchEntityImage(entityType, entityId, imageKind = 'profile') {
  const key = buildCacheKey(entityType, entityId, imageKind)
  if (!key) return Promise.resolve('')

  if (!imageCache.has(key)) {
    const profilePrefix = `platformpics/${key}/`
    const query = new URLSearchParams({
      container: 'tagpictures',
      startPrefix: profilePrefix,
      prefix: profilePrefix,
    })

    const request = fetch(`/api/image/list?${query.toString()}`)
      .then(async (response) => {
        if (!response.ok) throw new Error(`Image lookup failed: ${response.status}`)
        const data = await response.json()
        const files = Array.isArray(data?.files) ? data.files : []
        const newest = [...files].sort(
          (left, right) => new Date(right.lastModified || 0) - new Date(left.lastModified || 0)
        )[0]
        return newest?.url || ''
      })
      .then((url) => {
        if (imageCache.get(key) === request) resolvedImages.set(key, url)
        return url
      })
      .catch((error) => {
        // Do not cache failures so a later render can retry.
        imageCache.delete(key)
        console.error(`Error loading ${imageKind} image:`, error.message)
        return ''
      })

    imageCache.set(key, request)
  }

  return imageCache.get(key)
}

export function fetchEntityProfileImage(entityType, entityId) {
  return fetchEntityImage(entityType, entityId)
}

export function invalidateEntityImageCache(entityType, entityId, imageKind = 'profile') {
  const key = buildCacheKey(entityType, entityId, imageKind)
  if (key) {
    imageCache.delete(key)
    resolvedImages.delete(key)
  }
}

if (typeof window !== 'undefined') {
  window.addEventListener('entity-profile-picture-updated', (event) => {
    invalidateEntityImageCache(event.detail?.entityType, event.detail?.entityId)
  })
}

/**
 * @param {'user'|'artist'|'listing'} entityType
 * @param {number|string} entityId
 * @param {'profile'|'cover'} imageKind
 * @returns {string} image URL, or an empty string while loading or when none exists
 */
export function useEntityImage(entityType, entityId, imageKind = 'profile') {
  const key = buildCacheKey(entityType, entityId, imageKind)
  const [result, setResult] = useState({ key: null, url: '' })

  useEffect(() => {
    if (!key) return undefined

    let cancelled = false
    const [type, id, kind] = key.split('/')
    fetchEntityImage(type, id, kind).then((url) => {
      if (!cancelled) setResult({ key, url })
    })

    return () => {
      cancelled = true
    }
  }, [key])

  if (!key) return ''
  return result.key === key ? result.url : (resolvedImages.get(key) || '')
}

export function useEntityProfileImage(entityType, entityId) {
  return useEntityImage(entityType, entityId)
}
