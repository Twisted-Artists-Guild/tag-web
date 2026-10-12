/* This file is part of the Twisted Artists Guild project.

 Copyright (C) 2025 Twisted Artists Guild

 Licensed under the GNU General Public License v3.0
 (https://www.gnu.org/licenses/gpl-3.0.en.html).

 This software comes with NO WARRANTY; see the license for details.

 Open source · low-profit · human-first*/


 "use client"

import "react-tooltip/dist/react-tooltip.css"
import dynamic from "next/dynamic"
import NextNProgress from "nextjs-progressbar"
import { Tooltip } from "react-tooltip"
import ErrorBoundary from "./ErrorBoundary"
import config from "@/config"
import Header from "@/components/Header/Header"
import Footer from "@/components/Footer"
import LeftSidebar from "@/components/Sidebar-left"
import RightSidebar from "@/components/Sidebar-right"
import localFont from "next/font/local"
import { Sora } from "next/font/google"
import { LayoutProvider, useLayout } from "./LayoutProvider"

// Body: Manrope, the TAG brand font. Headings: Sora. Both are served from our own domain.
const manrope = localFont({
  src: "../public/TAG OFFICIAL/FONT/Manrope (Variable Font Weight).ttf",
  weight: "200 800",
  display: "swap",
  fallback: ["system-ui", "sans-serif"],
})

const sora = Sora({
  subsets: ["latin"],
  weight: ["600", "700"],
  display: "swap",
})

const ClientToaster = dynamic(
  () => import("react-hot-toast").then((module) => module.Toaster),
  { ssr: false }
)

/**
 * Layout Content Component - The actual layout implementation
 */
function LayoutContent(props) {
  const { isLeftSidebarVisible, isRightSidebarVisible, isOverlay, closeSidebars } = useLayout()
  const { sidebarProps = {} } = props
  const { pageSections = [] } = sidebarProps || {}

  return (
    <ErrorBoundary>
      <style jsx global>{`
        :root {
          --tag-font-body: ${manrope.style.fontFamily};
          --tag-font-heading: ${sora.style.fontFamily};
        }
      `}</style>

      <NextNProgress color={config.colors.main} options={{ showSpinner: false }} />

      {/* data-*-open drive the push layout from 1280px */}
      <div
        className="site-shell flex min-h-screen flex-col"
        data-left-open={isLeftSidebarVisible ? "" : undefined}
        data-right-open={isRightSidebarVisible ? "" : undefined}
      >
        <Header pageSections={pageSections} />
        <LeftSidebar {...(sidebarProps?.leftSidebarData || {})} />
        <RightSidebar {...(sidebarProps?.rightSidebarData || {})} />

        {/* Below 1280px open panels overlay the page; the scrim closes them */}
        {isOverlay && (isLeftSidebarVisible || isRightSidebarVisible) ? (
          <button type="button" className="tag-scrim" aria-label="Close panel" tabIndex={-1} onClick={closeSidebars} />
        ) : null}

        <main className="site-main flex-1 p-4">
          <div className="site-main-inner">{props.children}</div>
        </main>

        <Footer />
      </div>

      <ClientToaster
        toastOptions={{
          duration: 3000,
        }}
      />

      <Tooltip id="tooltip" className="z-60 opacity-100! max-w-sm shadow-lg" />
    </ErrorBoundary>
  )
}

export default function Layout(props) {
  return (
    <LayoutProvider>
      <LayoutContent {...props} />
    </LayoutProvider>
  )
}
