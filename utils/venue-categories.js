export const CATEGORY_NAME_MAX_LENGTH = 100

// Same rules the API enforces, so staff get the message before the request is sent.
export function validateCategoryName(name) {
  const trimmed = String(name ?? "").trim()
  if (!trimmed) return "Enter a category name."
  if (trimmed.length > CATEGORY_NAME_MAX_LENGTH) return `Category names can be at most ${CATEGORY_NAME_MAX_LENGTH} characters.`
  if (/[<>\u0000-\u001f\u007f]/.test(trimmed)) return "Category names can't contain < or > or control characters."
  return ""
}

export function sortCategories(categories) {
  return [...(Array.isArray(categories) ? categories : [])].sort((left, right) => {
    const byOrder = Number(left?.sortOrder || 0) - Number(right?.sortOrder || 0)
    return byOrder !== 0 ? byOrder : String(left?.name || "").localeCompare(String(right?.name || ""))
  })
}

// Adds a category, or replaces the one with the same id, and keeps the list in display order.
export function withCategorySaved(categories, category) {
  const others = (Array.isArray(categories) ? categories : []).filter((item) => item.venueCategoryID !== category.venueCategoryID)
  return sortCategories([...others, category])
}

export function categoryUsageLabel(venueCount) {
  const count = Number(venueCount) || 0
  if (count === 0) return "No venues"
  return count === 1 ? "1 venue" : `${count} venues`
}
