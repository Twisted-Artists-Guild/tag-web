/* This file is part of the Twisted Artists Guild project.

 Copyright (C) 2025 Twisted Artists Guild

 Licensed under the GNU General Public License v3.0
 (https://www.gnu.org/licenses/gpl-3.0.en.html).

 This software comes with NO WARRANTY; see the license for details.

 Open source · low-profit · human-first*/

import Image from "next/image"
import Link from "next/link"
import { BLOOMSCROLL_HREF } from "@/components/Header/nav-links"

/** Landing "Please join us" panel */
export default function JoinPanel() {
  return (
    <section className="tag-join" aria-labelledby="tag-join-title">
      <div className="tag-container">
        <div className="tag-join__card tag-g-edge" data-reveal>
          <Image
            src="https://tagstatic.blob.core.windows.net/pexels/pexels-victorfreitas-733767-sultrysax.jpg"
            alt=""
            fill
            sizes="880px"
            className="tag-join__photo"
          />
          <h2 id="tag-join-title">Please join us</h2>
          <p>Discover art, follow creators, and support the work you love, or become an artist member and share your own work with the world.</p>
          <div className="tag-cta-row">
            <Link href="https://marketing.twistedartistsguild.com/membership-drive" className="btn btn-primary">
              Join the waitlist
            </Link>
            <Link href={BLOOMSCROLL_HREF} className="btn btn-outline">
              Bloomscroll
            </Link>
          </div>
        </div>
      </div>
    </section>
  )
}
