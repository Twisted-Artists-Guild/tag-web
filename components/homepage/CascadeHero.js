/* This file is part of the Twisted Artists Guild project.

 Copyright (C) 2025 Twisted Artists Guild

 Licensed under the GNU General Public License v3.0
 (https://www.gnu.org/licenses/gpl-3.0.en.html).

 This software comes with NO WARRANTY; see the license for details.

 Open source · low-profit · human-first*/

import Image from "next/image"
import MorphMark from "@/components/homepage/MorphMark"

/** Landing hero: the three-line cascade over the photo, with the TAG morph mark below */
export default function CascadeHero() {
  return (
    <section className="tag-cascade" aria-label="Featured messages">
      <Image
        src="/queencitycirque.jpg"
        alt=""
        fill
        preload
        fetchPriority="high"
        sizes="100vw"
        className="tag-cascade__photo"
      />
      <div className="tag-container tag-cascade__grid">
        <p className="tag-cascade__step tag-cascade__step--1">
          <span className="tag-cascade__tick" aria-hidden="true" />
          A platform made for artists, by artists.
        </p>
        <h1 className="tag-cascade__step tag-cascade__step--2">
          <span className="tag-grad-text">Building business solutions is our&nbsp;art.</span>
        </h1>
        <p className="tag-cascade__step tag-cascade__step--3">
          Enabling artists to create more.
          <span className="tag-cascade__tick" aria-hidden="true" />
        </p>
      </div>
      <MorphMark href="#bloom" />
    </section>
  )
}
