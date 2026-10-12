/* This file is part of the Twisted Artists Guild project.

 Copyright (C) 2025 Twisted Artists Guild

 Licensed under the GNU General Public License v3.0
 (https://www.gnu.org/licenses/gpl-3.0.en.html).

 This software comes with NO WARRANTY; see the license for details.

 Open source · low-profit · human-first*/

import IntroReel from "@/components/homepage/IntroReel"
import Link from "next/link"
import { BLOOMSCROLL_HREF } from "@/components/Header/nav-links"

/** "Tired of Doomscrolling?" section with the TAG Intro Reel */
const Hero = () => {
	return (
		<section className="tag-section tag-section--band" id="bloom">
			<div className="tag-container tag-split">
				<div data-reveal>
					<div className="tag-accent-bar" />
					<h2>
						Tired of <span className="tag-grad-text">Doomscrolling?</span>
					</h2>
					<p>
						Come Bloomscroll our endlessly flowing art feed to discover new work, react and comment, follow favorite
						artists, and stay connected to what&apos;s happening across the Guild.
					</p>
					<div className="tag-cta-row">
						<Link href={BLOOMSCROLL_HREF} className="btn btn-primary tag-bs-btn">
							<span className="tag-bs-mouse" aria-hidden="true">
								<i />
							</span>
							Start Bloomscrolling
						</Link>
						<Link href="/join" className="btn btn-outline">
							Register as a user
						</Link>
					</div>
				</div>
				<IntroReel />
			</div>
		</section>
	)
}

export default Hero
