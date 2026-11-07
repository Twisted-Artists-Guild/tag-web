/* This file is part of the Twisted Artists Guild project.

 Copyright (C) 2025 Twisted Artists Guild

 Licensed under the GNU General Public License v3.0
 (https://www.gnu.org/licenses/gpl-3.0.en.html).

 This software comes with NO WARRANTY; see the license for details.

 Open source · low-profit · human-first*/
"use client"

import { useMemo, useState } from "react"
import { useSession } from "next-auth/react"
import { X } from "lucide-react"
import DirectMessages from "@/components/social/DirectMessages"
import ContextSwitcher from "@/components/Header/ContextSwitcher"

export default function MessagesApplet({
  onClose,
  currentUser = null,
  contextProfiles = [],
  activeContextId = null,
  onContextChange,
  initialConversationId = null,
}) {
  const { data: session } = useSession()
  const [localSelectedContextId, setLocalSelectedContextId] = useState(null)
  const selectedContextId = activeContextId || localSelectedContextId || contextProfiles[0]?.id || null

  const selectedContext = useMemo(() => {
    return contextProfiles.find((context) => context.id === selectedContextId) || contextProfiles[0] || null
  }, [contextProfiles, selectedContextId])
  const panelColor = selectedContext?.color || currentUser?.color || "#3B82F6"

  const effectiveCurrentUser = useMemo(() => {
    if (!selectedContext) {
      return currentUser
    }

    // Conversations are owned by the signed-in user, so the API needs the real user ID.
    // The selected context only changes how the user is displayed.
    return {
      id: session?.user?.id ?? currentUser?.id,
      username: (selectedContext.subtitle || selectedContext.label || "user")
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "_")
        .replace(/^_+|_+$/g, "") || "user",
      displayName: selectedContext.label,
      avatarUrl: selectedContext.avatarUrl || currentUser?.avatarUrl || "/images/default-avatar.png",
      color: selectedContext.color || currentUser?.color || "#3B82F6",
      isAdmin: String(selectedContext.type || "").toLowerCase() === "admin",
    }
  }, [currentUser, selectedContext, session?.user?.id])

  const handleContextSelect = (event) => {
    const nextContextId = event?.target?.value || event
    setLocalSelectedContextId(nextContextId)
    onContextChange?.(nextContextId)
  }

  return (
    
      <div className="relative h-full w-full overflow-visible rounded-box border border-base-300 bg-base-100 shadow-lg">
        <button
          onClick={onClose}
          className="btn btn-ghost btn-sm btn-circle absolute right-3 top-3 z-20"
          aria-label="Close messages"
        >
          <X size={20} />
        </button>

        <DirectMessages
          compact
          apiMode
          initialConversationId={initialConversationId}
          maxHeight={420}
          currentUser={effectiveCurrentUser}
          panelColor={panelColor}
          composerContextControl={contextProfiles.length > 0 ? (
            <ContextSwitcher
              variant="compact"
              compactSize="sm"
              compactMenuPosition="top-right"
              contexts={contextProfiles}
              activeContextId={selectedContext?.id || null}
              onChange={handleContextSelect}
            />
          ) : null}
        />
      </div>
    
  )
}

