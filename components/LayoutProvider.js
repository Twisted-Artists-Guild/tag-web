/* This file is part of the Twisted Artists Guild project.

 Copyright (C) 2025 Twisted Artists Guild

 Licensed under the GNU General Public License v3.0
 (https://www.gnu.org/licenses/gpl-3.0.en.html).

 This software comes with NO WARRANTY; see the license for details.

 Open source · low-profit · human-first*/
"use client"

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react"

const LayoutContext = createContext()

export const BROWSE_PANEL_ID = "tag-browse-panel"
export const CART_PANEL_ID = "tag-cart-panel"
const PANEL_IDS = { left: BROWSE_PANEL_ID, right: CART_PANEL_ID }

// Below 1280px the panels overlay the page, one at a time. From 1280px they push it.
const OVERLAY_QUERY = "(max-width: 1279px)"

export function LayoutProvider({ children }) {
  const [isHeaderVisible, setIsHeaderVisible] = useState(true)
  const [sidebars, setSidebars] = useState({ left: false, right: false })
  const [isOverlay, setIsOverlay] = useState(false)
  const isOverlayRef = useRef(false)
  const wasOpenRef = useRef({ left: false, right: false })
  const returnFocusRef = useRef({ left: null, right: null })

  useEffect(() => {
    const query = window.matchMedia(OVERLAY_QUERY)
    const update = () => {
      isOverlayRef.current = query.matches
      setIsOverlay(query.matches)
      // Only one panel fits in the overlay layout: keep the cart
      if (query.matches) {
        setSidebars((current) => (current.left && current.right ? { left: false, right: true } : current))
      }
    }
    update()
    query.addEventListener("change", update)
    return () => query.removeEventListener("change", update)
  }, [])

  // `force`: true opens, false closes, anything else (e.g. a click event) toggles.
  const toggleLeftSidebar = useCallback((force) => {
    setSidebars((current) => {
      const open = typeof force === "boolean" ? force : !current.left
      return { left: open, right: open && isOverlayRef.current ? false : current.right }
    })
  }, [])

  const toggleRightSidebar = useCallback((force) => {
    setSidebars((current) => {
      const open = typeof force === "boolean" ? force : !current.right
      return { left: open && isOverlayRef.current ? false : current.left, right: open }
    })
  }, [])

  const closeSidebars = useCallback(() => setSidebars({ left: false, right: false }), [])

  // Focus moves into a panel when it opens and back to its opener when it closes
  useEffect(() => {
    for (const side of ["left", "right"]) {
      const open = sidebars[side]
      const wasOpen = wasOpenRef.current[side]
      const panel = document.getElementById(PANEL_IDS[side])

      if (open && !wasOpen) {
        returnFocusRef.current[side] = document.activeElement
        panel?.querySelector(".tag-panel__close")?.focus({ preventScroll: true })
      }

      if (!open && wasOpen) {
        const saved = returnFocusRef.current[side]
        returnFocusRef.current[side] = null
        // offsetParent can't tell visibility here: the edge tabs are position: fixed
        const opener = [saved, ...document.querySelectorAll(`[aria-controls="${PANEL_IDS[side]}"]`)].find((el) => (
          el && el !== document.body && document.contains(el) && !panel?.contains(el)
          && el.getClientRects().length > 0 && getComputedStyle(el).visibility !== "hidden" && !el.closest("[inert]")
        ))
        // Don't steal focus from wherever the user has moved on to
        const active = document.activeElement
        if (opener && (!active || active === document.body || panel?.contains(active))) {
          opener.focus({ preventScroll: true })
        }
      }
    }
    wasOpenRef.current = sidebars
  }, [sidebars])

  // Escape closes an open panel, unless a popover or menu already handled it
  const anyOpen = sidebars.left || sidebars.right
  useEffect(() => {
    if (!anyOpen) return undefined
    function handleKeyDown(event) {
      if (event.key === "Escape" && !event.defaultPrevented) closeSidebars()
    }
    document.addEventListener("keydown", handleKeyDown)
    return () => document.removeEventListener("keydown", handleKeyDown)
  }, [anyOpen, closeSidebars])

  const value = useMemo(() => ({
    isHeaderVisible,
    isLeftSidebarVisible: sidebars.left,
    isRightSidebarVisible: sidebars.right,
    isOverlay,
    toggleHeader: () => setIsHeaderVisible((prev) => !prev),
    toggleLeftSidebar,
    toggleRightSidebar,
    closeSidebars,
  }), [isHeaderVisible, sidebars, isOverlay, toggleLeftSidebar, toggleRightSidebar, closeSidebars])

  return <LayoutContext.Provider value={value}>{children}</LayoutContext.Provider>
}

export function useLayout() {
  const context = useContext(LayoutContext)
  if (!context) {
    throw new Error("useLayout must be used within a LayoutProvider")
  }
  return context
}
