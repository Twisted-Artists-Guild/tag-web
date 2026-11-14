/* This file is part of the Twisted Artists Guild project.

 Copyright (C) 2025 Twisted Artists Guild

 Licensed under the GNU General Public License v3.0
 (https://www.gnu.org/licenses/gpl-3.0.en.html).

 This software comes with NO WARRANTY; see the license for details.

 Open source · low-profit · human-first*/

import Image from "next/image"
import Link from "next/link"
import { formatLocation, venueHref } from "@/utils/venue-list"

// One venue in the directory. Everything shown is plain text from the API, never HTML.
export default function VenueCard({ venue }) {
  const href = venueHref(venue)
  const location = formatLocation(venue)
  const categories = Array.isArray(venue?.categories) ? venue.categories : []
  const tags = Array.isArray(venue?.tags) ? venue.tags.slice(0, 4) : []
  const name = venue?.name || "Untitled venue"
  const initial = name.trim().charAt(0).toUpperCase() || "V"

  return (
    <article className="card bg-base-100 border border-base-300 shadow-sm h-full">
      <div className="card-body gap-3 p-4">
        <div className="flex items-start gap-3">
          {venue?.logoUrl ? (
            <Image src={venue.logoUrl} alt="" width={56} height={56} unoptimized className="h-14 w-14 flex-none rounded-box border border-base-300 bg-base-100 object-contain p-1" />
          ) : (
            <span aria-hidden="true" className="flex h-14 w-14 flex-none items-center justify-center rounded-box bg-base-200 text-xl font-bold text-base-content/50">{initial}</span>
          )}
          <div className="min-w-0">
            <h3 className="card-title text-lg leading-tight break-words">
              {href ? <Link href={href} className="link link-hover">{name}</Link> : name}
            </h3>
            {location ? <p className="text-sm text-base-content/70">{location}</p> : null}
          </div>
        </div>

        {categories.length > 0 ? (
          <ul className="flex flex-wrap gap-1" aria-label={`Categories of ${name}`}>
            {categories.map((category) => <li key={category.slug} className="badge badge-primary badge-outline">{category.name}</li>)}
          </ul>
        ) : null}

        {venue?.description ? <p className="text-sm text-base-content/80 line-clamp-3">{venue.description}</p> : null}

        {tags.length > 0 ? (
          <ul className="flex flex-wrap gap-1 mt-auto" aria-label={`Amenities at ${name}`}>
            {tags.map((tag) => <li key={tag} className="badge badge-ghost badge-sm">{tag}</li>)}
          </ul>
        ) : null}
      </div>
    </article>
  )
}
