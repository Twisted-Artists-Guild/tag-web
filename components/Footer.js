/* This file is part of the Twisted Artists Guild project.

 Copyright (C) 2025 Twisted Artists Guild

 Licensed under the GNU General Public License v3.0
 (https://www.gnu.org/licenses/gpl-3.0.en.html).

 This software comes with NO WARRANTY; see the license for details.

 Open source · low-profit · human-first*/

import { useId } from "react"
import Link from "next/link"
import { MISSION_STATEMENT } from "@/components/MissionStatement"

// The TAG mark as one SVG path (viewBox 0 0 2144 1864), also the start shape of the landing morph mark
export const LOGO_D = "M460 161.25 A460 460 0 0 1 920 621.25 L920 662.25 A373 373 0 0 0 1293 1035.25 L1470.5 1035.25 A197.25 197.25 0 0 0 1667.75 838 A197.25 197.25 0 0 0 1470.5 640.75 L1387 640.75 A321 321 0 1 1 1708 319.75 L1708 406.25 A194.25 194.25 0 0 0 1902.25 600.5 A240.25 240.25 0 0 1 2142.5 840.75 A240.25 240.25 0 0 1 1902.25 1081 A194.25 194.25 0 0 0 1708 1275.25 L1708 1446.25 A417.25 417.25 0 0 1 1290.75 1863.5 A417.25 417.25 0 0 1 873.5 1446.25 A365 365 0 0 0 508.5 1081.25 L460 1081.25 A460 460 0 0 1 0 621.25 A460 460 0 0 1 460 161.25 Z"

const SOCIAL_LINKS = [
  {
    label: "Facebook",
    href: "https://www.facebook.com/twistedartistsguild/",
    icon: <path d="M14 8h3V4h-3c-2.8 0-4 1.8-4 4.3V10H7v4h3v8h4v-8h3l1-4h-4V8.6c0-.4.3-.6.6-.6z" fill="currentColor" />,
  },
  {
    label: "Instagram",
    href: "https://www.instagram.com/twistedartistsguild/",
    icon: (
      <g fill="none" stroke="currentColor" strokeWidth="2">
        <rect x="3" y="3" width="18" height="18" rx="5" />
        <circle cx="12" cy="12" r="4" />
        <circle cx="17.5" cy="6.5" r="1" fill="currentColor" />
      </g>
    ),
  },
  {
    label: "TikTok",
    href: "https://www.tiktok.com/@twistedartistsguild?lang=en",
    icon: <path d="M16 3c.4 2.3 1.9 3.8 4 4v3.2c-1.5 0-2.9-.4-4-1.2v6.3A6.3 6.3 0 1 1 9.7 9v3.3a3 3 0 1 0 3 3V3z" fill="currentColor" />,
  },
  {
    label: "YouTube",
    href: "https://www.youtube.com/@twistedartistsguild",
    icon: <path d="M22 8.2a3 3 0 0 0-2.1-2.1C18 5.6 12 5.6 12 5.6s-6 0-7.9.5A3 3 0 0 0 2 8.2 31 31 0 0 0 1.6 12a31 31 0 0 0 .4 3.8 3 3 0 0 0 2.1 2.1c1.9.5 7.9.5 7.9.5s6 0 7.9-.5a3 3 0 0 0 2.1-2.1c.3-1.3.4-2.5.4-3.8s-.1-2.5-.4-3.8zM10 15V9l5.2 3z" fill="currentColor" />,
  },
  {
    label: "LinkedIn",
    href: "https://www.linkedin.com/company/twistedartistsguild",
    icon: <path d="M4.5 3.5a2 2 0 1 1 0 4 2 2 0 0 1 0-4zM3 9h3v12H3zm6 0h3v1.7c.5-.9 1.7-2 3.6-2 3.4 0 4.4 2.2 4.4 5.2V21h-3v-6.3c0-1.6-.3-3-2.1-3s-2.4 1.3-2.4 3V21H9z" fill="currentColor" />,
  },
]

const LINK_COLUMNS = [
  {
    title: "About",
    links: [
      { href: "/about", label: "About" },
      { href: "/about/pricing", label: "Pricing" },
      { href: "/about/vendor", label: "Vendor" },
      { href: "/about/development", label: "Development" },
    ],
  },
  {
    title: "Policies",
    links: [
      { href: "/about/termsofservice", label: "Terms of Service" },
      { href: "/about/policies", label: "Guild Policies" },
      { href: "/about/codeofconduct", label: "Code of Conduct" },
    ],
  },
  {
    title: "Resources",
    links: [
      { href: "/contact", label: "Contact" },
      { href: "/careers", label: "Careers" },
      { href: "/portal", label: "Portals" },
    ],
  },
]

const LEGAL_LINKS = [
  { href: "/about/termsofservice", label: "Terms" },
  { href: "/about/policies/privacy-policy", label: "Privacy" },
  { href: "/about/codeofconduct", label: "Code of Conduct" },
]

/**
 * Footer component for website navigation and social media links
 * @returns {JSX.Element} Footer component
 */
export default function Footer() {
  const markGradientId = `tag-mark-${useId().replace(/:/g, "")}`

  return (
    <footer className="tag-footer">
      <div className="tag-container">
        <div className="tag-footer__grid">
          <div className="tag-footer__brand">
            <Link href="/" className="tag-footer__mark" aria-label="Twisted Artists Guild home">
              <svg className="tag-mark" viewBox="0 0 2144 1864" role="img" aria-label="Twisted Artists Guild">
                <defs>
                  <linearGradient id={markGradientId} x1="0" y1="0" x2="1" y2="1">
                    <stop offset="0" className="tag-mark__stop-1" />
                    <stop offset=".45" className="tag-mark__stop-2" />
                    <stop offset="1" className="tag-mark__stop-3" />
                  </linearGradient>
                </defs>
                <path fill={`url(#${markGradientId})`} fillRule="evenodd" d={LOGO_D} />
              </svg>
            </Link>
            <p>Empowering artists worldwide. Built by artists, for artists, so creativity can turn into sustainability.</p>
            <p className="tag-footer__mission">{MISSION_STATEMENT}</p>
            <ul className="tag-footer__socials">
              {SOCIAL_LINKS.map((social) => (
                <li key={social.label}>
                  <a href={social.href} target="_blank" rel="noopener noreferrer" aria-label={social.label}>
                    <svg viewBox="0 0 24 24" aria-hidden="true">{social.icon}</svg>
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {LINK_COLUMNS.map((column) => (
            <nav key={column.title} className="tag-footer__col" aria-label={column.title}>
              <h2>{column.title}</h2>
              <ul>
                {column.links.map((link) => (
                  <li key={link.href}>
                    <Link href={link.href}>{link.label}</Link>
                  </li>
                ))}
              </ul>
            </nav>
          ))}
        </div>

        <div className="tag-footer__bottom">
          <span>&copy; {new Date().getFullYear()} Twisted Artists Guild. All rights reserved.</span>
          <nav aria-label="Legal">
            {LEGAL_LINKS.map((link) => (
              <Link key={link.label} href={link.href}>{link.label}</Link>
            ))}
          </nav>
        </div>
      </div>
    </footer>
  )
}
