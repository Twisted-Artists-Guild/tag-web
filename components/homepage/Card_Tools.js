/* This file is part of the Twisted Artists Guild project.

 Copyright (C) 2025 Twisted Artists Guild

 Licensed under the GNU General Public License v3.0
 (https://www.gnu.org/licenses/gpl-3.0.en.html).

 This software comes with NO WARRANTY; see the license for details.

 Open source · low-profit · human-first*/

import FeatureCard from "@/components/homepage/FeatureCard"

const CardTools = ({ index = 0 }) => {
  return (
    <FeatureCard
      flip={index % 2 === 1}
      tag="Toolkit"
      title="Artists deserve better resources."
      image={{ src: "https://tagstatic.blob.core.windows.net/pexels/pexels-valeriiamiller-3547625-artistpainting.jpg", alt: "Artist painting at an easel" }}
    >
      <p>We are building a practical business toolkit that helps artists run sustainable creative careers.</p>
      <ul className="tag-checks tag-checks--two">
        <li>Payments and POS</li>
        <li>Cost, margin, and pricing tools</li>
        <li>Mileage and expense tracking</li>
        <li>Budgeting, inventory, timesheets, payroll</li>
        <li>Invoices, deposits, receipts, contracts</li>
        <li>Project and event workflows</li>
        <li>CRM, campaigns and dashboards</li>
        <li className="tag-feature__more">And more to come!</li>
      </ul>
      <p className="tag-feature__note">Community feedback will directly shape our roadmap.</p>
    </FeatureCard>
  )
}

export default CardTools
