import { useEffect, useState } from "react"

const logoLookupCache = new Map()
const NO_ACTIVE_LOGO = "__NO_ACTIVE_LOGO__"

export const invalidateEntityLogoCache = (entityType, entityId) => {
  logoLookupCache.delete(`${entityType}:${entityId}`)
}

const loadActiveLogo = (entityType, entityId) => {
  const cacheKey = `${entityType}:${entityId}`
  if (logoLookupCache.has(cacheKey)) return logoLookupCache.get(cacheKey)

  const request = (async () => {
    try {
      const response = await fetch(`/api/Logo/${encodeURIComponent(entityType)}/${encodeURIComponent(entityId)}`)
      if (response.ok) {
        const payload = await response.json().catch(() => null)
        const logo = payload?.logoPic || payload?.LogoPic || payload?.activeLogo || payload?.ActiveLogo || payload?.logo || payload?.data || payload
        const logoUrl = logo?.url || logo?.URL || logo?.normalizedURL || logo?.NormalizedURL || logo?.picture?.url || logo?.Picture?.URL
        if (logoUrl) return logoUrl
        return NO_ACTIVE_LOGO
      }
      if (response.status === 404) return NO_ACTIVE_LOGO
    } catch {
      return null
    }
    return null
  })()

  logoLookupCache.set(cacheKey, request)
  request.finally(() => {
    if (logoLookupCache.get(cacheKey) === request) logoLookupCache.delete(cacheKey)
  })
  return request
}

export default function useEntityLogo({ logoImage = "", entityType = "", entityId = "" } = {}) {
  const [logoState, setLogoState] = useState({ key: "", image: null })
  const entityKey = `${entityType}:${entityId}`

  useEffect(() => {
    let cancelled = false
    const refresh = () => {
      loadActiveLogo(entityType, entityId).then((url) => {
        if (!cancelled) {
          setLogoState({ key: entityKey, image: url === NO_ACTIVE_LOGO ? "" : url || logoImage || "" })
        }
      }).catch(() => {
        if (!cancelled) setLogoState({ key: entityKey, image: logoImage || "" })
      })
    }

    if (!entityType || !entityId) {
      setLogoState({ key: entityKey, image: logoImage || "" })
      return () => { cancelled = true }
    }

    refresh()
    const handleLogoUpdated = (event) => {
      if (`${event.detail?.entityType}:${event.detail?.entityId}` !== entityKey) return
      invalidateEntityLogoCache(entityType, entityId)
      refresh()
    }
    window.addEventListener("entity-logo-updated", handleLogoUpdated)

    return () => {
      cancelled = true
      window.removeEventListener("entity-logo-updated", handleLogoUpdated)
    }
  }, [entityKey, entityId, entityType, logoImage])

  return logoState.key === entityKey && logoState.image !== null ? logoState.image : logoImage || ""
}