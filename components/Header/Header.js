/* This file is part of the Twisted Artists Guild project.

 Copyright (C) 2025 Twisted Artists Guild

 Licensed under the GNU General Public License v3.0
 (https://www.gnu.org/licenses/gpl-3.0.en.html).

 This software comes with NO WARRANTY; see the license for details.

 Open source · low-profit · human-first*/

"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { useRouter } from "next/router"
import Link from "next/link"
import { useSession } from "next-auth/react" // Using useSession for authentication
import LoginProfile from "@/components/Header/LoginProfile"
import { BROWSE_PANEL_ID, CART_PANEL_ID, useLayout } from "@/components/LayoutProvider"
import { useCart } from "@/components/cart/CartContext"
import { Bell, MessageSquare, ChevronUp, ChevronDown, Search, PanelLeft, ShoppingCart } from "lucide-react"
import Image from "next/image"
import NotificationsDropdown from "@/components/Header/NotificationsDropdown" // Keep as dropdown for now
import MessagesApplet from "@/components/Header/MessagesApplet" // The new message applet
import BugReportControl from "@/components/forms/bug-report"
import PalettePicker from "@/components/Header/PalettePicker"
import MobileMenu from "@/components/Header/MobileMenu"
import { buildHeaderNotifications } from "@/components/Header/notification-items"
import { BLOOMSCROLL_HREF, BLOOMSCROLL_LOGO, NAV_LINKS, TAG_LOGO } from "@/components/Header/nav-links"

export default function Header() {
  const { data: session } = useSession() // Use session for user data
  const { isHeaderVisible, toggleHeader, toggleLeftSidebar, isLeftSidebarVisible, toggleRightSidebar, isRightSidebarVisible } = useLayout()
  const { cartCount } = useCart()
  const router = useRouter()
  const headerRef = useRef(null)
  const menuId = "tag-mobile-menu"
  const [isNotificationsDropdownOpen, setIsNotificationsDropdownOpen] = useState(false)
  const [isMessageAppletOpen, setIsMessageAppletOpen] = useState(false)
  const [reactionSummary, setReactionSummary] = useState({ count: 0, latestReaction: null })
  const [commentSummary, setCommentSummary] = useState({ count: 0, latestComment: null })
  const [messageSummary, setMessageSummary] = useState({ unreadMessages: 0, latestMessage: null })
  const [lastNotificationsSeenAt, setLastNotificationsSeenAt] = useState(null)
  const [includeSelfActions, setIncludeSelfActions] = useState(true)
  const [initialConversationId, setInitialConversationId] = useState(null)
  const [isLoginOpen, setIsLoginOpen] = useState(false)
  const [isPaletteOpen, setIsPaletteOpen] = useState(false)
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const [contextSnapshot, setContextSnapshot] = useState({
    activeContext: null,
    availableContexts: [],
  })
  const [activeContextId, setActiveContextId] = useState(() => {
    if (typeof window !== "undefined") {
      try {
        return window.localStorage.getItem("tag:activeContextId")
      } catch {
        return null
      }
    }
    return null
  })

  const notificationsIconRef = useRef(null)
  const messagesIconRef = useRef(null)

  const userId = Number(session?.user?.id)
  const hasValidUserId = Number.isFinite(userId) && userId > 0

  const formatRelativeTime = useCallback((timestamp) => {
    if (!timestamp) {
      return "Just now"
    }

    const date = new Date(timestamp)
    if (Number.isNaN(date.getTime())) {
      return "Just now"
    }

    const deltaMs = Date.now() - date.getTime()
    const deltaMinutes = Math.floor(deltaMs / 60000)
    if (deltaMinutes < 1) {
      return "Just now"
    }

    if (deltaMinutes < 60) {
      return `${deltaMinutes}m ago`
    }

    const deltaHours = Math.floor(deltaMinutes / 60)
    if (deltaHours < 24) {
      return `${deltaHours}h ago`
    }

    const deltaDays = Math.floor(deltaHours / 24)
    return `${deltaDays}d ago`
  }, [])

  const refreshNotificationSummary = useCallback(async () => {
    if (!hasValidUserId) {
      return
    }

    const query = `userId=${encodeURIComponent(userId)}&windowMinutes=60&includeSelfActions=${includeSelfActions ? "true" : "false"}`

    try {
      const [reactionRes, commentRes, messageRes] = await Promise.all([
        fetch(`/api/impression/received-summary?${query}`),
        fetch(`/api/comments/received-summary?${query}`),
        fetch(`/api/conversations/unread-total?userId=${encodeURIComponent(userId)}`),
      ])

      const [reactionJson, commentJson, messageJson] = await Promise.all([
        reactionRes.ok ? reactionRes.json() : Promise.resolve(null),
        commentRes.ok ? commentRes.json() : Promise.resolve(null),
        messageRes.ok ? messageRes.json() : Promise.resolve(null),
      ])

      setReactionSummary({
        count: Number(reactionJson?.reactionCountLastHour || 0),
        latestReaction: reactionJson?.latestReaction || null,
      })

      setCommentSummary({
        count: Number(commentJson?.commentCountLastHour || 0),
        latestComment: commentJson?.latestComment || null,
      })

      setMessageSummary({
        unreadMessages: Number(messageJson?.unreadMessages || 0),
        latestMessage: messageJson?.latestMessage || null,
      })
    } catch (error) {
      console.error("Failed to load notification summaries:", error)
    }
  }, [hasValidUserId, includeSelfActions, userId])

  const notifications = useMemo(() => buildHeaderNotifications({
    reactionSummary,
    commentSummary,
    messageSummary,
    formatRelativeTime,
  }), [commentSummary, formatRelativeTime, messageSummary, reactionSummary])

  const socialNotifications = useMemo(
    () => notifications.filter((item) => item.type !== "messages"),
    [notifications],
  )

  const unseenSocialNotificationCount = useMemo(() => {
    if (isNotificationsDropdownOpen) {
      return 0
    }

    if (!lastNotificationsSeenAt) {
      return socialNotifications.length
    }

    const seenAtMs = new Date(lastNotificationsSeenAt).getTime()
    if (Number.isNaN(seenAtMs)) {
      return socialNotifications.length
    }

    return socialNotifications.filter((item) => {
      const createdAtMs = item?.createdAt ? new Date(item.createdAt).getTime() : NaN
      return !Number.isNaN(createdAtMs) && createdAtMs > seenAtMs
    }).length
  }, [isNotificationsDropdownOpen, lastNotificationsSeenAt, socialNotifications])

  const notificationCount = unseenSocialNotificationCount
  const unreadMessages = messageSummary.unreadMessages

  const serializeContextSnapshot = (snapshot) => {
    const contexts = snapshot?.availableContexts || []
    const activeContext = snapshot?.activeContext || null

    return JSON.stringify({
      activeId: activeContext?.id || null,
      contexts: contexts.map((context) => ({
        id: context.id,
        color: context.color,
        label: context.label,
        avatarUrl: context.avatarUrl,
        subtitle: context.subtitle,
        type: context.type,
      })),
    })
  }

  const handleContextSnapshotChange = useCallback((nextSnapshot) => {
    setContextSnapshot((currentSnapshot) => {
      const currentSignature = serializeContextSnapshot(currentSnapshot)
      const nextSignature = serializeContextSnapshot(nextSnapshot)

      if (currentSignature === nextSignature) {
        return currentSnapshot
      }

      return nextSnapshot
    })
  }, [])

  function closeAllPopups() {
    setIsNotificationsDropdownOpen(false)
    setIsMessageAppletOpen(false)
    setIsLoginOpen(false)
    setIsPaletteOpen(false)
    setIsMenuOpen(false)
  }

  function toggleMessageApplet() {
    if (!isMessageAppletOpen) closeAllPopups()
    setIsMessageAppletOpen((open) => !open)
  }

  function toggleNotificationsDropdown() {
    if (!isNotificationsDropdownOpen) {
      closeAllPopups()
      setLastNotificationsSeenAt(new Date().toISOString())
    }
    setIsNotificationsDropdownOpen((open) => !open)
  }

  function toggleLogin() {
    if (!isLoginOpen) closeAllPopups()
    setIsLoginOpen((open) => !open)
  }

  const togglePalette = useCallback(() => {
    setIsPaletteOpen((open) => {
      if (!open) {
        setIsNotificationsDropdownOpen(false)
        setIsMessageAppletOpen(false)
        setIsLoginOpen(false)
        setIsMenuOpen(false)
      }
      return !open
    })
  }, [])

  const closeMenu = useCallback(() => setIsMenuOpen(false), [])

  function toggleMenu() {
    if (!isMenuOpen) closeAllPopups()
    setIsMenuOpen((open) => !open)
  }

  // The header's bottom edge as --tag-sb-top, for the sidebars and header popups.
  // It changes while scrolling, because the notice bar scrolls away above the sticky header.
  useEffect(() => {
    let frame = 0
    const update = () => {
      frame = 0
      const bottom = isHeaderVisible && headerRef.current
        ? Math.max(0, Math.round(headerRef.current.getBoundingClientRect().bottom))
        : 0
      document.documentElement.style.setProperty("--tag-sb-top", `${bottom}px`)
    }
    const schedule = () => {
      if (!frame) frame = window.requestAnimationFrame(update)
    }
    update()
    window.addEventListener("scroll", schedule, { passive: true })
    window.addEventListener("resize", schedule)
    const observer = typeof ResizeObserver === "function" ? new ResizeObserver(schedule) : null
    if (observer && headerRef.current) observer.observe(headerRef.current)
    return () => {
      window.removeEventListener("scroll", schedule)
      window.removeEventListener("resize", schedule)
      observer?.disconnect()
      if (frame) window.cancelAnimationFrame(frame)
    }
  }, [isHeaderVisible])

  useEffect(() => {
    try {
      const stored = localStorage.getItem("tag.notifications.includeSelfActions")
      if (stored === "false") {
        setIncludeSelfActions(false)
      }
    } catch (error) {
      console.error("Failed to read includeSelfActions preference:", error)
    }
  }, [])

  useEffect(() => {
    refreshNotificationSummary()
  }, [refreshNotificationSummary])

  useEffect(() => {
    const handleRealtimeNotification = (event) => {
      const update = event?.detail || {}
      const updateType = String(update.type || "").toLowerCase()

      if (updateType === "reactions") {
        setReactionSummary({
          count: Number(update.reactionCountLastHour || 0),
          latestReaction: update.latestReaction || null,
        })
        return
      }

      if (updateType === "comments") {
        setCommentSummary({
          count: Number(update.commentCountLastHour || 0),
          latestComment: update.latestComment || null,
        })
        return
      }

      if (updateType === "messages") {
        setMessageSummary({
          unreadMessages: Number(update.unreadMessages || 0),
          latestMessage: update.latestMessage || null,
        })
        return
      }

      refreshNotificationSummary()
    }

    const handleReconnect = () => {
      refreshNotificationSummary()
    }

    window.addEventListener("signalr:notification", handleRealtimeNotification)
    window.addEventListener("signalr:reconnected", handleReconnect)

    return () => {
      window.removeEventListener("signalr:notification", handleRealtimeNotification)
      window.removeEventListener("signalr:reconnected", handleReconnect)
    }
  }, [refreshNotificationSummary])

  useEffect(() => {
    const conversationFromQuery = router?.query?.conversationId
    const nextConversationId = Array.isArray(conversationFromQuery)
      ? conversationFromQuery[0]
      : conversationFromQuery

    if (nextConversationId) {
      setInitialConversationId(String(nextConversationId))
      setIsNotificationsDropdownOpen(false)
      setIsMessageAppletOpen(true)
    }
  }, [router?.query?.conversationId])

  const onRouteClose = useCallback(() => {
    setIsNotificationsDropdownOpen(false)
    setIsMessageAppletOpen(false)
  }, [])

  const handleNotificationClick = useCallback((notification, event) => {
    if (notification?.type === "messages" && notification?.conversationId) {
      event.preventDefault()
      closeAllPopups()
      setInitialConversationId(String(notification.conversationId))
      setIsMessageAppletOpen(true)
      return
    }

    onRouteClose()
  }, [onRouteClose])

  useEffect(() => {
    const contexts = contextSnapshot?.availableContexts || []
    if (contexts.length === 0) {
      return
    }

    let savedId = null
    try {
      if (typeof window !== "undefined") {
        savedId = window.localStorage.getItem("tag:activeContextId")
      }
    } catch {
      // Ignore localStorage errors
    }

    const targetId = savedId || activeContextId
    const targetExists = targetId && contexts.some((c) => c.id === targetId)

    if (targetExists && activeContextId !== targetId) {
      setActiveContextId(targetId)
    } else if (!targetExists && !savedId) {
      if (!activeContextId || !contexts.some((c) => c.id === activeContextId)) {
        setActiveContextId(contextSnapshot?.activeContext?.id || contexts[0].id)
      }
    }
  }, [activeContextId, contextSnapshot])

  const resolvedActiveContext = (contextSnapshot?.availableContexts || []).find((context) => context.id === activeContextId)
    || contextSnapshot?.activeContext
    || contextSnapshot?.availableContexts?.[0]
    || null

  const activeContextColor = resolvedActiveContext?.color || "#3B82F6"
  const notificationButtonStyle = notificationCount > 0
    ? {
        boxShadow: `0 0 0 2px ${activeContextColor}66, 0 0 14px ${activeContextColor}88`,
        animation: "pulse 1.8s ease-in-out infinite",
      }
    : undefined
  const messagesButtonStyle = unreadMessages > 0
    ? {
        boxShadow: `0 0 0 2px ${activeContextColor}66, 0 0 14px ${activeContextColor}88`,
        animation: "pulse 1.8s ease-in-out infinite",
      }
    : undefined

  const messagesCurrentUser = resolvedActiveContext
    ? {
        id: resolvedActiveContext.id,
        username: (resolvedActiveContext.subtitle || resolvedActiveContext.label || "user")
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, "_")
          .replace(/^_+|_+$/g, "") || "user",
        displayName: resolvedActiveContext.label,
        avatarUrl: resolvedActiveContext.avatarUrl || session?.user?.image || "/images/default-avatar.png",
        color: resolvedActiveContext.color || "#3B82F6",
        isAdmin: String(resolvedActiveContext.type || "").toLowerCase() === "admin",
      }
    : null

  // The nav link for the current page or one of its sub-pages
  const currentPath = router.asPath.split(/[?#]/)[0].replace(/\/+$/, "").toLowerCase() || "/"
  const activeHref = NAV_LINKS.find((link) => {
    const target = link.href.replace(/\/+$/, "").toLowerCase()
    return currentPath === target || currentPath.startsWith(`${target}/`)
  })?.href

  return (
    <>
      {/* Collapsed header: a small pill brings it back */}
      {!isHeaderVisible && (
        <button type="button" onClick={toggleHeader} className="tag-header-pill tag-header-pill--show" aria-label="Show header">
          <ChevronDown aria-hidden="true" />
        </button>
      )}
      <header ref={headerRef} className={`tag-header${isHeaderVisible ? "" : " is-hidden"}`}>
        <div className="tag-container">
          <nav className="tag-header__nav" aria-label="Main">
            <Link href="/" className="tag-header__brand" aria-label="Twisted Artists Guild home">
              <Image src={TAG_LOGO} alt="" width={137} height={34} loading="eager" className="tag-logo" />
            </Link>

            <ul className="tag-header__links">
              <li>
                <Link href={BLOOMSCROLL_HREF} className="tag-header__bloom" aria-label="Bloomscroll, the art feed">
                  <Image src={BLOOMSCROLL_LOGO} alt="" width={97} height={18} className="tag-logo" />
                </Link>
              </li>
              {NAV_LINKS.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="tag-header__link"
                    aria-current={link.href === activeHref ? "page" : undefined}
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>

            <div className="tag-header__actions">
              <button
                type="button"
                className="tag-icon-btn tag-header__wide-only"
                aria-label="Search"
                onClick={() => {
                  if (!isLeftSidebarVisible) toggleLeftSidebar(true)
                  window.dispatchEvent(new CustomEvent("sidebarSearchFocus"))
                }}
              >
                <Search aria-hidden="true" />
              </button>

              <span className="tag-header__bug">
                <BugReportControl />
              </span>

              <span className="tag-header__wide-only">
                <PalettePicker isOpen={isPaletteOpen} onToggle={togglePalette} />
              </span>

              {/* Notifications & Messages - Only if user logged in */}
              {session?.user && (
                <>
                  <button
                    ref={messagesIconRef}
                    type="button"
                    onClick={toggleMessageApplet}
                    className="tag-icon-btn"
                    style={messagesButtonStyle}
                    aria-label={unreadMessages > 0 ? `Messages, ${unreadMessages} unread` : "Messages"}
                    aria-expanded={isMessageAppletOpen}
                  >
                    <MessageSquare aria-hidden="true" />
                    {unreadMessages > 0 && (
                      <span className="tag-count tag-header__count" style={{ background: activeContextColor }} aria-hidden="true">
                        {unreadMessages}
                      </span>
                    )}
                  </button>
                  <button
                    ref={notificationsIconRef}
                    type="button"
                    onClick={toggleNotificationsDropdown}
                    className="tag-icon-btn"
                    style={notificationButtonStyle}
                    aria-label={notificationCount > 0 ? `Notifications, ${notificationCount} new` : "Notifications"}
                    aria-expanded={isNotificationsDropdownOpen}
                  >
                    <Bell aria-hidden="true" />
                    {notificationCount > 0 && (
                      <span className="tag-count tag-header__count" style={{ background: activeContextColor }} aria-hidden="true">
                        {notificationCount}
                      </span>
                    )}
                  </button>
                </>
              )}

              {/* Account. Signed out, Sign In moves into the menu below 1060px */}
              <div className={`tag-header__account${session?.user ? "" : " tag-header__wide-only"}`}>
                <LoginProfile
                  className=""
                  isOpen={isLoginOpen}
                  onToggle={toggleLogin}
                  activeContextId={activeContextId}
                  onActiveContextChange={setActiveContextId}
                  onContextSnapshotChange={handleContextSnapshotChange}
                />
              </div>

              {/* Below 1060px these open the panels instead of the edge tabs */}
              <button
                type="button"
                className="tag-icon-btn tag-header__narrow-only"
                aria-label="Open browse panel"
                aria-controls={BROWSE_PANEL_ID}
                aria-expanded={isLeftSidebarVisible}
                onClick={() => toggleLeftSidebar()}
              >
                <PanelLeft aria-hidden="true" />
              </button>
              <button
                type="button"
                className="tag-icon-btn tag-header__narrow-only"
                aria-label={cartCount > 0 ? `Open cart, ${cartCount} items` : "Open cart"}
                aria-controls={CART_PANEL_ID}
                aria-expanded={isRightSidebarVisible}
                onClick={() => toggleRightSidebar()}
              >
                <ShoppingCart aria-hidden="true" />
                {cartCount > 0 && <span className="tag-count tag-header__count" aria-hidden="true">{cartCount}</span>}
              </button>
              <button
                type="button"
                className="tag-icon-btn tag-header__narrow-only tag-hamburger"
                aria-label={isMenuOpen ? "Close menu" : "Open menu"}
                aria-expanded={isMenuOpen}
                aria-controls={menuId}
                onClick={toggleMenu}
              >
                <span aria-hidden="true" />
                <span aria-hidden="true" />
                <span aria-hidden="true" />
              </button>
            </div>
          </nav>

          <MobileMenu id={menuId} open={isMenuOpen} onClose={closeMenu} isSignedIn={Boolean(session?.user)} activeHref={activeHref} />
        </div>

        {/* Collapse the header */}
        {isHeaderVisible && (
          <button type="button" onClick={toggleHeader} className="tag-header-pill" aria-label="Hide header">
            <ChevronUp aria-hidden="true" />
          </button>
        )}
      </header>

      {/* Messages Applet (fixed panel under the header) */}
      {isMessageAppletOpen && !isNotificationsDropdownOpen && !isLoginOpen && (
        <div className="tag-header-popup">
          <MessagesApplet
            key={`messages-${initialConversationId || "default"}`}
            isOpen={isMessageAppletOpen}
            onClose={toggleMessageApplet}
            currentUser={messagesCurrentUser}
            initialConversationId={initialConversationId}
            contextProfiles={contextSnapshot?.availableContexts || []}
            activeContextId={activeContextId || resolvedActiveContext?.id || null}
            onContextChange={(nextContextId) => {
              if (nextContextId && nextContextId !== activeContextId) {
                setActiveContextId(nextContextId)
                if (typeof window !== "undefined") {
                  window.localStorage.setItem("tag:activeContextId", nextContextId)
                  window.location.reload()
                }
              }
            }}
          />
        </div>
      )}
      {/* Notifications Dropdown (fixed panel under the header) */}
      {isNotificationsDropdownOpen && !isMessageAppletOpen && !isLoginOpen && (
        <div className="tag-header-popup">
          <NotificationsDropdown
            activeContextColor={activeContextColor}
            notifications={notifications}
            onNotificationClick={handleNotificationClick}
            onClose={() => setIsNotificationsDropdownOpen(false)}
            isOpen={true}
          />
        </div>
      )}
    </>
  )
}
