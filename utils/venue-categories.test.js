import { test } from 'node:test'
import assert from 'node:assert/strict'
import { CATEGORY_NAME_MAX_LENGTH, validateCategoryName, sortCategories, withCategorySaved, categoryUsageLabel } from './venue-categories.js'

test('a category name is required, trimmed and limited', () => {
  assert.equal(validateCategoryName('  Theaters '), '')
  for (const value of [undefined, null, '', '   ']) {
    assert.equal(validateCategoryName(value), 'Enter a category name.')
  }
  assert.match(validateCategoryName('a'.repeat(CATEGORY_NAME_MAX_LENGTH + 1)), /at most 100 characters/)
  assert.equal(validateCategoryName('a'.repeat(CATEGORY_NAME_MAX_LENGTH)), '')
})

test('markup and control characters are rejected in a category name', () => {
  for (const value of ['<b>Bold</b>', 'a > b', 'tab\there', 'line\nbreak']) {
    assert.match(validateCategoryName(value), /can't contain/)
  }
  assert.equal(validateCategoryName("Bars & Pubs"), '')
})

test('categories are listed by sort order, then by name', () => {
  const sorted = sortCategories([
    { venueCategoryID: 1, name: 'Studios', sortOrder: 70 },
    { venueCategoryID: 2, name: 'Bars', sortOrder: 30 },
    { venueCategoryID: 3, name: 'Arcades', sortOrder: 30 },
    { venueCategoryID: 4, name: 'No order' },
  ])
  assert.deepEqual(sorted.map((item) => item.name), ['No order', 'Arcades', 'Bars', 'Studios'])
  assert.deepEqual(sortCategories(undefined), [])
})

test('sorting does not change the list it was given', () => {
  const original = [{ venueCategoryID: 1, name: 'B', sortOrder: 2 }, { venueCategoryID: 2, name: 'A', sortOrder: 1 }]
  sortCategories(original)
  assert.deepEqual(original.map((item) => item.name), ['B', 'A'])
})

test('saving a category adds a new one or replaces the one with the same id, in order', () => {
  const list = [{ venueCategoryID: 1, name: 'Bars', sortOrder: 10 }, { venueCategoryID: 2, name: 'Clubs', sortOrder: 20 }]

  const added = withCategorySaved(list, { venueCategoryID: 3, name: 'Rooftops', sortOrder: 15 })
  assert.deepEqual(added.map((item) => item.name), ['Bars', 'Rooftops', 'Clubs'])

  const renamed = withCategorySaved(list, { venueCategoryID: 2, name: 'Night clubs', sortOrder: 20, isActive: false })
  assert.equal(renamed.length, 2)
  assert.deepEqual(renamed.map((item) => item.name), ['Bars', 'Night clubs'])
  assert.equal(renamed[1].isActive, false)

  assert.deepEqual(withCategorySaved(undefined, { venueCategoryID: 9, name: 'First' }).map((item) => item.name), ['First'])
})

test('usage is described in words', () => {
  assert.equal(categoryUsageLabel(0), 'No venues')
  assert.equal(categoryUsageLabel(undefined), 'No venues')
  assert.equal(categoryUsageLabel(1), '1 venue')
  assert.equal(categoryUsageLabel(12), '12 venues')
})
