import { test } from "node:test"
import assert from "node:assert/strict"
import {
  getModerationPageContext,
  getPageManagementAccess,
  getPageManagementRelationship,
  getPageManagementTarget,
  resolvePageOwnership,
} from "./page-management.js"

const session = (roles = [], permissions = []) => ({ user: { id: "7", roles, permissions } })
const artist = getPageManagementTarget("artist", { artistID: 12 }, "test-artist")
const ok = (data) => async () => ({ ok: true, json: async () => data })

test("owners can edit without an artist role; staff and moderators otherwise only moderate", () => {
  assert.equal(getPageManagementAccess(session(), artist, true).canEdit, true)
  for (const role of ["staff", "moderator"]) {
    const access = getPageManagementAccess(session([role]), artist)
    assert.equal(access.canEdit, false)
    assert.equal(access.canModerate, true)
    assert.equal(getPageManagementAccess(session([role]), artist, true).canEdit, true)
  }
  assert.deepEqual(getPageManagementAccess(null, artist, true), {
    canEdit: false, canModerate: false, canManageContests: false, needsReason: false,
  })
  assert.equal(getPageManagementAccess(session(), artist).canEdit, false)
})

test("an admin override needs a reason, but independent owner/blog permissions do not", () => {
  assert.equal(getPageManagementAccess(session(["admin", "staff"]), artist).needsReason, true)
  assert.equal(getPageManagementAccess(session(["admin"]), artist, true).needsReason, false)
  const blog = getPageManagementTarget("blog", { blogID: 5 })
  const access = getPageManagementAccess(session(["admin"], ["blog:update"]), blog)
  assert.equal(access.canEdit, true)
  assert.equal(access.needsReason, false)
  assert.equal(getPageManagementAccess(session([], ["blog:update"]), blog).canEdit, true)
  assert.equal(getPageManagementAccess(session([], ["artist:update"]), artist).canEdit, false)
})

test("the blog index offers creation only to roles allowed by the existing create portal", () => {
  const blogIndex = { entityType: "blog", isIndex: true }
  for (const role of ["admin", "staff", "author"]) {
    const access = getPageManagementAccess(session([role]), blogIndex)
    assert.equal(access.canCreateBlog, true)
    assert.equal(access.canEdit, false)
    assert.equal(access.canModerate, false)
    assert.equal(access.needsReason, false)
  }
  for (const viewer of [null, session(), session(["artist"]), session(["moderator"]), session([], ["blog:update"])]) {
    assert.ok(!getPageManagementAccess(viewer, blogIndex).canCreateBlog)
  }
  assert.equal(getPageManagementRelationship(session(["author"]), blogIndex), "Blog Author")
  assert.equal(getPageManagementRelationship(session(["admin"]), blogIndex), "Admin")
})

test("the relationship describes ownership before elevated roles and distinguishes editors from moderators", () => {
  assert.equal(getPageManagementRelationship(session(["admin"]), artist, true), "Artist Owner")
  const venue = getPageManagementTarget("venue", { venueID: 9 }, "hall")
  assert.equal(getPageManagementRelationship(session(["staff"]), venue, true), "Venue Owner")
  const listing = getPageManagementTarget("listing", { listingID: 44 })
  assert.equal(getPageManagementRelationship(session(), listing, true), "Artist Owner")
  assert.equal(getPageManagementRelationship(session(["admin"]), artist), "Admin")
  assert.equal(getPageManagementRelationship(session(["staff"]), artist), "Staff / Content Moderator")
  assert.equal(getPageManagementRelationship(session(["moderator"]), artist), "Content Moderator")
  assert.equal(getPageManagementRelationship(session([], ["blog:update"]), { entityType: "blog" }), "Blog Editor")
})

test("only staff/admins see contest tools; contests do not get profile editing", () => {
  const contest = getPageManagementTarget("contest", { contestID: 2 })
  for (const role of ["staff", "admin"]) {
    const access = getPageManagementAccess(session([role]), contest, true)
    assert.equal(access.canManageContests, true)
    assert.equal(access.canEdit, false)
  }
  assert.equal(getPageManagementAccess(session(["moderator"]), contest).canManageContests, false)
  assert.equal(getPageManagementAccess(session(["artist"]), contest, true).canManageContests, false)
})

test("portal destinations use numeric listing IDs and encoded entity slugs", () => {
  const listing = getPageManagementTarget("listing", { listingID: 44, artist: { artistID: 12 } }, "artwork", "artist name")
  assert.equal(listing.editHref, "/portal/artist/artist%20name/listing/update/44")
  assert.equal(listing.ownerArtistId, 12)
  assert.equal(artist.editHref, "/portal/artist/test-artist/edit")
  assert.equal(getPageManagementTarget("venue", { VenueID: 9 }, "hall").editHref, "/portal/venue/hall/edit?step=2&id=9")
  assert.equal(getPageManagementTarget("vendor", { VendorID: 3 }, "shop").editHref, "/portal/vendor/shop/edit?step=2&id=3")
  assert.equal(getPageManagementTarget("blog", { blogID: 5 }).editHref, "/portal/staff/tagblog/5/update")
  assert.equal(getPageManagementTarget("artist", {}, "test").id, null)
  assert.equal(getPageManagementAccess(session(["admin"]), { id: null }).canEdit, false)
})

test("artist and listing ownership follows the viewed entity, not just any linked artist or URL", async () => {
  const linked = ok([{ artistID: 12 }, { ArtistID: 15 }])
  assert.equal(await resolvePageOwnership(artist, "7", linked), true)
  const listing = getPageManagementTarget("listing", { listingID: 44, artistID: 15 }, "artwork", "unrelated-slug")
  assert.equal(await resolvePageOwnership(listing, "7", linked), true)
  assert.equal(await resolvePageOwnership(artist, "7", ok([{ artistID: 99 }])), false)
  assert.equal(await resolvePageOwnership(artist, undefined, linked), false)
  const directOwner = { ...artist, ownerUserId: 7 }
  assert.equal(await resolvePageOwnership(directOwner, "7", () => assert.fail("No lookup needed")), true)
})

test("vendor ownership must match both user and vendor; staff venue access is not ownership", async () => {
  const vendor = getPageManagementTarget("vendor", { vendorID: 3 }, "shop")
  assert.equal(await resolvePageOwnership(vendor, "7", ok([{ userID: 7, vendorID: 3 }])), true)
  assert.equal(await resolvePageOwnership(vendor, "7", ok([{ userID: 8, vendorID: 3 }, { userID: 7, vendorID: 9 }])), false)
  const venue = getPageManagementTarget("venue", { venueID: 9 }, "hall")
  assert.equal(await resolvePageOwnership(venue, "7", ok({ canManage: true, isOwner: false, isStaff: true })), false)
  assert.equal(await resolvePageOwnership(venue, "7", ok({ canManage: true, isOwner: true })), true)
})

test("ownership failures surface an error rather than granting editing or assuming non-ownership", async () => {
  await assert.rejects(resolvePageOwnership(artist, "7", async () => ({ ok: false, status: 403 })), /403/)
  await assert.rejects(resolvePageOwnership(artist, "7", ok({})), /invalid response/)
  await assert.rejects(resolvePageOwnership(artist, "7", async () => { throw new Error("Offline") }), /Offline/)
})

test("a failed venue ownership lookup does not revoke independent admin editing access", async () => {
  const venue = getPageManagementTarget("venue", { venueID: 25 }, "tag-music-venue-east")
  await assert.rejects(resolvePageOwnership(venue, "7", async () => ({ ok: false, status: 401 })), /401/)
  const adminAccess = getPageManagementAccess(session(["admin"]), venue)
  assert.equal(adminAccess.canEdit, true)
  assert.equal(adminAccess.needsReason, true)
  assert.equal(getPageManagementAccess(session(["staff"]), venue).canEdit, false)
  assert.equal(getPageManagementAccess(session(), venue).canEdit, false)
})

test("moderation context preserves the source page without accepting external return URLs", () => {
  assert.deepEqual(getModerationPageContext({ targetType: "Venue", targetId: "9", targetUrl: "/venue/hall" }), {
    targetType: "Venue", targetId: 9, targetUrl: "/venue/hall",
  })
  for (const targetUrl of ["https://example.com", "//example.com", "/\\example.com"]) {
    assert.equal(getModerationPageContext({ targetType: "Artist", targetId: "12", targetUrl }).targetUrl, "")
  }
  assert.equal(getModerationPageContext({ targetType: "Unknown", targetId: "12" }), null)
  assert.equal(getModerationPageContext({ targetType: "Artist", targetId: "0" }), null)
})
