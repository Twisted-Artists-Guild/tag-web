/* This file is part of the Twisted Artists Guild project.

 Copyright (C) 2025 Twisted Artists Guild

 Licensed under the GNU General Public License v3.0
 (https://www.gnu.org/licenses/gpl-3.0.en.html).

 This software comes with NO WARRANTY; see the license for details.

 Open source · low-profit · human-first*/
"use client"

import { useEffect, useState } from "react"

export const DEV_BANNER_DISMISS_KEY = "tag_dev_banner_dismiss_until"
// The head script in _document adds this class to <html> before first paint when dismissed
export const NOTICE_HIDDEN_CLASS = "tag-notice-hidden"
const DEV_BANNER_RESHOW_MS = 5 * 60 * 1000

/** Early-access notice above the header. Dismissing hides it for 5 minutes on this device. */
export default function NoticeBar() {
  // Dev uptime starts at 0 so the server and the first client render match
  const [nowMs, setNowMs] = useState(0)

  useEffect(() => {
    const now = Date.now()
    const timer = window.setTimeout(() => setNowMs(now), 0)
    let dismissUntilMs = 0
    try {
      dismissUntilMs = Number(window.localStorage.getItem(DEV_BANNER_DISMISS_KEY) || "0")
    } catch {
      // Storage blocked: treat as not dismissed
    }
    if (!Number.isFinite(dismissUntilMs) || dismissUntilMs <= now) {
      return () => window.clearTimeout(timer)
    }

    // Bring the bar back when the 5 minutes are up
    const restoreTimer = window.setTimeout(() => {
      try {
        window.localStorage.removeItem(DEV_BANNER_DISMISS_KEY)
      } catch {
        // Storage blocked: nothing to clear
      }
      document.documentElement.classList.remove(NOTICE_HIDDEN_CLASS)
    }, dismissUntilMs - now)

    return () => {
      window.clearTimeout(timer)
      window.clearTimeout(restoreTimer)
    }
  }, [])

  function dismiss() {
    try {
      window.localStorage.setItem(DEV_BANNER_DISMISS_KEY, String(Date.now() + DEV_BANNER_RESHOW_MS))
    } catch {
      // Storage blocked: hide for this page view only
    }
    document.documentElement.classList.add(NOTICE_HIDDEN_CLASS)
  }

  const buildNumber = process.env.NEXT_PUBLIC_BUILD_NUMBER || process.env.NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA || "local"
  const localDevStartedAt = process.env.NODE_ENV === "development" ? process.env.NEXT_PUBLIC_LOCAL_DEV_STARTED_AT : ""
  const localDevStartedMs = localDevStartedAt ? Date.parse(localDevStartedAt) : NaN
  const uptimeMs = Number.isFinite(localDevStartedMs) && nowMs ? Math.max(0, nowMs - localDevStartedMs) : 0
  const pad = (value) => String(value).padStart(2, "0")
  const uptime = `${pad(Math.floor(uptimeMs / 3600000))}:${pad(Math.floor((uptimeMs % 3600000) / 60000))}:${pad(Math.floor((uptimeMs % 60000) / 1000))}`
  const environmentDetail = process.env.NODE_ENV === "development"
    ? `Dev uptime ${uptime}`
    : `Build ${String(buildNumber).slice(0, 12)}`

  return (
    <div className="tag-notice" role="region" aria-label="Early access notice">
      <p className="tag-notice__text">
        <strong>Early access:</strong> TAG is actively being refined, so some features may change.{" "}
        <span className="tag-notice__detail">{environmentDetail}</span>
      </p>
      <button type="button" className="tag-notice__close" onClick={dismiss} aria-label="Dismiss notice">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
          <path d="M6 6l12 12M18 6L6 18" />
        </svg>
      </button>
    </div>
  )
}
