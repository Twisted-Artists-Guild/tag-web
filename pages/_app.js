/* This file is part of the Twisted Artists Guild project.

 Copyright (C) 2025 Twisted Artists Guild

 Licensed under the GNU General Public License v3.0
 (https://www.gnu.org/licenses/gpl-3.0.en.html).

 This software comes with NO WARRANTY; see the license for details.

 Open source · low-profit · human-first*/
"use client"

import { SessionProvider } from "next-auth/react"
import { useRouter } from "next/router"
import "@/styles/globals.css"
import EnhancedLayout from "@/components/MyLayout"
import { AppWrapper } from "@/components/Context"
import TagSEO from "@/components/TagSEO"
import { useEffect } from "react"
import { ApplicationInsights } from "@microsoft/applicationinsights-web"
import { MessagingRealtimeProvider } from '@/components/messaging/MessagingRealtimeProvider'
import { CartProvider } from "@/components/cart/CartContext"
import NoticeBar from "@/components/NoticeBar"

// Flag to prevent multiple initializations across hot reloads
let appInsightsInitialized = false
const SCROLL_ROOT_SELECTORS = [".site-main", "main", "#__next"]

const appInsights = new ApplicationInsights({
  config: {
    instrumentationKey: process.env.NEXT_PUBLIC_APPINSIGHTS,
  },
})

/**
 * Enhanced App Component - keeps your original structure but adds collapsible layout
 */
export default function App({ Component, pageProps: { session, sidebarProps, ...pageProps } }) {
  const router = useRouter()

  // Allow pages to override the default layout if needed
  const getLayout = Component.getLayout || ((page) => page)

  // Initialize Application Insights
  useEffect(() => {
    if (!appInsightsInitialized) {
      const connectionString = process.env.APPINSIGHTS || process.env.NEXT_PUBLIC_APPINSIGHTS

      if (connectionString) {
        try {
          const instrumentationKeyMatch = connectionString.match(/InstrumentationKey=([^;]+)/)
          const instrumentationKey = instrumentationKeyMatch ? instrumentationKeyMatch[1] : null

          if (instrumentationKey) {
            appInsights.config.instrumentationKey = instrumentationKey
            appInsights.loadAppInsights()
            appInsightsInitialized = true
            console.log("Application Insights initialized successfully")
          } else {
            console.error("Error: Unable to extract InstrumentationKey from Application Insights connection string.")
          }
        } catch (error) {
          console.error("Error initializing Application Insights:", error)
        }
      } else {
        console.warn("Application Insights connection string not found. Telemetry disabled.")
      }
    }
  }, [Component])

  useEffect(() => {
    if (!router?.events || typeof window === "undefined") {
      return
    }

    if ("scrollRestoration" in window.history) {
      window.history.scrollRestoration = "manual"
    }

    const getSectionIdFromUrl = (rawUrl) => {
      const targetUrl = new URL(String(rawUrl || router.asPath || "/"), window.location.origin)
      const hashTarget = decodeURIComponent(String(targetUrl.hash || "").replace(/^#/, "")).trim()
      const queryTarget = decodeURIComponent(String(targetUrl.searchParams.get("section") || "")).trim()
      return hashTarget || queryTarget
    }

    const scrollAllRootsToTop = () => {
      window.scrollTo({ top: 0, left: 0, behavior: "auto" })
      document.documentElement.scrollTop = 0
      document.body.scrollTop = 0

      SCROLL_ROOT_SELECTORS.forEach((selector) => {
        const node = document.querySelector(selector)
        if (node && typeof node.scrollTo === "function") {
          node.scrollTo({ top: 0, left: 0, behavior: "auto" })
        } else if (node) {
          node.scrollTop = 0
          node.scrollLeft = 0
        }
      })
    }

    const scrollToSection = (sectionId) => {
      const target = document.getElementById(sectionId)
      if (!target) {
        return false
      }

      target.scrollIntoView({ behavior: "auto", block: "start" })
      return true
    }

    const applyNavigationScroll = (url) => {
      const sectionId = getSectionIdFromUrl(url)

      if (!sectionId) {
        scrollAllRootsToTop()
        window.requestAnimationFrame(scrollAllRootsToTop)
        return
      }

      if (scrollToSection(sectionId)) {
        return
      }

      window.requestAnimationFrame(() => {
        if (!scrollToSection(sectionId)) {
          scrollAllRootsToTop()
        }
      })
    }

    router.events.on("routeChangeComplete", applyNavigationScroll)
    router.events.on("hashChangeComplete", applyNavigationScroll)

    return () => {
      router.events.off("routeChangeComplete", applyNavigationScroll)
      router.events.off("hashChangeComplete", applyNavigationScroll)
    }
  }, [router])

  const canonicalSlug = (router.asPath || "/").split("?")[0].split("#")[0].replace(/^\//, "")
  const fallbackTitle = canonicalSlug
    ? `${canonicalSlug.replace(/[-_/]/g, " ")} | Twisted Artists Guild`
    : "Twisted Artists Guild"
  const fallbackSeo = {
    title: fallbackTitle,
    description: "A creator-focused community and marketplace for artists and supporters.",
    keywords: "artists, art community, marketplace",
    og: {
      title: fallbackTitle,
      description: "A creator-focused community and marketplace for artists and supporters.",
    },
  }

  return (
    <SessionProvider session={session}>
      <CartProvider>
        <MessagingRealtimeProvider>
          <NoticeBar />

          {/* Enhanced Layout with your original structure */}
          {getLayout(
            <AppWrapper>
              <EnhancedLayout sidebarProps={sidebarProps}>
                <TagSEO metadataProp={fallbackSeo} canonicalSlug={canonicalSlug} />
                <Component {...pageProps} />
              </EnhancedLayout>
            </AppWrapper>,
          )}
        </MessagingRealtimeProvider>
      </CartProvider>
    </SessionProvider>
  )
}

