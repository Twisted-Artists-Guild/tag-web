/* This file is part of the Twisted Artists Guild project.

 Copyright (C) 2025 Twisted Artists Guild

 Licensed under the GNU General Public License v3.0
 (https://www.gnu.org/licenses/gpl-3.0.en.html).

 This software comes with NO WARRANTY; see the license for details.

 Open source · low-profit · human-first*/

// Venues can exist without a website or phone, and the venue API replaces the whole record on save.
// These helpers keep missing IDs as null (never 0) and send the optional fields back unchanged.

export function toNullableId(value) {
  const parsed = Number(value)
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null
}

export function mapVenueOptionalFields(venueData) {
  const data = venueData || {}
  return {
    externalLinkID: toNullableId(data.externalLinkID ?? data.ExternalLinkID),
    phoneContactID: toNullableId(data.phoneContactID ?? data.PhoneContactID),
    description: String(data.descriptionRichtext ?? data.DescriptionRichtext ?? ""),
    eventSourceUrl: String(data.eventSourceUrl ?? data.EventSourceUrl ?? ""),
  }
}

export function buildVenueOptionalPayload(venueForm) {
  const form = venueForm || {}
  return {
    externalLinkID: toNullableId(form.externalLinkID),
    phoneContactID: toNullableId(form.phoneContactID),
    description: String(form.description || "").trim() || null,
    eventSourceUrl: String(form.eventSourceUrl || "").trim() || null,
  }
}
