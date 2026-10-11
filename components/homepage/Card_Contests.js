/* This file is part of the Twisted Artists Guild project.

 Copyright (C) 2025 Twisted Artists Guild

 Licensed under the GNU General Public License v3.0
 (https://www.gnu.org/licenses/gpl-3.0.en.html).

 This software comes with NO WARRANTY; see the license for details.

 Open source · low-profit · human-first*/

import Link from "next/link"
import FeatureCard from "@/components/homepage/FeatureCard"

const CardContests = ({ index = 2 }) => {
  return (
    <FeatureCard
      flip={index % 2 === 1}
      tag="Contests"
      title="Fun prompt contests."
      image={{ src: "https://tagstatic.blob.core.windows.net/pexels/pexels-joshsorenson-995301-drummer.jpg", alt: "Drummer performing" }}
    >
      <p>
        Monthly, quarterly, and annual art contests spotlight work through real community engagement. Prizes include
        being featured on the main page, cash, Guild-sponsored ad campaigns, and more.
      </p>
      <div className="tag-cta-row tag-feature__cta">
        <Link href="/contests" className="btn btn-outline">
          See current contests
        </Link>
      </div>
    </FeatureCard>
  )
}

export default CardContests
