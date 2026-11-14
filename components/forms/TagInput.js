/* This file is part of the Twisted Artists Guild project.

 Copyright (C) 2025 Twisted Artists Guild

 Licensed under the GNU General Public License v3.0
 (https://www.gnu.org/licenses/gpl-3.0.en.html).

 This software comes with NO WARRANTY; see the license for details.

 Open source · low-profit · human-first*/

import { useEffect, useId, useRef, useState } from "react"
import {
  MAX_TAGS_PER_VENUE,
  TAG_NAME_MAX_LENGTH,
  addTag,
  addTags,
  buildTagSuggestionsQuery,
  removeTag,
  selectableSuggestions,
  splitPastedTags,
} from "@/utils/venue-tags"

const SUGGEST_URL = "/api/VenueTag/suggest"

// A tag picker with suggestions. It is a controlled component: `value` is the list of tag names and `onChange`
// receives the new list. Tags are normalized exactly like the API does, and are only ever rendered as plain text.
export default function TagInput({
  label = "Tags",
  value,
  onChange,
  maxTags = MAX_TAGS_PER_VENUE,
  disabled = false,
  helpText = "Type a tag and press Enter or comma. Examples: parking, stage, wheelchair accessible.",
  suggestUrl = SUGGEST_URL,
}) {
  const baseId = useId()
  const inputId = `${baseId}-input`
  const listId = `${baseId}-suggestions`
  const helpId = `${baseId}-help`
  const errorId = `${baseId}-error`
  const tags = Array.isArray(value) ? value : []

  const [draft, setDraft] = useState("")
  const [suggestions, setSuggestions] = useState([])
  const [activeIndex, setActiveIndex] = useState(-1)
  const [isOpen, setIsOpen] = useState(false)
  const [error, setError] = useState("")
  const [announcement, setAnnouncement] = useState("")
  const inputRef = useRef(null)
  const requestId = useRef(0)

  // Ask for suggestions a moment after the user stops typing, and ignore answers that arrive late.
  // Tags that are already chosen are hidden when rendering, so they don't need to be known here.
  useEffect(() => {
    if (disabled || !isOpen) return undefined
    const current = ++requestId.current

    const timer = setTimeout(async () => {
      try {
        const response = await fetch(`${suggestUrl}?${buildTagSuggestionsQuery(draft)}`)
        if (!response.ok) throw new Error("Suggestions are not available.")
        const data = await response.json()
        if (requestId.current === current) setSuggestions(selectableSuggestions(data, []))
      } catch {
        if (requestId.current === current) setSuggestions([])
      }
    }, 200)

    return () => clearTimeout(timer)
  }, [draft, isOpen, disabled, suggestUrl])

  const visibleSuggestions = isOpen ? selectableSuggestions(suggestions, tags) : []
  const showList = visibleSuggestions.length > 0

  const commit = (rawValues) => {
    const result = addTags(tags, rawValues, maxTags)
    setError(result.error)
    if (result.tags !== tags && result.tags.length !== tags.length) {
      onChange?.(result.tags)
      const added = result.tags.slice(tags.length)
      setAnnouncement(`Added ${added.join(", ")}.`)
    }
    // Keep the text only when something was wrong, so it can be fixed.
    if (!result.error) setDraft("")
    setActiveIndex(-1)
  }

  const pickSuggestion = (name) => {
    const result = addTag(tags, name, maxTags)
    setError(result.error)
    if (result.tags.length !== tags.length) {
      onChange?.(result.tags)
      setAnnouncement(`Added ${name}.`)
    }
    setDraft("")
    setActiveIndex(-1)
    inputRef.current?.focus()
  }

  const remove = (tag) => {
    onChange?.(removeTag(tags, tag))
    setError("")
    setAnnouncement(`Removed ${tag}.`)
    inputRef.current?.focus()
  }

  const handleKeyDown = (event) => {
    if (event.key === "ArrowDown" && showList) {
      event.preventDefault()
      setActiveIndex((index) => (index + 1) % visibleSuggestions.length)
    } else if (event.key === "ArrowUp" && showList) {
      event.preventDefault()
      setActiveIndex((index) => (index <= 0 ? visibleSuggestions.length - 1 : index - 1))
    } else if (event.key === "Enter" || event.key === ",") {
      event.preventDefault()
      if (event.key === "Enter" && showList && activeIndex >= 0) pickSuggestion(visibleSuggestions[activeIndex])
      else if (draft.trim()) commit([draft])
    } else if (event.key === "Escape") {
      setIsOpen(false)
      setActiveIndex(-1)
    } else if (event.key === "Backspace" && !draft && tags.length > 0) {
      remove(tags[tags.length - 1])
    }
  }

  const handlePaste = (event) => {
    const pasted = event.clipboardData?.getData("text") || ""
    const parts = splitPastedTags(pasted)
    if (parts.length > 1) {
      event.preventDefault()
      commit(parts)
    }
  }

  const handleChange = (event) => {
    const next = event.target.value
    setError("")
    setIsOpen(true)

    // A comma or semicolon ends a tag. This is handled here, not only on key presses, because mobile keyboards
    // and pasted text change the value without sending the key.
    if (/[,;]/.test(next)) {
      const pieces = next.split(/[,;]/)
      const rest = pieces.pop()
      const result = addTags(tags, pieces.filter((piece) => piece.trim()), maxTags)
      if (result.error) {
        setError(result.error)
        setDraft(next)
        return
      }
      if (result.tags.length !== tags.length) {
        onChange?.(result.tags)
        setAnnouncement(`Added ${result.tags.slice(tags.length).join(", ")}.`)
      }
      setDraft(rest)
      return
    }

    setDraft(next)
  }

  const atLimit = tags.length >= maxTags

  return (
    <div className="form-control w-full">
      <label htmlFor={inputId} className="label-text font-medium mb-1">{label}</label>

      {tags.length > 0 ? (
        <ul className="flex flex-wrap gap-2 mb-2" aria-label={`Selected ${label.toLowerCase()}`}>
          {tags.map((tag) => (
            <li key={tag} className="badge badge-lg badge-outline gap-2 py-4">
              <span>{tag}</span>
              <button
                type="button"
                className="btn btn-ghost btn-xs btn-circle"
                onClick={() => remove(tag)}
                disabled={disabled}
                aria-label={`Remove tag ${tag}`}
              >
                ✕
              </button>
            </li>
          ))}
        </ul>
      ) : null}

      <div className="relative">
        <input
          ref={inputRef}
          id={inputId}
          type="text"
          role="combobox"
          className={`input input-bordered w-full ${error ? "input-error" : ""}`}
          value={draft}
          maxLength={TAG_NAME_MAX_LENGTH + 10}
          disabled={disabled || atLimit}
          placeholder={atLimit ? `Maximum of ${maxTags} tags reached` : "Add a tag"}
          autoComplete="off"
          aria-expanded={showList}
          aria-controls={listId}
          aria-autocomplete="list"
          aria-activedescendant={showList && activeIndex >= 0 ? `${listId}-${activeIndex}` : undefined}
          aria-describedby={error ? `${helpId} ${errorId}` : helpId}
          aria-invalid={error ? "true" : "false"}
          onChange={handleChange}
          onFocus={() => setIsOpen(true)}
          onBlur={() => setTimeout(() => setIsOpen(false), 150)}
          onKeyDown={handleKeyDown}
          onPaste={handlePaste}
        />

        {showList ? (
          <ul id={listId} role="listbox" aria-label="Tag suggestions" className="menu menu-sm absolute z-20 mt-1 w-full rounded-box bg-base-100 shadow border border-base-300 max-h-56 overflow-y-auto flex-nowrap">
            {visibleSuggestions.map((name, index) => (
              <li key={name} role="presentation">
                <button
                  type="button"
                  id={`${listId}-${index}`}
                  role="option"
                  aria-selected={index === activeIndex}
                  className={index === activeIndex ? "active" : ""}
                  tabIndex={-1}
                  onMouseDown={(event) => event.preventDefault()}
                  onClick={() => pickSuggestion(name)}
                >
                  {name}
                </button>
              </li>
            ))}
          </ul>
        ) : null}
      </div>

      <p id={helpId} className="text-xs text-base-content/60 mt-1">{helpText} {tags.length} of {maxTags} used.</p>
      {error ? <p id={errorId} role="alert" className="text-sm text-error mt-1">{error}</p> : null}
      <p role="status" aria-live="polite" className="sr-only">{announcement}</p>
    </div>
  )
}
