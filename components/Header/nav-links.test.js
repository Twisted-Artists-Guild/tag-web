import { test } from 'node:test'
import assert from 'node:assert/strict'
import { NAV_LINKS, getActiveNavHref } from './nav-links.js'

test('Venues is in the shared navigation, next to Events', () => {
  const labels = NAV_LINKS.map((link) => link.label)
  assert.ok(labels.includes('Venues'))
  assert.equal(labels.indexOf('Venues'), labels.indexOf('Events') + 1)
  assert.equal(NAV_LINKS.find((link) => link.label === 'Venues').href, '/venues')
})

test('the Venues link is active on the list page and on venue pages', () => {
  for (const path of ['/venues', '/venues/', '/venues?q=hall&category=bars', '/venues#results', '/VENUES', '/venue/sample-queen-city-studio', '/venue/some-hall/', '/venue/some-hall?tab=events']) {
    assert.equal(getActiveNavHref(path), '/venues', path)
  }
})

test('look-alike paths do not light up Venues', () => {
  for (const path of ['/venueless', '/venues-archive', '/venue-owners/new', '/portal/staff/venues']) {
    assert.notEqual(getActiveNavHref(path), '/venues', path)
  }
})

test('the other links keep their active state', () => {
  assert.equal(getActiveNavHref('/artists'), '/artists')
  assert.equal(getActiveNavHref('/artists/jane'), '/artists')
  assert.equal(getActiveNavHref('/events/123'), '/events')
  assert.equal(getActiveNavHref('/art'), '/art/')
  assert.equal(getActiveNavHref('/contests/spring?x=1'), '/contests/')
  assert.equal(getActiveNavHref('/blogs/my-post'), '/blogs')
})

test('no link is active on pages outside the navigation', () => {
  assert.equal(getActiveNavHref('/'), undefined)
  assert.equal(getActiveNavHref('/portal'), undefined)
  assert.equal(getActiveNavHref(''), undefined)
  assert.equal(getActiveNavHref(undefined), undefined)
})
