/* This file is part of the Twisted Artists Guild project.

 Copyright (C) 2025 Twisted Artists Guild

 Licensed under the GNU General Public License v3.0
 (https://www.gnu.org/licenses/gpl-3.0.en.html).

 This software comes with NO WARRANTY; see the license for details.

 Open source · low-profit · human-first*/

import { useEffect, useState } from 'react'

const SUPPORTED_ENTITY_TYPES = new Set(['user', 'artist'])
const imageCache = new Map()
const resolvedImages = new Map()

function buildCacheKey(entityType, entityId) {
  const type = String(entityType || '').toLowerCase()
  const id = Number(entityId)
  if (!SUPPORTED_ENTITY_TYPES.has(type) || !Number.isInteger(id) || id <= 0) return null
  return `${type}/${id}`
}

/**
 * Resolves the active profile picture for a user or artist from blob storage,
 * using the same source as the header context switcher (newest file in the profile folder).
 * Results are cached per entity for the lifetime of the page.
 */
export function fetchEntityProfileImage(entityType, entityId) {
  const key = buildCacheKey(entityType, entityId)
  if (!key) return Promise.resolve('')

  if (!imageCache.has(key)) {
    const profilePrefix = `platformpics/${key}/profile/`
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
        console.error('Error loading profile image:', error.message)
        return ''
      })

    imageCache.set(key, request)
  }

  return imageCache.get(key)
}

if (typeof window !== 'undefined') {
  window.addEventListener('entity-profile-picture-updated', (event) => {
    const key = buildCacheKey(event.detail?.entityType, event.detail?.entityId)
    if (key) {
      imageCache.delete(key)
      resolvedImages.delete(key)
    }
  })
}

/**
 * @param {'user'|'artist'} entityType
 * @param {number|string} entityId
 * @returns {string} profile image URL, or an empty string while loading or when none exists
 */
export function useEntityProfileImage(entityType, entityId) {
  const key = buildCacheKey(entityType, entityId)
  const [result, setResult] = useState({ key: null, url: '' })

  useEffect(() => {
    if (!key) return undefined

    let cancelled = false
    const [type, id] = key.split('/')
    fetchEntityProfileImage(type, id).then((url) => {
      if (!cancelled) setResult({ key, url })
    })

    return () => {
      cancelled = true
    }
  }, [key])

  if (!key) return ''
  return result.key === key ? result.url : (resolvedImages.get(key) || '')
}
