export const TAG_NAME_MAX_LENGTH = 30
export const MAX_TAGS_PER_VENUE = 15

// Same rules the API enforces: letters and numbers of any language, plus space, hyphen, apostrophe and ampersand.
const ALLOWED_TAG = /^[\p{L}\p{N}][\p{L}\p{N} '&-]*$/u

// Trim, lowercase and collapse spaces, exactly like the API, so what is shown matches what is saved.
export function normalizeTag(raw) {
  return String(raw ?? '').normalize('NFC').trim().replace(/\s+/g, ' ').toLowerCase()
}

// Returns a message that is safe to show, or an empty string when the tag is fine.
export function validateTag(raw) {
  const tag = normalizeTag(raw)
  if (!tag) return "A tag can't be empty."
  if (tag.length > TAG_NAME_MAX_LENGTH) return `Tags can be at most ${TAG_NAME_MAX_LENGTH} characters.`
  if (!ALLOWED_TAG.test(tag)) return "Use letters, numbers, spaces, hyphens, apostrophes and &, and start with a letter or number."
  return ''
}

// Adds a tag to the list. Returns the new list and an error message; a tag that is already there is quietly ignored.
export function addTag(tags, raw, maxTags = MAX_TAGS_PER_VENUE) {
  const current = Array.isArray(tags) ? tags : []
  const problem = validateTag(raw)
  if (problem) return { tags: current, error: problem }

  const tag = normalizeTag(raw)
  if (current.includes(tag)) return { tags: current, error: '' }
  if (current.length >= maxTags) return { tags: current, error: `A venue can have at most ${maxTags} tags.` }
  return { tags: [...current, tag], error: '' }
}

export function removeTag(tags, tag) {
  return (Array.isArray(tags) ? tags : []).filter((item) => item !== tag)
}

// Pasted text such as "parking, stage, bar" becomes separate tags; commas, semicolons and new lines separate them.
export function splitPastedTags(text) {
  return String(text ?? '').split(/[,;\n\r]+/).map((part) => part.trim()).filter(Boolean)
}

// Adds every tag in a list of raw values, stopping at the first problem so the message stays clear.
export function addTags(tags, rawValues, maxTags = MAX_TAGS_PER_VENUE) {
  let result = { tags: Array.isArray(tags) ? tags : [], error: '' }
  for (const raw of rawValues) {
    result = addTag(result.tags, raw, maxTags)
    if (result.error) break
  }
  return result
}

export function buildTagSuggestionsQuery(prefix, limit = 8) {
  const params = new URLSearchParams()
  params.set('q', normalizeTag(prefix))
  params.set('limit', String(limit))
  return params.toString()
}

// Suggestions the user hasn't already picked, as plain tag names.
export function selectableSuggestions(suggestions, selected) {
  const chosen = new Set(Array.isArray(selected) ? selected : [])
  const names = (Array.isArray(suggestions) ? suggestions : [])
    .map((item) => normalizeTag(typeof item === 'string' ? item : item?.name))
    .filter((name) => name && !chosen.has(name))
  return [...new Set(names)]
}

// Tags as they come back on a venue (a list of names), tolerating missing data.
export function getVenueTags(venue) {
  const raw = venue?.tags ?? venue?.Tags
  return Array.isArray(raw) ? raw.filter((tag) => typeof tag === 'string' && tag) : []
}
