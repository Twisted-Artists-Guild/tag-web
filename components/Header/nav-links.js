/* This file is part of the Twisted Artists Guild project.

 Copyright (C) 2025 Twisted Artists Guild

 Licensed under the GNU General Public License v3.0
 (https://www.gnu.org/licenses/gpl-3.0.en.html).

 This software comes with NO WARRANTY; see the license for details.

 Open source · low-profit · human-first*/

// Main navigation, shared by the header and the mobile menu.
// A link is active on its own path and sub-paths, and on any extra "alsoActiveOn" paths (a venue page lives at /venue/<slug>).
export const NAV_LINKS = [
  { href: "/artists", label: "Artists" },
  { href: "/art/", label: "Browse Art" },
  { href: "/events", label: "Events" },
  { href: "/venues", label: "Venues", alsoActiveOn: ["/venue"] },
  { href: "/blogs", label: "Blog" },
  { href: "/news", label: "News" },
  { href: "/contests/", label: "Contests" },
]

const normalizePath = (path) => String(path || "").split(/[?#]/)[0].replace(/\/+$/, "").toLowerCase() || "/"

// The href of the nav link for the current page or one of its sub-pages, if any
export function getActiveNavHref(asPath, links = NAV_LINKS) {
  const currentPath = normalizePath(asPath)
  return links.find((link) =>
    [link.href, ...(link.alsoActiveOn || [])].some((path) => {
      const target = normalizePath(path)
      return currentPath === target || currentPath.startsWith(`${target}/`)
    })
  )?.href
}

// Bloomscroll, the social feed
export const BLOOMSCROLL_HREF = "/feed"

export const BLOOMSCROLL_LOGO = "/BLOOMSCROLL OFFICIAL/LOGO/BS (HORIZONTAL) V1.png"
export const TAG_LOGO = "/TAG OFFICIAL/LOGOS/HORIZONTAL (HOLLOW WHITE).png"
