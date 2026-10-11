/* This file is part of the Twisted Artists Guild project.

 Copyright (C) 2025 Twisted Artists Guild

 Licensed under the GNU General Public License v3.0
 (https://www.gnu.org/licenses/gpl-3.0.en.html).

 This software comes with NO WARRANTY; see the license for details.

 Open source · low-profit · human-first*/
"use client"

import { useState } from "react"
import Image from "next/image"

const VIMEO_SRC = "https://player.vimeo.com/video/1077782689?autoplay=1&dnt=1&title=0&byline=0"

/** TAG Intro Reel: a poster until Play, so Vimeo only loads when asked */
export default function IntroReel() {
  const [isPlaying, setIsPlaying] = useState(false)

  return (
    <div className="tag-reel tag-g-edge" data-reveal>
      {isPlaying ? (
        <iframe
          src={VIMEO_SRC}
          title="Twisted Artists Guild (TAG) Intro Reel"
          allow="autoplay; fullscreen; picture-in-picture"
          allowFullScreen
        />
      ) : (
        <>
          <Image
            src="/images/landing/tag-reel-poster.jpg"
            alt="Still from the Twisted Artists Guild intro reel"
            fill
            sizes="(min-width: 900px) 50vw, 100vw"
            className="tag-reel__poster"
          />
          <button
            type="button"
            className="tag-reel__play"
            aria-label="Play the Twisted Artists Guild intro reel (59 seconds)"
            onClick={() => setIsPlaying(true)}
          >
            <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
              <path d="M8 5.5v13l11-6.5z" />
            </svg>
          </button>
          <span className="tag-reel__caption">
            TAG Intro Reel <span>· 0:59</span>
          </span>
        </>
      )}
    </div>
  )
}
