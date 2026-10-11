/* This file is part of the Twisted Artists Guild project.

 Copyright (C) 2025 Twisted Artists Guild

 Licensed under the GNU General Public License v3.0
 (https://www.gnu.org/licenses/gpl-3.0.en.html).

 This software comes with NO WARRANTY; see the license for details.

 Open source · low-profit · human-first*/

import FeatureCard from "@/components/homepage/FeatureCard"

const CardMembershipBenefits = ({ index = 0 }) => {
  return (
    <FeatureCard
      flip={index % 2 === 1}
      tag="Membership"
      title="Register as an Artist Member."
      image={{ src: "https://tagstatic.blob.core.windows.net/pexels/pexels-thfotodesign-3253724-artistpaintingmural3.jpg", alt: "Artist painting a large mural" }}
    >
      <p>
        Share your work, grow an audience, and sell directly through Guild-supported tools. A free tier for artists who
        simply want to share and have a link-tree profile will always be available.
      </p>
      <ul className="tag-checks">
        <li>A professional portfolio with an integrated storefront for each of your artist personas</li>
        <li>Flexible listings for originals, duplicates, editions, and merchandise</li>
        <li>Ongoing art contests that reward real engagement and lasting visibility</li>
        <li>Studio coordination, event production, and booking support</li>
      </ul>
    </FeatureCard>
  )
}

export default CardMembershipBenefits
