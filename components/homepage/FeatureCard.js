/* This file is part of the Twisted Artists Guild project.

 Copyright (C) 2025 Twisted Artists Guild

 Licensed under the GNU General Public License v3.0
 (https://www.gnu.org/licenses/gpl-3.0.en.html).

 This software comes with NO WARRANTY; see the license for details.

 Open source · low-profit · human-first*/

import Image from "next/image"

/**
 * Landing feature card: photo beside the copy. `flip` puts the photo on the right on wide screens.
 * @param {{ image: { src: string, alt: string, position?: string }, tag: string, flip?: boolean,
 *   title: string, children: React.ReactNode }} props
 */
export default function FeatureCard({ image, tag, flip = false, title, children }) {
  return (
    <article className={`tag-feature tag-g-edge${flip ? " tag-feature--flip" : ""}`} data-reveal>
      <div className="tag-feature__media">
        <Image
          src={image.src}
          alt={image.alt}
          fill
          sizes="(min-width: 900px) 600px, 100vw"
          style={image.position ? { objectPosition: image.position } : undefined}
        />
        <span className="tag-feature__tag">{tag}</span>
      </div>
      <div className="tag-feature__copy">
        <h3>{title}</h3>
        {children}
      </div>
    </article>
  )
}
