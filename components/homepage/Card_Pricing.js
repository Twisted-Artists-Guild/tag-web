/* This file is part of the Twisted Artists Guild project.

 Copyright (C) 2025 Twisted Artists Guild

 Licensed under the GNU General Public License v3.0
 (https://www.gnu.org/licenses/gpl-3.0.en.html).

 This software comes with NO WARRANTY; see the license for details.

 Open source · low-profit · human-first*/

import Link from "next/link"
import FeatureCard from "@/components/homepage/FeatureCard"

const CardPricing = ({ index = 1 }) => {
  return (
    <FeatureCard
      flip={index % 2 === 1}
      tag="Pricing"
      title="Designed around maximizing your earnings."
      image={{ src: "https://tagstatic.blob.core.windows.net/pexels/pexels-jovanvasiljevic-32146479-merchandisesweater.jpg", alt: "Artist-designed merchandise sweater" }}
    >
      <p>
        Minimal monthly or annual dues, plus a small transaction fee on sales that already includes card processing. We
        earn a percentage, so our job is to maximize your sales, not nickel and dime you.
      </p>
      <p>
        À la carte services at cost plus a minimal margin: shipping discounts, group health insurance, liability
        insurance, and more, so that together we have real collective bargaining power.
      </p>
      <div className="tag-cta-row tag-feature__cta">
        <Link href="/about/pricing" className="btn btn-outline">
          View pricing
        </Link>
      </div>
    </FeatureCard>
  )
}

export default CardPricing
