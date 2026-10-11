/* This file is part of the Twisted Artists Guild project.

 Copyright (C) 2025 Twisted Artists Guild

 Licensed under the GNU General Public License v3.0
 (https://www.gnu.org/licenses/gpl-3.0.en.html).

 This software comes with NO WARRANTY; see the license for details.

 Open source · low-profit · human-first*/
"use client"

import { useEffect } from "react"
import Image from "next/image"
import Link from "next/link"
import { useRouter } from "next/router"
import { signIn } from "next-auth/react"
import PalettePicker from "@/components/Header/PalettePicker"
import BugReportControl from "@/components/forms/bug-report"
import { BLOOMSCROLL_HREF, BLOOMSCROLL_LOGO, NAV_LINKS } from "@/components/Header/nav-links"

/**
 * Mobile menu under the header (below 1060px).
 * @param {{ id: string, open: boolean, onClose: () => void, isSignedIn: boolean, activeHref?: string }} props
 */
export default function MobileMenu({ id, open, onClose, isSignedIn, activeHref }) {
  const router = useRouter()

  // Close on navigation and on Escape
  useEffect(() => {
    if (!open) return undefined

    function handleKeyDown(event) {
      if (event.key === "Escape") {
        event.preventDefault()
        onClose()
      }
    }

    router.events.on("routeChangeStart", onClose)
    document.addEventListener("keydown", handleKeyDown, true)
    return () => {
      router.events.off("routeChangeStart", onClose)
      document.removeEventListener("keydown", handleKeyDown, true)
    }
  }, [open, onClose, router.events])

  return (
    <div id={id} className={`tag-mobile-menu${open ? " is-open" : ""}`} hidden={!open}>
      <Link href={BLOOMSCROLL_HREF} className="tag-mobile-menu__bloom tag-g-edge" style={{ "--i": 0 }}>
        <Image src={BLOOMSCROLL_LOGO} alt="Bloomscroll" width={97} height={18} className="tag-logo" />
      </Link>
      <ul className="tag-mobile-menu__links">
        {NAV_LINKS.map((link, index) => (
          <li key={link.href} style={{ "--i": index + 1 }}>
            <Link href={link.href} aria-current={link.href === activeHref ? "page" : undefined}>
              {link.label}
            </Link>
          </li>
        ))}
      </ul>
      {open ? (
        <>
          <PalettePicker variant="inline" />
          <div className="tag-mobile-menu__row">
            <BugReportControl />
            {isSignedIn ? null : (
              <button type="button" className="btn btn-primary" onClick={() => signIn()}>
                Sign in
              </button>
            )}
          </div>
        </>
      ) : null}
    </div>
  )
}
