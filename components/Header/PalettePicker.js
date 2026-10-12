/* This file is part of the Twisted Artists Guild project.

 Copyright (C) 2025 Twisted Artists Guild

 Licensed under the GNU General Public License v3.0
 (https://www.gnu.org/licenses/gpl-3.0.en.html).

 This software comes with NO WARRANTY; see the license for details.

 Open source · low-profit · human-first*/
"use client"

import { Fragment, useEffect, useId, useRef, useSyncExternalStore } from "react"

export const PALETTES = ["orig", "7a"]
export const MODES = ["dark", "light"]
export const DEFAULT_PREFS = { palette: "orig", mode: "dark" }
export const STORAGE_KEYS = { palette: "tag-palette", mode: "tag-mode", legacy: "theme" }
export const DAISY_THEME_BY_MODE = { dark: "tag-dark", light: "tag-light" }

const MODE_ICONS = {
  dark: <path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z" />,
  light: (
    <>
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
    </>
  ),
}

// <html> holds the live palette and mode (set before first paint by the head script in _document)
const subscribe = (onChange) => {
  const observer = new MutationObserver(onChange)
  observer.observe(document.documentElement, { attributes: true, attributeFilter: ["data-palette", "data-mode"] })
  return () => observer.disconnect()
}

const readSnapshot = () => {
  const root = document.documentElement
  const palette = root.getAttribute("data-palette")
  const mode = root.getAttribute("data-mode")
  return `${PALETTES.includes(palette) ? palette : DEFAULT_PREFS.palette}|${MODES.includes(mode) ? mode : DEFAULT_PREFS.mode}`
}

const serverSnapshot = () => `${DEFAULT_PREFS.palette}|${DEFAULT_PREFS.mode}`

/**
 * Palette and mode picker: a header popover, or inline in the mobile menu.
 * @param {{ variant?: "popover"|"inline", isOpen?: boolean, onToggle?: () => void }} props
 */
export default function PalettePicker({ variant = "popover", isOpen = false, onToggle = () => {} }) {
  const idPrefix = useId().replace(/:/g, "")
  const [palette, mode] = useSyncExternalStore(subscribe, readSnapshot, serverSnapshot).split("|")
  const wrapRef = useRef(null)
  const buttonRef = useRef(null)
  const popoverRef = useRef(null)
  const isPopover = variant === "popover"

  // Opening moves focus to the checked swatch; Escape or a click outside closes and returns focus
  useEffect(() => {
    if (!isPopover || !isOpen) return undefined

    popoverRef.current?.querySelector('[role="radio"][aria-checked="true"]')?.focus({ preventScroll: true })

    function handleKeyDown(event) {
      if (event.key === "Escape") {
        event.preventDefault()
        onToggle()
        buttonRef.current?.focus()
      }
    }

    function handlePointerDown(event) {
      if (wrapRef.current && !wrapRef.current.contains(event.target)) {
        onToggle()
      }
    }

    document.addEventListener("keydown", handleKeyDown, true)
    document.addEventListener("mousedown", handlePointerDown)
    return () => {
      document.removeEventListener("keydown", handleKeyDown, true)
      document.removeEventListener("mousedown", handlePointerDown)
    }
  }, [isOpen, onToggle, isPopover])

  const groups = [
    {
      kind: "palette",
      title: "Palette",
      value: palette,
      className: "tag-pal__swatches",
      options: [
        { value: "orig", label: "Original" },
        { value: "7a", label: "Magenta" },
      ],
    },
    {
      kind: "mode",
      title: "Mode",
      value: mode,
      className: "tag-pal__seg",
      options: [
        { value: "dark", label: "Dark" },
        { value: "light", label: "Light" },
      ],
    },
  ]

  const body = groups.map((group) => {
    const labelId = `${idPrefix}-${group.kind}`

    // Writes the choice to <html> (the store) and saves it on this device
    function select(value) {
      const next = { palette, mode, [group.kind]: value }
      const root = document.documentElement
      root.setAttribute("data-palette", next.palette)
      root.setAttribute("data-mode", next.mode)
      root.setAttribute("data-theme", DAISY_THEME_BY_MODE[next.mode])
      try {
        window.localStorage.setItem(STORAGE_KEYS[group.kind], value)
      } catch {
        // Storage blocked: the choice lasts for this page view
      }
    }

    // Roving tabindex: Tab enters on the checked option, arrow keys move and select
    function handleKeyDown(event) {
      const keys = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 }
      if (!(event.key in keys)) return
      event.preventDefault()
      const index = group.options.findIndex((option) => option.value === group.value)
      const next = group.options[(index + keys[event.key] + group.options.length) % group.options.length]
      select(next.value)
      event.currentTarget.querySelector(`[data-value="${next.value}"]`)?.focus()
    }

    return (
      <Fragment key={group.kind}>
        {isPopover && group.kind === "mode" ? <div className="tag-pal__sep" /> : null}
        {/* The inline (mobile menu) variant keeps the Mode title for screen readers only */}
        <p className={`tag-pal__title${!isPopover && group.kind === "mode" ? " sr-only" : ""}`} id={labelId}>{group.title}</p>
        <div className={group.className} role="radiogroup" aria-labelledby={labelId} onKeyDown={handleKeyDown}>
          {group.options.map((option) => {
            const checked = option.value === group.value
            return (
              <button
                key={option.value}
                type="button"
                role="radio"
                aria-checked={checked}
                tabIndex={checked ? 0 : -1}
                data-value={option.value}
                onClick={() => select(option.value)}
              >
                {group.kind === "palette" ? (
                  <span className="tag-pal__square" style={{ background: `var(--tag-swatch-${option.value})` }}>
                    <span className="tag-pal__tick">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                        <path d="m5 12 5 5 9-10" />
                      </svg>
                    </span>
                  </span>
                ) : (
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    {MODE_ICONS[option.value]}
                  </svg>
                )}
                {option.label}
              </button>
            )
          })}
        </div>
      </Fragment>
    )
  })

  if (!isPopover) {
    return <div className="tag-pal tag-pal--inline">{body}</div>
  }

  const popoverId = `${idPrefix}-popover`

  return (
    <div className="tag-pal" ref={wrapRef}>
      <button
        ref={buttonRef}
        type="button"
        className="tag-icon-btn tag-pal__btn"
        aria-label="Colour palette and mode"
        aria-haspopup="dialog"
        aria-expanded={isOpen}
        aria-controls={popoverId}
        onClick={onToggle}
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M18.4 2.6a2 2 0 0 1 2.9 2.9l-8.6 8.6-2.9-2.9z" />
          <path d="M9.8 11.2c-2-.1-3.7 1.4-3.9 3.4-.1 1.2-.8 2.4-2.4 3.1 1.4 1.4 3.4 2 5.3 1.6 2.4-.5 3.9-2.7 3.5-5.1z" />
        </svg>
        <span className="tag-pal__dot" aria-hidden="true" />
      </button>
      <div ref={popoverRef} id={popoverId} className="tag-pal__pop" role="dialog" aria-label="Colour palette and mode" hidden={!isOpen}>
        {body}
        <p className="tag-pal__note">Saved on this device.</p>
      </div>
    </div>
  )
}
