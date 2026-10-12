/* This file is part of the Twisted Artists Guild project.

 Copyright (C) 2025 Twisted Artists Guild

 Licensed under the GNU General Public License v3.0
 (https://www.gnu.org/licenses/gpl-3.0.en.html).

 This software comes with NO WARRANTY; see the license for details.

 Open source · low-profit · human-first*/



"use client"

import { useEffect, useRef } from "react"

import TagSEO from "@/components/TagSEO"
import CascadeHero from "@/components/homepage/CascadeHero"
import Hero from "@/components/homepage/Hero"
import CardTools from "@/components/homepage/Card_Tools"
import CardMembershipBenefits from "@/components/homepage/Card_membership_benefits"
import CardContests from "@/components/homepage/Card_Contests"
import CardPricing from "@/components/homepage/Card_Pricing"
import CardBloomscroll from "@/components/homepage/Card_Bloomscroll"
import FAQ from "@/components/homepage/FAQ"
import JoinPanel from "@/components/homepage/JoinPanel"

/**
 * Home/index page component
 * Serves as the landing page for the site
 *
 * @returns {JSX.Element} Home page component with hero, feature cards, FAQ, and join panel
 */
export default function Home() {
  const pageRef = useRef(null)

  // Fade [data-reveal] sections in once as they scroll into view. Without JS the CSS never hides them.
  useEffect(() => {
    const elements = Array.from(pageRef.current?.querySelectorAll("[data-reveal]") || [])
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches || !("IntersectionObserver" in window)) {
      elements.forEach((element) => element.classList.add("is-in"))
      return undefined
    }

    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("is-in")
          observer.unobserve(entry.target)
        }
      })
    }, { rootMargin: "0px 0px -8% 0px" })

    elements.forEach((element) => observer.observe(element))
    return () => observer.disconnect()
  }, [])

  const pageMetaData = {
    title: "Discover Artists, Events, and Creative Tools",
    description: "Browse artist portfolios, discover original work, and grow your creative business with creator-first tools for payments, POS, pricing, budgeting, payroll, accounting, project workflows, event management, CRM, and marketing.",
    keywords: "artists, art, artisan crafts, makerspace, portfolios, art marketplace, creative community, events, contests, creator tools, business tools, payments, online payments, point of sale, pos, cost calculator, margin calculator, pricing tools, mileage tracking, expense tracking, budgeting, inventory management, timesheets, payroll, invoices, deposits, receipts, contracts, project management, event management, crm, marketing campaigns, performance dashboards, accounting, double entry accounting, b2b2c, b2b, b2c, paintings, sculpture, digital design, performance art, photography, illustration, mixed media, ceramics, pottery, printmaking, textile art, fiber art, woodworking, metalwork, jewelry, glass art, street art, mural art, installation art, music, dance, theater, spoken word, film, animation",
    robots: "index, follow",
    author: "Bobb Shields",
    viewport: "width=device-width, initial-scale=1.0",
    og: {
      title: "Creator-First Art Community",
      description: "Discover artists, original work, and practical business tools built for sustainable creative growth across visual, digital, craft, and performance arts.",
    },
  }

  return (
    <div ref={pageRef} className="tag-landing tag-reveal-scope">
      <TagSEO metadataProp={pageMetaData} canonicalSlug="" />

      <CascadeHero />
      <Hero />

      <section className="tag-section" aria-labelledby="tag-features-title">
        <div className="tag-container">
          <div className="tag-section-head" data-reveal>
            <div className="tag-accent-bar" />
            <h2 id="tag-features-title">Everything an artist needs, in one guild</h2>
            <p>Tools, membership, visibility and fair pricing, built around artists rather than advertisers.</p>
          </div>
          <div className="tag-features">
            <CardTools index={0} />
            <CardMembershipBenefits index={1} />
            <CardContests index={2} />
            <CardPricing index={3} />
            <CardBloomscroll index={4} />
          </div>
        </div>
      </section>

      <FAQ />
      <JoinPanel />
    </div>
  )
}
// Use getInitialProps to pass sidebar data like other pages
Home.getInitialProps = async () => {
  // Sample data for left sidebar (navigation/filtering)
  const leftSidebarData = {
    /*
    artists: [
      {
        id: 1,
        name: "Sarah Chen",
        avatar: getRandomStockPhotoByCategory('artist'),
        specialty: "Digital Art",
        rating: 4.9,
        location: "San Francisco, CA",
      },
      {
        id: 2,
        name: "Marcus Rodriguez",
        avatar: getRandomStockPhotoByCategory('artist'),
        specialty: "Sculpture",
        rating: 4.8,
        location: "Austin, TX",
      },
      {
        id: 3,
        name: "Elena Volkov",
        avatar: getRandomStockPhotoByCategory('artist'),
        specialty: "Photography",
        rating: 4.9,
        location: "New York, NY",
      },
    ],
    filters: [
      { label: "All Categories", value: "all" },
      { label: "Digital Art", value: "digital" },
      { label: "Traditional Art", value: "traditional" },
      { label: "Photography", value: "photography" },
      { label: "Sculpture", value: "sculpture" },
      { label: "Performance", value: "performance" },
    ],*/
  }

  // Sample data for right sidebar (cart/stories)
  const rightSidebarData = {
    cartItems: [
     /* 
      {
        
        id: 1,
        name: "Digital Portrait Commission",
        price: 150.0,
        quantity: 1,
        image: getRandomStockPhotoByCategory('painting'),
        artist: "Sarah Chen",
      },
      {
        id: 2,
        name: "Custom Sculpture",
        price: 450.0,
        quantity: 1,
        image: getRandomStockPhotoByCategory('painting'),
        artist: "Marcus Rodriguez",
      },
      {
        id: 3,
        name: "Photography Print Set",
        price: 75.0,
        quantity: 2,
        image: getRandomStockPhotoByCategory('general'),
        artist: "Elena Volkov",
      },
      */
    ],
    stories: [
      /*
      {
        id: 1,
        author: "You",
        avatar: getRandomStockPhotoByCategory('artist'),
        content: "Just finished my latest digital piece! Really excited about the color palette I chose.",
        timestamp: "2 hours ago",
      },
      {
        id: 2,
        author: "Sarah Chen",
        avatar: getRandomStockPhotoByCategory('artist'),
        content: "Working on a new commission today. The client wants something really unique!",
        timestamp: "4 hours ago",
      },
      {
        id: 3,
        author: "Marcus Rodriguez",
        avatar: getRandomStockPhotoByCategory('artist'),
        content: "Found some amazing clay at the local art supply store. Can't wait to start sculpting!",
        timestamp: "1 day ago",
      },
          */
    ],
  }

  return {
    sidebarProps: {
      leftSidebarData,
      rightSidebarData,
    },
  }
}

