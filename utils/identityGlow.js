/* This file is part of the Twisted Artists Guild project.

 Copyright (C) 2025 Twisted Artists Guild

 Licensed under the GNU General Public License v3.0
 (https://www.gnu.org/licenses/gpl-3.0.en.html).

 This software comes with NO WARRANTY; see the license for details.

 Open source · low-profit · human-first*/

export const DEFAULT_IDENTITY_COLORS = {
  user: "#3B82F6",
  artist: "#14B8A6",
  vendor: "#F59E0B",
  business: "#F59E0B",
  venue: "#8B5CF6",
  collective: "#8B5CF6",
  moderator: "#EA580C",
  staff: "#F43F5E",
  admin: "#DC2626",
}

/**
 * Resolves the identity glow color for any profile, entity, or card avatar.
 * Checks localStorage overrides first, then falls back to core role/entity type defaults.
 */
export function getIdentityGlowColor(entityOrType, options = {}) {
  const type = String(options.type || (typeof entityOrType === "string" ? entityOrType : entityOrType?.type) || "artist").toLowerCase()
  
  if (typeof window !== "undefined") {
    try {
      const profileColorsRaw = localStorage.getItem("tag:profileColors")
      const overridesRaw = localStorage.getItem("tag:contextColorOverrides")
      const activeContextId = localStorage.getItem("tag:activeContextId")

      const profileColors = profileColorsRaw ? JSON.parse(profileColorsRaw) : {}
      const overrides = overridesRaw ? JSON.parse(overridesRaw) : {}
      const colorMap = { ...profileColors, ...overrides }
      const contextId = options.contextId || entityOrType?.contextId

      if (contextId && colorMap[contextId]) {
        return colorMap[contextId]
      }

      const id = options.id || entityOrType?.id || entityOrType?.artistID || entityOrType?.ArtistID || entityOrType?.vendorID || entityOrType?.venueID || entityOrType?.path || entityOrType?.slug || entityOrType?.Path || entityOrType?.Slug

      if (id) {
        const candidateKeys = [
          `${type}-${id}`,
          `artist-${id}`,
          `vendor-${id}`,
          `venue-${id}`,
          `role-${type}`,
          String(id).toLowerCase(),
          `artist-${String(id).toLowerCase()}`,
          "user-primary",
        ]
        for (const key of candidateKeys) {
          if (colorMap[key]) {
            return colorMap[key]
          }
        }
      }

      if (activeContextId && colorMap[activeContextId]) {
        if (type === "user" && activeContextId === "user-primary") {
          return colorMap["user-primary"]
        }
        if (activeContextId.startsWith(`${type}-`)) {
          return colorMap[activeContextId]
        }
      }

      if (colorMap[`role-${type}`]) {
        return colorMap[`role-${type}`]
      }
      if (type === "user" && colorMap["user-primary"]) {
        return colorMap["user-primary"]
      }
    } catch {
      // Ignore storage errors
    }
  }

  return DEFAULT_IDENTITY_COLORS[type] || DEFAULT_IDENTITY_COLORS.artist
}

/**
 * Returns inline CSS style object providing the non-interactive identity halo and glow.
 */
export function getIdentityGlowStyle(entityOrType, options = {}) {
  const color = typeof entityOrType === "string" && entityOrType.startsWith("#")
    ? entityOrType
    : getIdentityGlowColor(entityOrType, options)

  return {
    boxShadow: `0 0 0 2px ${color}66, 0 0 10px ${color}88`,
    borderColor: color,
  }
}
