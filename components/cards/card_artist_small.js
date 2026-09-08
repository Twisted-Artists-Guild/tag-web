/* This file is part of the Twisted Artists Guild project.

 Copyright (C) 2025 Twisted Artists Guild

 Licensed under the GNU General Public License v3.0
 (https://www.gnu.org/licenses/gpl-3.0.en.html).

 This software comes with NO WARRANTY; see the license for details.

 Open source · low-profit · human-first*/
"use client" // This component now uses client-side state

import Link from "next/link"
import Image from "next/image"
import { useState } from "react"
import ContentTags, { hasExplicitWarning, extractContentWarnings } from "@/components/social/ContentTags"
import { getIdentityGlowStyle } from "@/utils/identityGlow"

const getSafeArtistImageSrc = (artist) => {
  const candidate =
    artist?.profilePic?.url ||
    artist?.profilePic?.URL ||
    artist?.profilePicUrl ||
    artist?.profilepicurl
  return candidate || "/blank_image.png"
}

/**
 * Card component for displaying artist information in landscape orientation
 * @param {Object} props - Component properties
 * @param {Object} props.artist - Artist data object with profilePic object and social counters
 * @returns {JSX.Element} - Artist card component
 */
const ArtistCardSmall = ({ artist }) => {
  const [imageSrc, setImageSrc] = useState(getSafeArtistImageSrc(artist))
  const contentWarnings = extractContentWarnings(artist)
  const hideAvatar = hasExplicitWarning(contentWarnings)

  return (
    <div
      className="card lg:card-side bg-base-100 shadow-xl hover:shadow-2xl transition-all duration-300 ease-in-out w-full max-w-2xl border border-base-300 rounded-box group"
    >
      {/* Wrap the main content (excluding social icons) with Link */}
      <Link href={`/artists/${artist.path}`} passHref className="flex grow cursor-pointer relative">
        <figure className="p-1 shrink-0 relative">
          {contentWarnings.length > 0 && (
            <div className="absolute left-1 right-1 top-1 z-10">
              <ContentTags
                warnings={contentWarnings.slice(0, 1)}
                size="sm"
                showTitle={false}
                className="rounded-none border-0 bg-base-100/92 px-1 py-0.5"
              />
            </div>
          )}

          <div
            className="relative w-16 h-16 rounded-full overflow-hidden border-2 bg-base-200"
            style={getIdentityGlowStyle(artist, { type: "artist" })}
          >
            {hideAvatar ? (
              <div className="flex h-full w-full items-center justify-center text-[10px] font-semibold uppercase tracking-wide text-error">
                18+
              </div>
            ) : (
              <Image
                src={imageSrc}
                alt={artist?.profilePic?.alttext || `${artist?.title}'s profile picture`}
                fill
                sizes="64px"
                onError={() => setImageSrc("/blank_image.png")}
                style={{ objectFit: "cover" }}
                className="rounded-full group-hover:scale-105 transition-transform duration-300"
              />
            )}
          </div>
        </figure>
        <div className="card-body p-4 grow justify-center">
          <h2 className="card-title text-lg font-semibold text-primary">{artist.title}</h2>
          <p className="text-sm text-base-content/60">{artist.byline}</p>
          {(artist?.locationSummary || artist?.phoneDisplay) && (
            <div className="mt-1.5 space-y-0.5">
              {artist?.locationSummary && (
                <p className="text-xs text-base-content/70 truncate">{artist.locationSummary}</p>
              )}
              {artist?.phoneDisplay && (
                <p className="text-xs text-base-content/70 truncate">{artist.phoneDisplay}</p>
              )}
            </div>
          )}
        </div>
      </Link>
    </div>
  )
}

export default ArtistCardSmall
