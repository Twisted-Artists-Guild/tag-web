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
import ThemeSwitcher from "@/components/Header/ThemeSwitcher"
import ThemeLogo from "@/components/ThemeLogo"
import { useLayout } from "@/components/LayoutProvider"
import { Bell, MessageSquare, ChevronUp, ChevronDown, Search } from "lucide-react"
import Image from "next/image"
import NotificationsDropdown from "@/components/Header/NotificationsDropdown" // Keep as dropdown for now
import MessagesApplet from "@/components/Header/MessagesApplet" // The new message applet
import BugReportControl from "@/components/forms/bug-report"
import { buildHeaderNotifications } from "@/components/Header/notification-items"

// Available themes
const themes = [
  "tag-theme",
  "neon",
  "light",
  "dark",
  "cupcake",
  "bumblebee",
  "emerald",
  "corporate",
  "synthwave",
  "retro",
  "valentine",
  "halloween",
  "garden",
  "aqua",
  "pastel",
  "fantasy",
  "black",
  "luxury",
  "dracula",
]

export default function Header() {
  const { data: session } = useSession() // Use session for user data
  const { isHeaderVisible, toggleHeader, isMobile, toggleLeftSidebar, isLeftSidebarVisible, theme, updateTheme } = useLayout()
  const router = useRouter()
  const [active, setActive] = useState("") // State for active navigation link
  const [isNotificationsDropdownOpen, setIsNotificationsDropdownOpen] = useState(false)
  const [isMessageAppletOpen, setIsMessageAppletOpen] = useState(false)
  const [reactionSummary, setReactionSummary] = useState({ count: 0, latestReaction: null })
  const [commentSummary, setCommentSummary] = useState({ count: 0, latestComment: null })
  const [messageSummary, setMessageSummary] = useState({ unreadMessages: 0, latestMessage: null })
  const [lastNotificationsSeenAt, setLastNotificationsSeenAt] = useState(null)
  const [includeSelfActions, setIncludeSelfActions] = useState(true)
  const [initialConversationId, setInitialConversationId] = useState(null)
  const [scrolled, setScrolled] = useState(false)
  const [isLoginOpen, setIsLoginOpen] = useState(false)
  const [isThemeOpen, setIsThemeOpen] = useState(false)
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

  const mobileNavOptions = useMemo(
    () => [
      { value: "/", label: "Homepage" },
      { value: "/art/", label: "Bloomscroll" },
      { value: "/artists", label: "Artists" },
      { value: "/events", label: "Events" },
      { value: "/blogs", label: "Blog" },
      { value: "/news", label: "News" },
      { value: "/contests/", label: "Contests" },
    ],
    [],
  )

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

  function handleActive(link) {
    setActive(link)
  }

  function closeAllPopups() {
    setIsNotificationsDropdownOpen(false)
    setIsMessageAppletOpen(false)
    setIsLoginOpen(false)
    setIsThemeOpen(false)
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

  function toggleTheme() {
    if (!isThemeOpen) closeAllPopups()
    setIsThemeOpen((open) => !open)
  }

  function getHeaderClassName() {
    const baseClasses = "flex justify-between items-center border-b border-base-300 w-full px-8 py-2 min-h-[88px]"
    if (theme === "tag-theme") {
      return `${baseClasses} header-paint-drip`
    }
    if (theme === "neon") {
      return `${baseClasses} header-neon-drip`
    }
    return baseClasses
  }

  function getTextColorClass(isActive = false) {
    const baseTextClass = "font-josefin-sans font-extrabold transition-all px-2 py-1 rounded-md backdrop-blur-sm"
    if (isActive) {
      return `${baseTextClass} text-primary enhanced-text-visibility bg-primary/10 border border-primary/20`
    }
    return `${baseTextClass} text-base-content enhanced-text-visibility bg-base-100/18 border border-base-content/10 hover:bg-base-100/24`
  }

  useEffect(() => {
    // Close mobile menu when route changes
    // setIsOpen(false) // This state is no longer used for mobile menu
  }, [router.asPath])

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 10)
    }
    window.addEventListener("scroll", handleScroll)
    return () => window.removeEventListener("scroll", handleScroll)
  }, [])

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

  const headerClass = getHeaderClassName()
  const mobileNavValue = useMemo(() => {
    const currentPath = String(router.asPath || router.pathname || "").split("?")[0].toLowerCase()
    const match = mobileNavOptions.find((option) => {
      const optionPath = option.value.toLowerCase()
      return currentPath === optionPath || currentPath.startsWith(`${optionPath.replace(/\/$/, "")}/`)
    })

    return match?.value || ""
  }, [mobileNavOptions, router.asPath, router.pathname])

  // Height of the header for popup offset
  const headerHeight = 88
  const popupStyle = {
    position: "fixed",
    top: `${headerHeight}px`,
    right: 0,
    zIndex: 100,
    width: "420px",
    maxWidth: "100vw",
    height: "calc(100vh - 88px)",
    boxShadow: '0 0 0 4px rgba(0,0,0,0.08), 0 8px 32px rgba(0,0,0,0.18)',
    borderLeft: "2px solid var(--color-base-300, var(--b3, #d1d5db))",
    background: "var(--color-base-100, var(--b1, #1a1a1a))",
    borderRadius: 0,
    display: isNotificationsDropdownOpen || isMessageAppletOpen ? "block" : "none"
  }

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

  return (
    <>
      {/* Header Toggle Button - Top Center of Screen when closed */}
      {!isHeaderVisible && (
        <button
          onClick={toggleHeader}
          className="fixed top-0 left-1/2 transform -translate-x-1/2 z-50 bg-primary text-primary-content px-4 py-2 rounded-b-lg shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105"
          aria-label="Show header"
        >
          <ChevronDown className="w-4 h-4" />
        </button>
      )}
      <header
        className={`w-full transition-all duration-300 ease-in-out ${
          isHeaderVisible ? "translate-y-0" : "-translate-y-full"
        } fixed top-0 left-0 right-0 z-40 ${scrolled ? "bg-base-100/95 backdrop-blur-md shadow-lg" : "bg-base-100"}`}
        style={{
          filter: 'drop-shadow(0 2px 8px rgba(21, 19, 24, 0.9)) drop-shadow(0 8px 24px color-mix(in srgb, var(--color-primary, #6233FF) 65%, transparent)) drop-shadow(0 12px 32px rgba(98, 51, 255, 0.3))'
        }}
      >
        {/* Single Header Layer */}
        <div className={headerClass}>
          {/* Left: Logo and Brand */}
          <div className="flex items-center space-x-2">
            <Link
              href="/"
              className="flex items-center px-2 py-1 rounded-md backdrop-blur-sm bg-base-100/18 border border-base-content/10 hover:bg-base-100/24 transition-all"
              onClick={() => setActive("")}
            >
              <ThemeLogo 
                src="/TAG OFFICIAL/LOGOS/HORIZONTAL (HOLLOW WHITE).png" 
                alt="Twisted Artists Guild" 
                width="w-48"
                height="h-14"
              />
            </Link>
            {isMobile && (
              <select
                className="select select-sm select-bordered max-w-42"
                value={mobileNavValue}
                aria-label="Main navigation"
                onChange={(event) => {
                  const nextPath = event.target.value
                  if (nextPath && nextPath !== mobileNavValue) {
                    router.push(nextPath)
                  }
                }}
              >
                <option value="" disabled>
                  Navigate
                </option>
                {mobileNavOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            )}
          </div>

          {/* Center: Main Navigation - Desktop */}
          <nav className="hidden lg:flex items-center space-x-6">
            {/* Search icon - opens sidebar and focuses search */}
            <button
              className="btn btn-ghost btn-sm btn-circle text-base-content enhanced-text-visibility"
              aria-label="Open search"
              onClick={() => {
                if (!isLeftSidebarVisible) toggleLeftSidebar()
                window.dispatchEvent(new CustomEvent("sidebarSearchFocus"))
              }}
            >
              <Search size={20} />
            </button>
            <Link
              href="/feed"
              className={`flex items-center ${getTextColorClass(active === "bloomscroll")} hover:opacity-80 transition-opacity`}
              onClick={() => handleActive("bloomscroll")}
              name="bloomscroll"
              title="Bloomscroll - Social Feed"
            >
              <div style={{
                filter: 'drop-shadow(0 1px 3px rgba(21, 19, 24, 0.6)) drop-shadow(0 4px 12px color-mix(in srgb, var(--color-primary, #6233FF) 85%, transparent))',
                display: 'flex',
                alignItems: 'center'
              }}>
                <Image
                  src="/BLOOMSCROLL OFFICIAL/LOGO/BS (HORIZONTAL) V1.png"
                  alt="Bloomscroll"
                  width={180}
                  height={34}
                  style={{ height: 'auto' }}
                />
              </div>
            </Link>
            <Link
              href="/art/"
              className={`text-lg ${getTextColorClass(active === "art")}`}
              onClick={() => handleActive("art")}
              name="art"
            >
              Browse
            </Link>
            <Link
              href="/artists"
              className={`text-lg ${getTextColorClass(active === "artist")}`}
              onClick={() => handleActive("artist")}
              name="artist"
            >
              Artists
            </Link>
            <Link
              href="/events"
              className={`text-lg ${getTextColorClass(active === "events")}`}
              onClick={() => handleActive("events")}
              name="events"
            >
              Events
            </Link>
            <Link
              href="/blogs"
              className={`text-lg ${getTextColorClass(active === "blog")}`}
              onClick={() => handleActive("blog")}
              name="blog"
            >
              Blog
            </Link>
            <Link
              href="/news"
              className={`text-lg ${getTextColorClass(active === "news")}`}
              onClick={() => handleActive("news")}
              name="news"
            >
              News
            </Link>
            <Link
              href="/contests/"
              className={`text-lg ${getTextColorClass(active === "contests")}`}
              onClick={() => handleActive("contests")}
              name="contests"
            >
              Contests
            </Link>
          </nav>

          {/* Right: User Controls */}
          <div className="flex items-center space-x-2">
            <BugReportControl />

            {/* Theme Switcher */}
            <ThemeSwitcher themes={themes} currentTheme={theme} onThemeChange={updateTheme} onToggle={toggleTheme} isOpen={isThemeOpen} />

            {/* Notifications & Messages - Only if user logged in */}
            {session?.user && ( // Use session.user for logged-in check
              <>
                <button
                  ref={messagesIconRef}
                  onClick={toggleMessageApplet}
                  className={`btn btn-ghost btn-sm btn-circle relative${isMessageAppletOpen ? " bg-primary text-primary-content ring-2 ring-primary/60 border border-primary/35" : " text-base-content enhanced-text-visibility bg-base-100/18 border border-base-content/10 hover:bg-base-100/24"}`}
                  style={messagesButtonStyle}
                  aria-label="Messages"
                >
                  <MessageSquare size={18} />
                  {unreadMessages > 0 && (
                    <span className="absolute -top-1 -right-1 text-white text-xs rounded-full h-4 w-4 flex items-center justify-center" style={{ backgroundColor: activeContextColor }}>
                      {unreadMessages}
                    </span>
                  )}
                </button>
                <button
                  ref={notificationsIconRef}
                  onClick={toggleNotificationsDropdown}
                  className={`btn btn-ghost btn-sm btn-circle relative${isNotificationsDropdownOpen ? " bg-primary text-primary-content ring-2 ring-primary/60 border border-primary/35" : " text-base-content enhanced-text-visibility bg-base-100/18 border border-base-content/10 hover:bg-base-100/24"}`}
                  style={notificationButtonStyle}
                  aria-label="Notifications"
                >
                  <Bell size={18} />
                  {notificationCount > 0 && (
                    <span className="absolute -top-1 -right-1 text-white text-xs rounded-full h-4 w-4 flex items-center justify-center" style={{ backgroundColor: activeContextColor }}>
                      {notificationCount}
                    </span>
                  )}
                </button>
              </>
            )}

            {/* Login Profile */}
            <LoginProfile
              className="text-base-content enhanced-text-visibility bg-base-100/18 border border-base-content/10 hover:bg-base-100/24"
              isOpen={isLoginOpen}
              onToggle={toggleLogin}
              activeContextId={activeContextId}
              onActiveContextChange={setActiveContextId}
              onContextSnapshotChange={handleContextSnapshotChange}
            />
          </div>
          {/* tag-theme visual treatment is handled with CSS pseudo-elements */}
        </div>

        {/* Header Close Button - Bottom Center when open */}
        {isHeaderVisible && (
          <button
            onClick={toggleHeader}
            className="absolute -bottom-3 left-1/2 transform -translate-x-1/2 bg-base-200 text-base-content hover:bg-base-300 px-3 py-1 rounded-b-lg border border-base-300 shadow-md transition-all duration-300 hover:scale-105"
            aria-label="Hide header"
          >
            <ChevronUp className="w-4 h-4" />
          </button>
        )}
      </header>
      {/* Header Spacer - Adjusted to match new header height */}
      {isHeaderVisible && <div className="h-28 w-full" />} {/* Adjusted from h-22 to h-28 */}
      {/* Messages Applet (fixed panel) */}
      {isMessageAppletOpen && !isNotificationsDropdownOpen && !isLoginOpen && !isThemeOpen && (
        <div style={popupStyle}>
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
      {/* Notifications Dropdown (simple dropdown) */}
      {isNotificationsDropdownOpen && !isMessageAppletOpen && !isLoginOpen && !isThemeOpen && (
        <div style={popupStyle}>
          <NotificationsDropdown
            activeContextColor={activeContextColor}
            notifications={notifications}
            onNotificationClick={handleNotificationClick}
            onClose={() => setIsNotificationsDropdownOpen(false)}
            isOpen={true}
          />
        </div>
      )}
      {/* Login Popup */}
      {isLoginOpen && !isThemeOpen && (
        <div style={popupStyle}>
          {/* Replace below with your actual login form or modal */}
          <div className="flex flex-col items-center justify-center h-full p-8">
            <h2 className="text-2xl font-bold mb-4">Sign In</h2>
            {/* Example login form placeholder */}
            <button className="btn btn-primary w-full" onClick={toggleLogin}>Sign in with Provider</button>
            <button className="btn btn-ghost mt-4" onClick={toggleLogin}>Cancel</button>
          </div>
        </div>
      )}
    </>
  )
}

