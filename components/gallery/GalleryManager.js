/* This file is part of the Twisted Artists Guild project.

 Copyright (C) 2025 Twisted Artists Guild

 Licensed under the GNU General Public License v3.0
 (https://www.gnu.org/licenses/gpl-3.0.en.html).

 This software comes with NO WARRANTY; see the license for details.

 Open source · low-profit · human-first*/

import { useState, useRef, useEffect, useCallback, useMemo } from "react"
import Image from "next/image"
import ContentTags, { WARNING_DEFINITIONS } from "@/components/social/ContentTags"

const defaultFieldClass = "input input-bordered w-full"

const fallbackRoleOptions = [
  { creditRoleID: 1, label: "Copyright Owner" },
  { creditRoleID: 2, label: "Photographer" },
  { creditRoleID: 3, label: "Videographer" },
  { creditRoleID: 4, label: "Model" },
  { creditRoleID: 5, label: "Makeup Artist" },
  { creditRoleID: 6, label: "Set Designer" },
  { creditRoleID: 13, label: "Stylist" },
]

function normalizeUrl(url) {
  if (!url) return ""
  return String(url).trim().toLowerCase()
}

function makeEmptyCreditRow(role = "", creditRoleID = "") {
  return {
    role,
    creditRoleID: creditRoleID ? String(creditRoleID) : "",
    mode: "manual",
    artistQuery: "",
    artistResults: [],
    selectedArtist: null,
    displayName: "",
    externalURL: "",
    bioNote: "",
  }
}

function mapRoleLabel(roleOptions, id) {
  const match = roleOptions.find((r) => String(r.creditRoleID) === String(id))
  return match?.label || ""
}

function warningKeyToLabel(key) {
  return String(key || "")
    .split("-")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" - ")
}

function getProfileDisplayName(profile) {
  return (
    profile?.stageName ||
    profile?.title ||
    profile?.Title ||
    profile?.preferredName ||
    profile?.username ||
    profile?.displayName ||
    profile?.name ||
    profile?.path ||
    profile?.Path ||
    profile?.emailOne ||
    profile?.email ||
    ""
  )
}

function getUserDisplayName(user) {
  return user?.displayName || user?.name || user?.preferredName || user?.username || user?.email || user?.emailOne || ""
}

function isArtistLikeProfile(profile) {
  return Boolean(
    profile?.artistID
    || profile?.ArtistID
    || profile?.stageName
    || profile?.title
    || profile?.path
    || profile?.isArtist
  )
}

function mergeArtists(primary = [], extra = []) {
  const combined = [...primary, ...extra]
  const seen = new Set()
  const merged = []

  for (const artist of combined) {
    const key = String(
      artist?.artistID
      || artist?.ArtistID
      || artist?.path
      || artist?.Path
      || getProfileDisplayName(artist)
      || ""
    ).toLowerCase().trim()

    if (!key || seen.has(key)) continue
    seen.add(key)
    merged.push(artist)
  }

  return merged
}

function getCurrentUserLabel(currentUser) {
  if (!currentUser) return ""
  if (typeof currentUser === "string") return currentUser
  return currentUser.name || currentUser.displayName || currentUser.username || currentUser.email || ""
}

function toNumber(value) {
  const parsed = Number(value)
  return Number.isInteger(parsed) && parsed > 0 ? parsed : 0
}

function getCurrentUserId(currentUser) {
  return toNumber(currentUser?.id || currentUser?.userID || currentUser?.UserID)
}

function getManagedPrefix(entityType, entityId, folderKind = "gallery") {
  const normalizedEntityType = String(entityType || "").trim().toLowerCase()
  const normalizedFolderKind = String(folderKind || "gallery").trim().toLowerCase()

  if (normalizedEntityType === "artist") {
    return `platformpics/artists/${entityId}/${normalizedFolderKind}/`
  }

  if (normalizedEntityType === "user") {
    return `platformpics/users/${entityId}/${normalizedFolderKind}/`
  }

  return `platformpics/${normalizedEntityType}/${entityId}/${normalizedFolderKind}/`
}

function mapApiCreditsToEditorRows(credits = []) {
  if (!Array.isArray(credits)) return []
  return credits.map((credit) => ({
    role: credit?.role || credit?.Role || "",
    creditRoleID: String(credit?.creditRoleID || credit?.CreditRoleID || ""),
    mode: "lookup",
    artistQuery: credit?.displayName || credit?.DisplayName || "",
    artistResults: [],
    selectedArtist: null,
    displayName: credit?.displayName || credit?.DisplayName || "",
    externalURL: credit?.externalURL || credit?.ExternalURL || "",
    bioNote: credit?.creditText || credit?.CreditText || credit?.bioNote || credit?.BioNote || "",
    creditPartyID: credit?.creditPartyID || credit?.CreditPartyID || null,
  }))
}

function buildCreditsSavePayload(credits = [], defaultRoleID = "") {
  if (!Array.isArray(credits)) return []

  return credits
    .map((credit, index) => {
      const selectedArtist = credit?.selectedArtist || null
      const artistID =
        toNumber(selectedArtist?.artistID) ||
        toNumber(selectedArtist?.ArtistID) ||
        toNumber(credit?.artistID) ||
        toNumber(credit?.ArtistID) ||
        null

      const userID =
        toNumber(selectedArtist?.userID) ||
        toNumber(selectedArtist?.UserID) ||
        toNumber(credit?.userID) ||
        toNumber(credit?.UserID) ||
        null

      const displayName = String(credit?.displayName || "").trim()
      const externalURL = String(credit?.externalURL || "").trim()
      const bioNote = String(credit?.bioNote || "").trim()
      const creditRoleID = toNumber(credit?.creditRoleID || defaultRoleID)
      const creditPartyID = toNumber(credit?.creditPartyID || credit?.CreditPartyID) || null

      const hasAnyValue = Boolean(displayName || externalURL || bioNote || artistID || userID || creditPartyID)
      if (!hasAnyValue || !creditRoleID) return null

      return {
        creditPartyID,
        creditRoleID,
        sortOrder: index + 1,
        creditText: bioNote || null,
        party: creditPartyID
          ? null
          : {
              userID,
              artistID,
              displayName: displayName || null,
              externalURL: externalURL || null,
              bioNote: bioNote || null,
            },
      }
    })
    .filter(Boolean)
}

function CreditsAdder({ credits, onChange, artists, users, onSave, saving, roleOptions, defaultRoleID, onDirty, currentUser }) {
  const ownerAutofillRef = useRef(false)
  const ownerFocusClearedRef = useRef(false)

  const userSuggestion = useMemo(() => {
    if (!currentUser) return null
    if (typeof currentUser === "string") {
      return {
        kind: "you",
        label: "You",
        displayName: currentUser,
        username: "",
        email: String(currentUser).includes("@") ? currentUser : "",
        externalURL: "",
      }
    }

    const displayName = currentUser.name || currentUser.displayName || currentUser.username || currentUser.email || ""
    if (!displayName) return null
    return {
      kind: "you",
      label: "You",
      displayName,
      username: currentUser.username || "",
      email: currentUser.email || "",
      externalURL: "",
    }
  }, [currentUser])

  const updateCredit = useCallback((index, updates) => {
    onChange(credits.map((c, i) => (i === index ? { ...c, ...updates } : c)))
    onDirty?.()
  }, [credits, onChange, onDirty])

  useEffect(() => {
    if (!credits?.length) return
    const first = credits[0]
    if (String(first?.creditRoleID || "").trim()) return
    updateCredit(0, {
      creditRoleID: defaultRoleID,
      role: mapRoleLabel(roleOptions, defaultRoleID) || "Copyright Owner",
    })
  }, [credits, defaultRoleID, roleOptions, updateCredit])

  useEffect(() => {
    if (ownerAutofillRef.current) return
    if (!userSuggestion?.displayName) return
    if (!credits?.length) return
    if (String(credits[0]?.displayName || "").trim()) return

    ownerAutofillRef.current = true
    
    const currentUserId = typeof currentUser === "object" ? currentUser?.id : null
    if (!currentUserId) {
      updateCredit(0, {
        displayName: userSuggestion.displayName,
        externalURL: "",
        selectedArtist: null,
        creditRoleID: credits[0]?.creditRoleID || defaultRoleID,
        role: credits[0]?.role || mapRoleLabel(roleOptions, defaultRoleID) || "Copyright Owner",
      })
      return
    }

    // Relative NextJS internal proxy URL
    fetch(`/api/linker_usertoartist/byUserID/${currentUserId}`)
      .then((r) => (r.ok ? r.json() : []))
      .then((data) => {
        if (!Array.isArray(data) || !data.length) {
          updateCredit(0, {
            displayName: userSuggestion.displayName,
            externalURL: "",
            selectedArtist: null,
            creditRoleID: credits[0]?.creditRoleID || defaultRoleID,
            role: credits[0]?.role || mapRoleLabel(roleOptions, defaultRoleID) || "Copyright Owner",
          })
          return
        }

        // Use the first (primary) linked artist
        const userArtist = data[0]
        const displayName = getProfileDisplayName(userArtist)
        const artistPath = String(userArtist?.path || userArtist?.Path || "").trim()
        const externalURL = artistPath ? `/artists/${artistPath}` : ""

        updateCredit(0, {
          displayName,
          externalURL,
          selectedArtist: userArtist,
          creditRoleID: credits[0]?.creditRoleID || defaultRoleID,
          role: credits[0]?.role || mapRoleLabel(roleOptions, defaultRoleID) || "Copyright Owner",
        })
      })
      .catch(() => {
        // Fallback to user name if fetch fails
        updateCredit(0, {
          displayName: userSuggestion.displayName,
          externalURL: "",
          selectedArtist: null,
          creditRoleID: credits[0]?.creditRoleID || defaultRoleID,
          role: credits[0]?.role || mapRoleLabel(roleOptions, defaultRoleID) || "Copyright Owner",
        })
      })
  }, [credits, currentUser, defaultRoleID, roleOptions, updateCredit, userSuggestion])

  const addCredit = () => {
    onChange([...credits, makeEmptyCreditRow("", defaultRoleID)])
    onDirty?.()
  }

  const removeCredit = (index) => {
    onChange(credits.filter((_, i) => i !== index))
    onDirty?.()
  }

  const buildSuggestions = (query) => {
    const lowered = String(query || "").toLowerCase().trim()
    const suggestions = []

    if (userSuggestion) {
      const matchesSelf = !lowered
        || String(userSuggestion.displayName || "").toLowerCase().includes(lowered)
        || String(userSuggestion.email || "").toLowerCase().includes(lowered)
      if (matchesSelf) suggestions.push(userSuggestion)
    }

    const userMatches = users
      .filter((user) => {
        const displayName = getUserDisplayName(user)
        const username = String(user?.username || "").trim()
        const email = String(user?.email || user?.emailOne || "").trim()
        if (!displayName && !username && !email) return false
        if (!lowered) return true

        const displayNameLower = String(displayName).toLowerCase()
        const usernameLower = username.toLowerCase()
        const emailLower = email.toLowerCase()
        return displayNameLower.includes(lowered) || usernameLower.includes(lowered) || emailLower.includes(lowered)
      })
      .map((user) => ({
        kind: isArtistLikeProfile(user) ? "artist" : "user",
        label: isArtistLikeProfile(user) ? "Artist" : "User",
        displayName: getUserDisplayName(user),
        username: user?.username || "",
        email: user?.email || user?.emailOne || "",
        externalURL: user?.externalURL || user?.webSite || "",
        sourceArtist: isArtistLikeProfile(user) ? user : null,
        sourceUser: user,
      }))
      .filter((suggestion) => String(suggestion.displayName || "").trim())

    const artistMatches = artists
      .filter((artist) => {
        const displayName = getProfileDisplayName(artist)
        const username = String(artist?.username || "").trim()
        const email = String(artist?.emailOne || artist?.email || "").trim()
        if (!displayName && !username && !email) return false
        if (!lowered) return true

        const displayNameLower = String(displayName).toLowerCase()
        const titleLower = String(artist?.title || artist?.Title || "").toLowerCase()
        const pathLower = String(artist?.path || artist?.Path || "").toLowerCase()
        const usernameLower = username.toLowerCase()
        const preferredName = String(artist?.preferredName || "").toLowerCase()
        const emailLower = email.toLowerCase()
        const externalURL = String(artist?.externalURL || artist?.webSite || "").toLowerCase()
        return (
          displayNameLower.includes(lowered) ||
          titleLower.includes(lowered) ||
          pathLower.includes(lowered) ||
          usernameLower.includes(lowered) ||
          preferredName.includes(lowered) ||
          emailLower.includes(lowered) ||
          externalURL.includes(lowered)
        )
      })
      .slice(0, 10)
      .map((artist) => {
        const artistPath = String(artist?.path || artist?.Path || "").trim()
        return {
          kind: "artist",
          label: "Artist",
          displayName: getProfileDisplayName(artist),
          artistPath,
          externalURL: artistPath ? `/artists/${artistPath}` : (artist?.externalURL || artist?.webSite || ""),
          username: artist?.username || "",
          email: artist?.emailOne || artist?.email || "",
          sourceArtist: artist,
        }
      })
      .filter((suggestion) => String(suggestion.displayName || "").trim())

    const combined = [...suggestions, ...artistMatches, ...userMatches]
    const deduped = []
    const seen = new Set()
    for (const entry of combined) {
      const key = `${String(entry.displayName || "").toLowerCase()}::${String(entry.email || "").toLowerCase()}::${String(entry.username || "").toLowerCase()}`
      if (!String(entry.displayName || "").trim()) continue
      if (seen.has(key)) continue
      seen.add(key)
      deduped.push(entry)
    }

    return deduped.slice(0, 20)
  }

  const applySuggestion = (index, suggestion) => {
    const profileName = suggestion.displayName || ""
    const profileUrl = suggestion.externalURL || credits[index]?.externalURL || ""
    updateCredit(index, {
      selectedArtist: suggestion.sourceArtist || null,
      displayName: profileName,
      artistQuery: profileName,
      artistResults: [],
      externalURL: profileUrl,
      mode: "lookup",
    })
  }

  const tryResolveLinkToArtist = (index, maybeUrl) => {
    const normalized = normalizeUrl(maybeUrl)
    if (!normalized) return

    const match = artists.find((artist) => {
      const url = normalizeUrl(artist?.externalURL || artist?.webSite)
      if (!url) return false
      return normalized === url || normalized.includes(url) || url.includes(normalized)
    })

    if (!match) return

    updateCredit(index, {
      selectedArtist: match,
      displayName: getProfileDisplayName(match),
      artistQuery: getProfileDisplayName(match),
      artistResults: [],
      externalURL: match?.externalURL || match?.webSite || maybeUrl,
      mode: "lookup",
    })
  }

  return (
    <>
      <div className="rounded-md border border-base-300 bg-base-200 p-3 space-y-3">
        <div className="font-semibold text-sm">Credits</div>
        <p className="text-xs text-base-content/60">Copyright Owner defaults to your profile. Click into Owner Name to clear and quickly pick from profiles (friends will be prioritized once that list is wired).</p>

        {credits.map((credit, index) => (
          <div key={index} className="rounded-md border border-base-300 bg-base-100 p-3 space-y-2">
            <div className="flex items-center justify-between">
              <div className="text-sm font-medium text-base-content/80">{index === 0 ? "Copyright Owner" : `Credit ${index + 1}`}</div>
              {index > 0 && (
                <button type="button" className="btn btn-xs btn-ghost text-error" onClick={() => removeCredit(index)}>
                  Remove
                </button>
              )}
            </div>

            <label className="form-control">
              <span className="label-text text-xs">Role</span>
              <select
                className="select select-bordered w-full"
                value={credit.creditRoleID || (index === 0 ? defaultRoleID : "")}
                onChange={(e) => {
                  const roleId = e.target.value
                  updateCredit(index, { creditRoleID: roleId, role: mapRoleLabel(roleOptions, roleId) })
                }}
              >
                <option value="">Select role</option>
                {roleOptions.map((role) => (
                  <option key={role.creditRoleID} value={role.creditRoleID}>{role.label}</option>
                ))}
              </select>
            </label>

            <div className="relative">
              <input
                className={defaultFieldClass}
                placeholder={index === 0 ? "Copyright owner name or profile link" : "Display name"}
                value={credit.displayName}
                onFocus={() => {
                  if (index === 0 && !ownerFocusClearedRef.current && userSuggestion?.displayName && credit.displayName === userSuggestion.displayName) {
                    ownerFocusClearedRef.current = true
                    updateCredit(index, { displayName: "" })
                  }
                  updateCredit(index, {
                    artistResults: buildSuggestions(index === 0 ? "" : credit.displayName || ""),
                    mode: "lookup",
                  })
                }}
                onPaste={(e) => {
                  const pasted = e.clipboardData?.getData("text") || ""
                  if (/^https?:\/\//i.test(String(pasted).trim())) {
                    setTimeout(() => tryResolveLinkToArtist(index, String(pasted).trim()), 0)
                  }
                }}
                onChange={(e) => {
                  const query = e.target.value
                  updateCredit(index, {
                    displayName: query,
                    artistQuery: query,
                    artistResults: buildSuggestions(query),
                    mode: "lookup",
                  })
                }}
              />

              {credit.artistResults?.length > 0 && (
                <div className="absolute z-10 w-full bg-base-100 border border-base-300 rounded-md shadow-lg mt-1 max-h-40 overflow-auto">
                  {credit.artistResults.map((a, suggestionIndex) => (
                    <button
                      key={`${a.kind || "artist"}-${a.displayName || "unknown"}-${suggestionIndex}`}
                      type="button"
                      className="w-full text-left px-3 py-2 hover:bg-base-200 text-sm"
                      onMouseDown={(event) => event.preventDefault()}
                      onClick={() => applySuggestion(index, a)}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="truncate">{a.displayName || "Unknown profile"}</span>
                        <span className="badge badge-ghost badge-xs">{a.label || "Artist"}</span>
                      </div>
                      {a.kind === "artist" && a.artistPath
                        ? <div className="text-[11px] text-base-content/60 truncate">/artists/{a.artistPath}</div>
                        : (a.username || a.email) ? <div className="text-[11px] text-base-content/60 truncate">{a.username || a.email}</div> : null}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {credit.selectedArtist && (
              <div className="badge badge-success mt-1">
                Selected: {getProfileDisplayName(credit.selectedArtist) || credit.displayName}
              </div>
            )}

            <input
              className={defaultFieldClass}
              placeholder="External URL (optional)"
              value={credit.externalURL}
              onBlur={(e) => tryResolveLinkToArtist(index, e.target.value)}
              onChange={(e) => updateCredit(index, { externalURL: e.target.value })}
            />
            <input className={defaultFieldClass} placeholder="Credit note (optional)" value={credit.bioNote} onChange={(e) => updateCredit(index, { bioNote: e.target.value })} />
          </div>
        ))}

        <div className="flex justify-between items-center">
          <button type="button" className="btn btn-sm btn-outline" onClick={addCredit}>+ Add Credit</button>
          <button type="button" className="btn btn-sm btn-secondary" onClick={onSave} disabled={saving}>{saving ? "Saving..." : "Save Credits"}</button>
        </div>
      </div>
    </>
  )
}

export default function GalleryManager({ entityType, entityId, entityLabel, currentUser, basePrefix, lockedRootPrefix, folderKind = "gallery", title = "Gallery Manager", allowVideo, singleImageMode = false, onFilesChanged }) {
  const normalizedFolderKind = String(folderKind || "gallery").trim().toLowerCase()
  const galleryPrefix = basePrefix || getManagedPrefix(entityType, entityId, normalizedFolderKind)
  const startPrefix = lockedRootPrefix || galleryPrefix
  const canManageOrder = normalizedFolderKind === "gallery"
  const isSingleImageMode = Boolean(singleImageMode)
  const canPostVideo = typeof allowVideo === "boolean" ? allowVideo : normalizedFolderKind === "gallery"
  const [currentPrefix, setCurrentPrefix] = useState(galleryPrefix)
  const [directories, setDirectories] = useState([])
  const folderDisplayName = normalizedFolderKind.charAt(0).toUpperCase() + normalizedFolderKind.slice(1)
  const localCreditsKey = useMemo(() => `gallery-manager:${entityType}:${entityId}:credits`, [entityType, entityId])
  const localWarningsKey = useMemo(() => `gallery-manager:${entityType}:${entityId}:warnings`, [entityType, entityId])

  const [files, setFiles] = useState([])
  const [loadingFiles, setLoadingFiles] = useState(false)
  const [selectedFile, setSelectedFile] = useState(null)
  const [deletingUrl, setDeletingUrl] = useState(null)
  const [orderDirty, setOrderDirty] = useState(false)
  const [savingOrder, setSavingOrder] = useState(false)

  const [uploadLoading, setUploadLoading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(null)
  const [uploadMessage, setUploadMessage] = useState("")
  const [uploadError, setUploadError] = useState("")
  const [isDragOver, setIsDragOver] = useState(false)
  const fileInputRef = useRef(null)

  const dragIndexRef = useRef(null)
  const [dragOverIndex, setDragOverIndex] = useState(null)

  const [picMetadata, setPicMetadata] = useState({ title: "", altText: "", byline: "", description: "" })
  const [savingPicMeta, setSavingPicMeta] = useState(false)
  const [picMetaDirty, setPicMetaDirty] = useState(false)

  const [picCredits, setPicCredits] = useState([makeEmptyCreditRow("Copyright Owner")])
  const [savingPicCredits, setSavingPicCredits] = useState(false)
  const [picCreditsDirty, setPicCreditsDirty] = useState(false)

  const [pictureByUrl, setPictureByUrl] = useState({})
  const [creditsByUrl, setCreditsByUrl] = useState({})
  const [creditRoles, setCreditRoles] = useState([])

  const [videoUrl, setVideoUrl] = useState("")
  const [videoPreviewUrl, setVideoPreviewUrl] = useState("")
  const [videoProvider, setVideoProvider] = useState("")
  const [videoMeta, setVideoMeta] = useState({ title: "", byline: "", description: "" })
  const [savingVideoMeta, setSavingVideoMeta] = useState(false)
  const [videoMetaDirty, setVideoMetaDirty] = useState(false)
  const [videoSyncing, setVideoSyncing] = useState(false)
  const [lastSyncedVideoKey, setLastSyncedVideoKey] = useState("")

  const [videoCredits, setVideoCredits] = useState([makeEmptyCreditRow("Copyright Owner")])
  const [savingVideoCredits, setSavingVideoCredits] = useState(false)
  const [videoCreditsDirty, setVideoCreditsDirty] = useState(false)

  const [users, setUsers] = useState([])
  const [artists, setArtists] = useState([])
  const [message, setMessage] = useState("")
  const [error, setError] = useState("")
  const [warningsByUrl, setWarningsByUrl] = useState({})
  const [selectedWarnings, setSelectedWarnings] = useState([])
  const [warningsDirty, setWarningsDirty] = useState(false)
  const [savingWarnings, setSavingWarnings] = useState(false)
  const [editorTab, setEditorTab] = useState("metadata")
  const [settingAsActive, setSettingAsActive] = useState(false)

  const warningOptions = useMemo(
    () => Object.keys(WARNING_DEFINITIONS).map((key) => ({ key, label: warningKeyToLabel(key) })),
    []
  )
  const currentUserLabel = useMemo(() => getCurrentUserLabel(currentUser), [currentUser])
  const currentUserId = useMemo(() => getCurrentUserId(currentUser), [currentUser])

  const roleOptions = creditRoles.length ? creditRoles : fallbackRoleOptions
  const defaultRoleID = String(roleOptions[0]?.creditRoleID || "")
  const isContextFolderView = currentPrefix === galleryPrefix
  const galleryLinkedCount = useMemo(() => {
    if (!(canManageOrder && isContextFolderView)) return files.length
    return files.filter((file) => Boolean(file?.persistedGalleryItemId)).length
  }, [canManageOrder, isContextFolderView, files])

  const selectedSortPosition = useMemo(() => {
    if (!(canManageOrder && isContextFolderView) || !selectedFile) return null

    const selectedUrl = normalizeUrl(selectedFile?.url)
    const selectedVirtualKey = String(selectedFile?.virtualKey || "")
    const linkedFiles = files.filter((file) => file?.isInGallery !== false)
    const index = linkedFiles.findIndex((file) => {
      if (selectedVirtualKey && file?.isVideoPreview) {
        return String(file?.virtualKey || "") === selectedVirtualKey
      }
      return normalizeUrl(file?.url) === selectedUrl
    })

    return index >= 0 ? index + 1 : null
  }, [canManageOrder, isContextFolderView, files, selectedFile])

  useEffect(() => {
    setCurrentPrefix(galleryPrefix)
  }, [galleryPrefix])

  const showMessage = (msg) => {
    setMessage(msg)
    setError("")
    setTimeout(() => setMessage(""), 3500)
  }

  const showError = (msg) => {
    setError(msg)
    setMessage("")
  }

  const displayFileName = (name) => {
    if (!name) return ""
    const trimmed = name.endsWith("/") ? name.slice(0, -1) : name
    return trimmed.split("/").pop() || name
  }

  const formatSize = (bytes) => {
    if (!bytes) return "-"
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  }

  const upsertVirtualFile = useCallback((nextVirtualFile) => {
    setFiles((prev) => {
      const withoutSameVirtual = prev.filter((f) => !(f.isVideoPreview && f.virtualKey === nextVirtualFile.virtualKey))
      return [nextVirtualFile, ...withoutSameVirtual]
    })
  }, [])

  const loadFiles = useCallback(async () => {
    setLoadingFiles(true)
    try {
      const entityFetchUrl = entityType === "blog"
        ? `/api/blog/${entityId}`
        : `/api/${entityType}/byID/${entityId}`

      const blobResPromise = fetch(`/api/image/list?container=tagpictures&startPrefix=${encodeURIComponent(startPrefix)}&prefix=${encodeURIComponent(currentPrefix)}`)
      const entityResPromise = canManageOrder && isContextFolderView ? fetch(entityFetchUrl) : Promise.resolve(null)

      const [entityRes, blobRes] = await Promise.all([entityResPromise, blobResPromise])

      const entityData = entityRes?.ok ? await entityRes.json() : null
      const galleryItems = canManageOrder && isContextFolderView && Array.isArray(entityData?.gallery?.galleryItems) ? entityData.gallery.galleryItems : []
      const blobData = blobRes.ok ? await blobRes.json() : null
      const remoteFiles = Array.isArray(blobData?.files) ? blobData.files : []
      const nextDirectories = Array.isArray(blobData?.directories) ? blobData.directories : []
      setDirectories(nextDirectories)

      const byUrl = new Map()

      if (galleryItems.length > 0) {
        const mapped = galleryItems
          .slice()
          .sort((a, b) => (Number(a?.sortOrder) || 0) - (Number(b?.sortOrder) || 0))
          .map((item) => {
            if (item.videoID) {
              const sourceVideoUrl = item.video?.url || ""
              const detected = detectVideoProvider(sourceVideoUrl)
              const thumbUrl = item.video?.thumbnailURL || (detected.videoId ? `https://vumbnail.com/${detected.videoId}.jpg` : "")
              return {
                name: `video-preview-${item.videoID}.jpg`,
                url: thumbUrl,
                thumbnailURL: thumbUrl,
                contentLength: 0,
                isVideoPreview: true,
                virtualKey: `video-${item.videoID}`,
                sourceVideoUrl,
                embedUrl: item.video?.embedURL || detected.embedUrl,
                persistedVideoId: item.videoID,
                persistedGalleryItemId: item.galleryItemID,
                sortOrder: Number(item.sortOrder) || 0,
                isInGallery: true,
              }
            }

            const url = item.picture?.url || ""
            return {
              name: displayFileName(url),
              url,
              thumbnailURL: item.picture?.thumbnailURL || url,
              contentLength: 0,
              persistedPictureId: item.pictureID,
              persistedGalleryItemId: item.galleryItemID,
              sortOrder: Number(item.sortOrder) || 0,
              isInGallery: true,
            }
          })

        mapped.forEach((item) => {
          const key = normalizeUrl(item?.url)
          if (key) byUrl.set(key, item)
        })
      }

      remoteFiles.forEach((item) => {
        const key = normalizeUrl(item?.url)
        if (!key || byUrl.has(key)) return
        byUrl.set(key, {
          ...item,
          isInGallery: false,
          persistedGalleryItemId: null,
          sortOrder: null,
        })
      })

      const nextFiles = Array.from(byUrl.values())
      const orderedFiles = canManageOrder && isContextFolderView
        ? [
          ...nextFiles.filter((file) => file?.isInGallery !== false),
          ...nextFiles.filter((file) => file?.isInGallery === false),
        ]
        : nextFiles

      setFiles(orderedFiles)
      if (isContextFolderView) {
        onFilesChanged?.(orderedFiles)
      }
    } catch (err) {
      showError(err.message)
    } finally {
      setLoadingFiles(false)
    }
  }, [canManageOrder, currentPrefix, entityType, entityId, isContextFolderView, onFilesChanged, startPrefix])

  const loadPictureMetadata = useCallback(async () => {
    try {
      // Relative NextJS internal proxy URL
      const res = await fetch(`/api/picture`)
      if (!res.ok) return
      const data = await res.json()
      if (!Array.isArray(data)) return
      const map = {}
      for (const pic of data) {
        const key = normalizeUrl(pic.url || pic.URL)
        if (key) map[key] = pic
      }
      setPictureByUrl(map)
    } catch {
      // keep form usable without metadata preload
    }
  }, [])

  const loadLocalCredits = useCallback(() => {
    try {
      const raw = localStorage.getItem(localCreditsKey)
      if (!raw) return
      const parsed = JSON.parse(raw)
      if (parsed && typeof parsed === "object") setCreditsByUrl(parsed)
    } catch {
      // ignore cache errors
    }
  }, [localCreditsKey])

  const loadLocalWarnings = useCallback(() => {
    try {
      const raw = localStorage.getItem(localWarningsKey)
      if (!raw) return
      const parsed = JSON.parse(raw)
      if (parsed && typeof parsed === "object") setWarningsByUrl(parsed)
    } catch {
      // ignore cache errors
    }
  }, [localWarningsKey])

  useEffect(() => {
    loadFiles()
    loadPictureMetadata()
    loadLocalCredits()
    loadLocalWarnings()
  }, [loadFiles, loadPictureMetadata, loadLocalCredits, loadLocalWarnings])

  useEffect(() => {
    const currentUserId = typeof currentUser === "object" ? currentUser?.id : null
    
    fetch(`/api/user`)
      .then((r) => (r.ok ? r.json() : []))
      .then((data) => setUsers(Array.isArray(data) ? data : []))
      .catch(() => setUsers([]))

    fetch(`/api/artist`)
      .then((r) => r.json())
      .then((data) => setArtists(Array.isArray(data) ? data : []))
      .catch(() => {})

    if (currentUserId) {
      fetch(`/api/linker_usertoartist/byUserID/${currentUserId}`)
        .then((r) => (r.ok ? r.json() : []))
        .then((data) => {
          if (!Array.isArray(data) || !data.length) return
          setArtists((prev) => mergeArtists(prev, data))
        })
        .catch(() => {})
    }

    fetch(`/api/blog/credit-roles`)
      .then((r) => (r.ok ? r.json() : []))
      .then((data) => setCreditRoles(Array.isArray(data) ? data : []))
      .catch(() => {})
  }, [currentUser])

  const applySelectedFileData = useCallback((file) => {
    const key = normalizeUrl(file?.url)
    const pic = pictureByUrl[key]
    const cachedCredits = creditsByUrl[key]
    const cachedWarnings = warningsByUrl[key]
    const persistedPictureId = toNumber(file?.persistedPictureId || pic?.pictureID || pic?.PictureID)
    const persistedVideoId = toNumber(file?.persistedVideoId)

    setPicMetadata({
      title: pic?.title || pic?.Title || "",
      altText: pic?.altText || pic?.AltText || "",
      byline: pic?.byline || pic?.Byline || "",
      description: pic?.description || pic?.Description || "",
    })
    setPicMetaDirty(false)

    if (Array.isArray(cachedCredits) && cachedCredits.length) {
      if (file?.isVideoPreview) {
        setVideoCredits(cachedCredits)
      } else {
        setPicCredits(cachedCredits)
      }
    } else if (file?.isVideoPreview) {
      setVideoCredits([makeEmptyCreditRow("Copyright Owner", defaultRoleID)])
      if (persistedVideoId) {
        fetch(`/api/picture/video/${persistedVideoId}/credits`)
          .then((res) => (res.ok ? res.json() : []))
          .then((rows) => {
            const mapped = mapApiCreditsToEditorRows(rows)
            if (!mapped.length) return
            setCreditsByUrl((prev) => ({ ...prev, [key]: mapped }))
            setVideoCredits(mapped)
          })
          .catch(() => {})
      }
    } else {
      setPicCredits([makeEmptyCreditRow("Copyright Owner", defaultRoleID)])
      if (persistedPictureId) {
        fetch(`/api/picture/${persistedPictureId}/credits`)
          .then((res) => (res.ok ? res.json() : []))
          .then((rows) => {
            const mapped = mapApiCreditsToEditorRows(rows)
            if (!mapped.length) return
            setCreditsByUrl((prev) => ({ ...prev, [key]: mapped }))
            setPicCredits(mapped)
          })
          .catch(() => {})
      }
    }
    setPicCreditsDirty(false)
    setVideoCreditsDirty(false)

    setSelectedWarnings(Array.isArray(cachedWarnings) ? cachedWarnings : [])
    setWarningsDirty(false)
  }, [
    pictureByUrl,
    creditsByUrl,
    warningsByUrl,
    defaultRoleID,
    setPicMetadata,
    setPicMetaDirty,
    setVideoCredits,
    setPicCredits,
    setPicCreditsDirty,
    setVideoCreditsDirty,
    setSelectedWarnings,
    setWarningsDirty,
    setCreditsByUrl,
  ])

  const toggleWarning = (warningKey) => {
    setWarningsDirty(true)
    setSelectedWarnings((prev) =>
      prev.includes(warningKey)
        ? prev.filter((item) => item !== warningKey)
        : [...prev, warningKey]
    )
  }

  const handleSaveWarnings = async () => {
    if (!selectedFile?.url) return
    setSavingWarnings(true)
    try {
      const key = normalizeUrl(selectedFile.url)
      const next = { ...warningsByUrl, [key]: selectedWarnings }
      setWarningsByUrl(next)
      localStorage.setItem(localWarningsKey, JSON.stringify(next))
      setWarningsDirty(false)
      showMessage("Content warning tags saved.")
    } catch {
      showError("Failed to save content warning tags.")
    } finally {
      setSavingWarnings(false)
    }
  }

  const selectImage = (file) => {
    setSelectedFile(file)
    if (file?.isVideoPreview) {
      setVideoPreviewUrl(file.embedUrl || "")
    }
    applySelectedFileData(file)
  }

  useEffect(() => {
    if (selectedFile) applySelectedFileData(selectedFile)
  }, [selectedFile, applySelectedFileData])

  useEffect(() => {
    setEditorTab("metadata")
  }, [selectedFile?.url, selectedFile?.virtualKey])

  const uploadSingleFile = async (file) => {
    const formData = new FormData()
    formData.append("file", file)
    formData.append("container", "tagpictures")
    formData.append("startPrefix", startPrefix)
    formData.append("targetPrefix", currentPrefix)
    formData.append("userID", String(currentUserId || entityId || "staff"))
    formData.append("category", entityType)
    formData.append("entityID", String(entityId || ""))

    const res = await fetch("/api/image/upload", { method: "POST", body: formData })
    const data = await res.json()
    if (!res.ok) throw new Error(data.error || data.message || `Upload failed: ${file.name}`)

    let blobName = file.name
    try {
      const parts = new URL(data.url).pathname.split("/")
      blobName = parts.slice(2).join("/")
    } catch {
      blobName = file.name
    }

    return {
      name: blobName,
      url: data.url,
      persistedPictureId: data?.persistedPictureId || null,
    }
  }

  const syncVideoToGallery = useCallback(async ({ provider, videoId, sourceUrl, previewImage, embedUrl }) => {
    if (!entityId) return null

    const res = await fetch(`/api/${entityType}/${entityId}/gallery/video`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        url: sourceUrl,
        embedURL: embedUrl,
        thumbnailURL: previewImage,
        provider,
        providerVideoID: videoId,
        title: videoMeta.title || null,
        byline: videoMeta.byline || null,
        description: videoMeta.description || null,
      }),
    })

    if (!res.ok) {
      const errorData = await res.json().catch(() => ({}))
      throw new Error(errorData?.message || errorData?.error || "Failed to save video to gallery")
    }

    const saved = await res.json()
    return {
      galleryItemID: saved?.galleryItemID || saved?.GalleryItemID || null,
      videoID: saved?.videoID || saved?.VideoID || null,
      sortOrder: saved?.sortOrder ?? saved?.SortOrder ?? null,
      thumbnailURL: saved?.thumbnailURL || saved?.ThumbnailURL || null,
      url: saved?.url || saved?.URL || sourceUrl,
    }
  }, [entityType, entityId, videoMeta.title, videoMeta.byline, videoMeta.description])

  const uploadFiles = async (fileList) => {
    const filesToUpload = Array.from(fileList || []).filter(Boolean)
    if (!filesToUpload.length) return

    setUploadLoading(true)
    setUploadError("")
    setUploadMessage("")
    setUploadProgress(null)

    const errors = []
    const uploaded = []

    if (isSingleImageMode && isContextFolderView) {
      const existingRootFiles = files.filter((file) => !file?.isVideoPreview)
      for (const existingFile of existingRootFiles) {
        const timestampFolder = new Date().toISOString().replace(/[:.]/g, "-")
        const fileName = displayFileName(existingFile.name)
        const archivedName = `${currentPrefix}${timestampFolder}/${fileName}`

        try {
          const response = await fetch("/api/image/rename", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              container: "tagpictures",
              oldName: existingFile.name,
              newName: archivedName,
            }),
          })

          const data = await response.json().catch(() => ({}))
          if (!response.ok) {
            throw new Error(data?.error || data?.message || "Archive move failed")
          }
        } catch (err) {
          errors.push(err.message || `Failed to archive ${fileName}`)
        }
      }
    }

    for (let i = 0; i < filesToUpload.length; i++) {
      setUploadProgress(`${i + 1} / ${filesToUpload.length}`)
      try {
        const uploadedFile = await uploadSingleFile(filesToUpload[i])
        uploaded.push(uploadedFile)
        setFiles((prev) => [uploadedFile, ...prev])
      } catch (err) {
        errors.push(err.message)
      }
    }

    setUploadProgress(null)
    setUploadLoading(false)

    if (errors.length) setUploadError(errors.join(" | "))

    if (uploaded.length) {
      setUploadMessage(`Uploaded ${uploaded.length} file${uploaded.length > 1 ? "s" : ""}`)
      selectImage(uploaded[uploaded.length - 1])
      loadFiles()
      loadPictureMetadata()
    }
  }

  const ensurePictureRecord = useCallback(async (file) => {
    if (!file || file?.isVideoPreview) return null

    const normalized = normalizeUrl(file?.url)
    const existing = pictureByUrl[normalized]
    const existingId = toNumber(file?.persistedPictureId || existing?.pictureID || existing?.PictureID)
    if (existingId) {
      return existingId
    }

    const nowIso = new Date().toISOString()
    const payload = {
      URL: file.url,
      NormalizedURL: normalized,
      Path: currentPrefix,
      Title: displayFileName(file.name) || null,
      Context: entityType || null,
      Created: nowIso,
      Updated: nowIso,
    }

    const res = await fetch(`/api/picture`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    })

    if (!res.ok) {
      const errorData = await res.json().catch(() => ({}))
      throw new Error(errorData?.message || errorData?.error || "Failed to create picture record")
    }

    const created = await res.json().catch(() => null)
    const createdId = toNumber(created?.pictureID || created?.PictureID)
    if (!createdId) {
      throw new Error("Picture record created but PictureID was not returned")
    }

    setPictureByUrl((prev) => ({
      ...prev,
      [normalized]: {
        ...(prev[normalized] || {}),
        ...payload,
        pictureID: createdId,
      },
    }))

    return createdId
  }, [currentPrefix, entityType, pictureByUrl])

  const persistGalleryItems = useCallback(async (items) => {
    if (!entityId || !canManageOrder) return

    const normalizedItems = await Promise.all(items.map(async (file) => {
      if (file?.isVideoPreview) {
        return {
          ...file,
          persistedPictureId: null,
        }
      }

      const ensuredPictureId = await ensurePictureRecord(file)
      return {
        ...file,
        persistedPictureId: ensuredPictureId,
      }
    }))

    const payload = {
      items: normalizedItems
        .filter((file) => file?.isInGallery !== false)
        .map((file) => {
        if (file?.isVideoPreview) {
          return {
            mediaType: "video",
            videoID: file.persistedVideoId || null,
            url: file.sourceVideoUrl || file.url,
            embedURL: file.embedUrl || null,
          }
        }

        return {
          mediaType: "picture",
          pictureID: file.persistedPictureId || null,
          url: file.url,
        }
        }),
    }

    const res = await fetch(`/api/${entityType}/${entityId}/gallery/order`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    })

    if (!res.ok) {
      const errorData = await res.json().catch(() => ({}))
      throw new Error(errorData?.message || errorData?.error || "Failed to save gallery order")
    }
  }, [canManageOrder, entityId, entityType, ensurePictureRecord])

  const handleArchive = async (file) => {
    if (!file || file?.isVideoPreview) return

    const timestampFolder = new Date().toISOString().replace(/[:.]/g, "-")
    const fileName = displayFileName(file.name)
    const archivedName = `${currentPrefix}${timestampFolder}/${fileName}`

    try {
      const response = await fetch("/api/image/rename", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          container: "tagpictures",
          oldName: file.name,
          newName: archivedName,
        }),
      })

      const data = await response.json().catch(() => ({}))
      if (!response.ok) {
        throw new Error(data?.error || data?.message || "Archive move failed")
      }

      showMessage(`Archived: ${fileName}`)
      loadFiles()
    } catch (err) {
      showError(err.message || "Failed to archive file.")
    }
  }

  const handleDelete = async (file) => {
    if (file?.isVideoPreview) {
      setFiles((prev) => prev.filter((f) => !(f.isVideoPreview && f.virtualKey === file.virtualKey)))
      if (selectedFile?.virtualKey === file.virtualKey) setSelectedFile(null)
      showMessage(`Removed: ${displayFileName(file.name)}`)
      return
    }

    if (!window.confirm(`Delete "${displayFileName(file.name)}"?`)) return

    setDeletingUrl(file.url)
    try {
      const res = await fetch("/api/image/delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imageUrl: file.url, pictureId: file.persistedPictureId || null }),
      })

      if (!res.ok) {
        const d = await res.json()
        throw new Error(d.error || d.message || "Delete failed")
      }

      const nextFiles = files.filter((f) => f.url !== file.url)
      setFiles(nextFiles)
      if (isContextFolderView) {
        onFilesChanged?.(nextFiles)
      }
      if (selectedFile?.url === file.url) setSelectedFile(null)
      if (canManageOrder && isContextFolderView) {
        await persistGalleryItems(nextFiles)
        setOrderDirty(false)
      }
      showMessage(`Deleted: ${displayFileName(file.name)}`)
    } catch (err) {
      showError(err.message)
    } finally {
      setDeletingUrl(null)
    }
  }

  const handleRemoveFromGallery = async (file) => {
    if (!file || !(canManageOrder && isContextFolderView)) return

    const targetUrl = normalizeUrl(file?.url)
    const targetVirtualKey = String(file?.virtualKey || "")

    const nextFiles = files.map((item) => {
      const sameItem = item?.isVideoPreview
        ? String(item?.virtualKey || "") === targetVirtualKey
        : normalizeUrl(item?.url) === targetUrl

      if (!sameItem) return item

      return {
        ...item,
        isInGallery: false,
        persistedGalleryItemId: null,
        sortOrder: null,
      }
    })

    const ordered = [
      ...nextFiles.filter((item) => item?.isInGallery !== false),
      ...nextFiles.filter((item) => item?.isInGallery === false),
    ]

    setFiles(ordered)
    if (isContextFolderView) {
      onFilesChanged?.(ordered)
    }
    setOrderDirty(true)
    showMessage("Removed from gallery. Click Save Gallery Changes to persist.")
  }

  const handleAddToGallery = async (file) => {
    if (!file || !(canManageOrder && isContextFolderView)) return

    const targetUrl = normalizeUrl(file?.url)
    const targetVirtualKey = String(file?.virtualKey || "")

    const nextFiles = files.map((item) => {
      const sameItem = item?.isVideoPreview
        ? String(item?.virtualKey || "") === targetVirtualKey
        : normalizeUrl(item?.url) === targetUrl

      if (!sameItem) return item

      return {
        ...item,
        isInGallery: true,
      }
    })

    const ordered = [
      ...nextFiles.filter((item) => item?.isInGallery !== false),
      ...nextFiles.filter((item) => item?.isInGallery === false),
    ]

    setFiles(ordered)
    if (isContextFolderView) {
      onFilesChanged?.(ordered)
    }
    setOrderDirty(true)
    showMessage("Added back to gallery. Click Save Gallery Changes to persist.")
  }

  const handleDragStart = (index) => {
    dragIndexRef.current = index
  }

  const handleDragOver = (e, index) => {
    e.preventDefault()
    setDragOverIndex(index)
  }

  const handleDragDrop = (index) => {
    const from = dragIndexRef.current
    if (from === null || from === index) {
      dragIndexRef.current = null
      setDragOverIndex(null)
      return
    }

    setFiles((prev) => {
      const next = [...prev]
      const [moved] = next.splice(from, 1)
      next.splice(index, 0, moved)
      return next
    })
    setOrderDirty(true)

    dragIndexRef.current = null
    setDragOverIndex(null)
  }

  const handleDragEnd = () => {
    dragIndexRef.current = null
    setDragOverIndex(null)
  }

  const handleSaveOrder = async () => {
    if (!entityId || !files.length || !canManageOrder) return

    setSavingOrder(true)
    try {
      await persistGalleryItems(files)

      setOrderDirty(false)
      showMessage("Gallery order saved.")
    } catch (err) {
      showError(err.message || "Failed to save order.")
    } finally {
      setSavingOrder(false)
    }
  }

  const handleSetAsActiveSingleImage = async () => {
    if (!isSingleImageMode || !selectedFile || selectedFile?.isVideoPreview) return

    setSettingAsActive(true)
    const selectedBlobName = String(selectedFile.name || "").trim()
    const selectedFileName = displayFileName(selectedBlobName)
    if (!selectedBlobName || !selectedFileName) return

    try {
      let promotedUrl = String(selectedFile?.url || "").trim()

      const existingRootFiles = files.filter((file) => {
        if (file?.isVideoPreview) return false
        const blobName = String(file?.name || "").trim()
        return blobName.startsWith(galleryPrefix)
      })

      for (const file of existingRootFiles) {
        const blobName = String(file?.name || "").trim()
        if (!blobName || blobName === selectedBlobName) continue

        const timestampFolder = new Date().toISOString().replace(/[:.]/g, "-")
        const fileName = displayFileName(blobName)
        const archivedName = `${galleryPrefix}${timestampFolder}/${fileName}`

        const archiveResponse = await fetch("/api/image/rename", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            container: "tagpictures",
            oldName: blobName,
            newName: archivedName,
          }),
        })

        const archiveData = await archiveResponse.json().catch(() => ({}))
        if (!archiveResponse.ok) {
          throw new Error(archiveData?.error || archiveData?.message || "Failed to archive existing active image")
        }
      }

      if (!selectedBlobName.startsWith(galleryPrefix)) {
        const targetName = `${galleryPrefix}${selectedFileName}`
        const promoteResponse = await fetch("/api/image/rename", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            container: "tagpictures",
            oldName: selectedBlobName,
            newName: targetName,
          }),
        })

        const promoteData = await promoteResponse.json().catch(() => ({}))
        if (!promoteResponse.ok) {
          throw new Error(promoteData?.error || promoteData?.message || "Failed to promote selected image")
        }

        if (promoteData?.newUrl) {
          promotedUrl = String(promoteData.newUrl).trim()
        }
      }

      const normalizedUrl = normalizeUrl(promotedUrl)
      let pictureId = toNumber(
        selectedFile?.persistedPictureId
        || pictureByUrl[normalizedUrl]?.pictureID
        || pictureByUrl[normalizedUrl]?.PictureID
      )

      if (!pictureId && promotedUrl) {
        const nowIso = new Date().toISOString()
        const picturePayload = {
          URL: promotedUrl,
          NormalizedURL: normalizedUrl,
          Path: galleryPrefix,
          Title: `${folderDisplayName} Active`,
          Context: entityType || null,
          Created: nowIso,
          Updated: nowIso,
        }

        const pictureCreateRes = await fetch(`/api/picture`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(picturePayload),
        })

        if (pictureCreateRes.ok) {
          const created = await pictureCreateRes.json().catch(() => null)
          pictureId = toNumber(created?.pictureID || created?.PictureID)
          if (pictureId) {
            setPictureByUrl((prev) => ({
              ...prev,
              [normalizedUrl]: {
                ...picturePayload,
                pictureID: pictureId,
              },
            }))
          }
        }
      }

      if ((normalizedFolderKind === "profile" || normalizedFolderKind === "cover") && !pictureId) {
        throw new Error(`Unable to resolve PictureID for active ${normalizedFolderKind} image`)
      }

      if (entityType === "artist" && entityId && pictureId) {
        const artistRes = await fetch(`/api/artist/byID/${entityId}`)
        const artistData = artistRes.ok ? await artistRes.json() : {}
        const profileId = toNumber(artistData?.ProfilePicID || artistData?.profilePicID)
        const coverId = toNumber(artistData?.CoverPicID || artistData?.coverPicID)

        const profilePayloadId = normalizedFolderKind === "profile" ? pictureId : (profileId || null)
        const coverPayloadId = normalizedFolderKind === "cover" ? pictureId : (coverId || null)

        const updateRes = await fetch(`/api/artist/byID/${entityId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            ProfilePicID: profilePayloadId,
            CoverPicID: coverPayloadId,
          }),
        })

        if (!updateRes.ok) {
          throw new Error("Failed to update artist active picture fields")
        }
      }

      showMessage(`${folderDisplayName} image set as active.`)
      await loadFiles()
    } catch (err) {
      showError(err.message || `Failed to set active ${folderDisplayName.toLowerCase()} image.`)
    } finally {
      setSettingAsActive(false)
    }
  }

  const handleSavePicMeta = async () => {
    if (!selectedFile) return
    setSavingPicMeta(true)

    try {
      const key = normalizeUrl(selectedFile.url)
      const existing = pictureByUrl[key]
      const existingId = existing?.pictureID || existing?.PictureID || 0

      const payload = {
        ...(existing || {}),
        pictureID: existingId,
        url: selectedFile.url,
        normalizedURL: key,
        path: currentPrefix,
        title: picMetadata.title || null,
        altText: picMetadata.altText || null,
        byline: picMetadata.byline || null,
        description: picMetadata.description || null,
        embedURL: selectedFile?.isVideoPreview ? selectedFile?.sourceVideoUrl || null : existing?.embedURL || existing?.EmbedURL || null,
        context: selectedFile?.isVideoPreview ? "vimeo-preview" : existing?.context || existing?.Context || null,
        updated: new Date().toISOString(),
        created: existing?.created || existing?.Created || new Date().toISOString(),
      }

      if (existingId) {
        const res = await fetch(`/api/picture/${existingId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ...payload, pictureID: existingId }),
        })
        if (!res.ok) throw new Error("Failed to save metadata")
        setPictureByUrl((prev) => ({ ...prev, [key]: { ...payload, pictureID: existingId } }))
      } else {
        const res = await fetch(`/api/picture`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        })
        if (!res.ok) throw new Error("Failed to create picture metadata")
        const created = await res.json()
        setPictureByUrl((prev) => ({ ...prev, [key]: created }))
      }

      setPicMetaDirty(false)
      showMessage("Image metadata saved.")
    } catch (err) {
      showError(err.message || "Failed to save metadata.")
    } finally {
      setSavingPicMeta(false)
    }
  }

  const handleSavePicCredits = async () => {
    if (!selectedFile) return
    setSavingPicCredits(true)

    try {
      const key = normalizeUrl(selectedFile.url)
      const picture = pictureByUrl[key]
      const pictureId = toNumber(selectedFile?.persistedPictureId || picture?.pictureID || picture?.PictureID)
      if (!pictureId) {
        throw new Error("Save image metadata first so a PictureID exists, then save credits.")
      }

      const payload = {
        credits: buildCreditsSavePayload(picCredits, defaultRoleID),
      }

      const res = await fetch(`/api/picture/${pictureId}/credits`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}))
        if (res.status === 404) {
          throw new Error("Credits endpoint not found (404). Restart the API server so the latest routes are loaded.")
        }
        throw new Error(errorData?.message || errorData?.error || "Failed to save image credits.")
      }

      const savedRows = await res.json()
      const mapped = mapApiCreditsToEditorRows(savedRows)
      const next = { ...creditsByUrl, [key]: mapped }
      setCreditsByUrl(next)
      setPicCredits(mapped.length ? mapped : [makeEmptyCreditRow("Copyright Owner", defaultRoleID)])
      localStorage.setItem(localCreditsKey, JSON.stringify(next))
      setPicCreditsDirty(false)
      showMessage("Image credits saved.")
    } catch (err) {
      showError(err.message || "Failed to save credits.")
    } finally {
      setSavingPicCredits(false)
    }
  }

  const detectVideoProvider = (url) => {
    if (!url) return { provider: "", videoId: "", embedUrl: "" }

    if (url.includes("vimeo.com")) {
      const match = url.match(/vimeo\.com\/(\d+)/)
      if (match) return { provider: "vimeo", videoId: match[1], embedUrl: `https://player.vimeo.com/video/${match[1]}` }
    }

    if (url.includes("youtube.com") || url.includes("youtu.be")) {
      const match = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]+)/)
      if (match) return { provider: "youtube", videoId: match[1], embedUrl: `https://www.youtube.com/embed/${match[1]}` }
    }

    return { provider: "", videoId: "", embedUrl: "" }
  }

  const handleVideoUrlChange = async (val) => {
    setVideoUrl(val)
    const { provider, videoId, embedUrl } = detectVideoProvider(val)
    setVideoProvider(provider)
    setVideoPreviewUrl(embedUrl)

    if (provider === "vimeo" && videoId) {
      const previewImage = `https://vumbnail.com/${videoId}.jpg`
      const virtualFile = {
        name: `video-preview-vimeo-${videoId}.jpg`,
        url: previewImage,
        contentLength: 0,
        isVideoPreview: true,
        virtualKey: `vimeo-${videoId}`,
        sourceVideoUrl: val,
        embedUrl,
      }
      upsertVirtualFile(virtualFile)
      selectImage(virtualFile)

      const syncKey = `${provider}-${videoId}`
      if (syncKey !== lastSyncedVideoKey) {
        setVideoSyncing(true)
        try {
          const saved = await syncVideoToGallery({
            provider,
            videoId,
            sourceUrl: val,
            previewImage,
            embedUrl,
          })

          if (saved) {
            setLastSyncedVideoKey(syncKey)
            setFiles((prev) => prev.map((item) => {
              if (item.virtualKey !== virtualFile.virtualKey) return item
              return {
                ...item,
                url: saved.thumbnailURL || item.url,
                sourceVideoUrl: saved.url || item.sourceVideoUrl,
                persistedVideoId: saved.videoID,
                persistedGalleryItemId: saved.galleryItemID,
              }
            }))
            showMessage("Video added to gallery.")
          }
        } catch (err) {
          showError(err.message || "Failed to attach video to blog gallery.")
        } finally {
          setVideoSyncing(false)
        }
      }
    }
  }

  const handleSaveVideoMeta = async () => {
    setSavingVideoMeta(true)
    try {
      await new Promise((r) => setTimeout(r, 300))
      setVideoMetaDirty(false)
      showMessage("Video metadata saved.")
    } catch {
      showError("Failed to save video metadata.")
    } finally {
      setSavingVideoMeta(false)
    }
  }

  const handleSaveVideoCredits = async () => {
    if (!selectedFile?.isVideoPreview) return
    setSavingVideoCredits(true)
    try {
      const key = normalizeUrl(selectedFile.url)
      const videoId = toNumber(selectedFile?.persistedVideoId)
      if (!videoId) {
        throw new Error("Save or attach the video to gallery first, then save credits.")
      }

      const payload = {
        credits: buildCreditsSavePayload(videoCredits, defaultRoleID),
      }

      const res = await fetch(`/api/picture/video/${videoId}/credits`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}))
        if (res.status === 404) {
          throw new Error("Credits endpoint not found (404). Restart the API server so the latest routes are loaded.")
        }
        throw new Error(errorData?.message || errorData?.error || "Failed to save video credits.")
      }

      const savedRows = await res.json()
      const mapped = mapApiCreditsToEditorRows(savedRows)
      const next = { ...creditsByUrl, [key]: mapped }
      setCreditsByUrl(next)
      setVideoCredits(mapped.length ? mapped : [makeEmptyCreditRow("Copyright Owner", defaultRoleID)])
      localStorage.setItem(localCreditsKey, JSON.stringify(next))
      setVideoCreditsDirty(false)
      showMessage("Video credits saved.")
    } catch (err) {
      showError(err.message || "Failed to save video credits.")
    } finally {
      setSavingVideoCredits(false)
    }
  }

  const goToRoot = () => {
    setCurrentPrefix(startPrefix)
  }

  const goUpOneLevel = () => {
    if (currentPrefix === startPrefix) return
    const trimmed = String(currentPrefix || "").replace(/\/+$/, "")
    const parent = trimmed.slice(0, Math.max(0, trimmed.lastIndexOf("/") + 1))
    if (parent.startsWith(startPrefix)) {
      setCurrentPrefix(parent || startPrefix)
      return
    }
    setCurrentPrefix(startPrefix)
  }

  return (
    <div className="card bg-base-100 shadow-md border border-base-300">
      <div className="card-body gap-4">
        <div>
          <h2 className="card-title">{title}</h2>
          <p className="text-sm text-base-content/60">Editing {normalizedFolderKind} media for {entityLabel || `${entityType} #${entityId}`}</p>
        </div>

        {error ? <div className="alert alert-error text-sm">{error}</div> : null}
        {message ? <div className="alert alert-success text-sm">{message}</div> : null}

        <div className="space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div
              className={`rounded-md border-2 border-dashed p-4 transition-colors ${isDragOver ? "border-primary bg-primary/10" : "border-base-300 bg-base-200"}`}
              onDragOver={(e) => {
                e.preventDefault()
                if (dragIndexRef.current === null) setIsDragOver(true)
              }}
              onDragLeave={() => setIsDragOver(false)}
              onDrop={(e) => {
                e.preventDefault()
                setIsDragOver(false)
                if (dragIndexRef.current === null) uploadFiles(e.dataTransfer.files)
              }}
            >
              <div className="font-semibold mb-1">Upload to {normalizedFolderKind}</div>
              <div className="text-xs text-base-content/60 mb-3 font-mono">{currentPrefix}</div>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                multiple
                className="hidden"
                onChange={(e) => {
                  uploadFiles(e.target.files)
                  e.target.value = ""
                }}
              />
              <button type="button" className="btn btn-sm btn-outline" onClick={() => fileInputRef.current?.click()} disabled={uploadLoading}>
                {uploadLoading ? (uploadProgress ? `Uploading ${uploadProgress}...` : "Uploading...") : "Choose & Upload"}
              </button>
            </div>

            {canPostVideo && (
            <div className="rounded-md border border-base-300 bg-base-200 p-4 space-y-2">
              <div className="font-semibold text-sm">Post video URL</div>
              <input className={defaultFieldClass} placeholder="Paste a Vimeo or YouTube URL" value={videoUrl} onChange={(e) => { void handleVideoUrlChange(e.target.value) }} />
              <div className="flex items-center gap-2">
                {videoProvider ? <div className="badge badge-outline capitalize">{videoProvider}</div> : <div className="text-xs text-base-content/60">Auto-detects Vimeo/YouTube after paste.</div>}
                {videoSyncing ? <span className="loading loading-spinner loading-xs" /> : null}
              </div>
            </div>
            )}
          </div>

          {uploadError ? <div className="alert alert-error text-sm">{uploadError}</div> : null}
          {uploadMessage ? <div className="alert alert-success text-sm break-all">{uploadMessage}</div> : null}

          <div className="rounded-md border border-base-300 bg-base-200 p-3 space-y-2">
            <div className="text-xs font-semibold text-base-content/80">Browse Artist Media Folders</div>
            <div className="flex flex-wrap gap-2">
              <button type="button" className="btn btn-xs btn-outline" onClick={goToRoot} disabled={currentPrefix === startPrefix}>
                Artist Root
              </button>
              <button type="button" className="btn btn-xs btn-outline" onClick={goUpOneLevel} disabled={currentPrefix === startPrefix}>
                Up
              </button>
              <button type="button" className="btn btn-xs btn-outline" onClick={() => setCurrentPrefix(galleryPrefix)} disabled={currentPrefix === galleryPrefix}>
                {folderDisplayName} Folder
              </button>
            </div>
            <div className="text-[11px] text-base-content/60 font-mono break-all">Current: {currentPrefix}</div>
            {directories.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {directories.map((dir) => {
                  const trimmed = String(dir || "").replace(/\/+$/, "")
                  const label = trimmed.split("/").pop() || trimmed
                  return (
                    <button
                      key={dir}
                      type="button"
                      className="btn btn-xs btn-ghost border border-base-300"
                      onClick={() => setCurrentPrefix(dir)}
                      disabled={currentPrefix === dir}
                      title={dir}
                    >
                      {label}
                    </button>
                  )
                })}
              </div>
            ) : (
              <div className="text-xs text-base-content/60">No subfolders in this level.</div>
            )}
          </div>

          <div className="border border-base-300 rounded-md">
            <div className="px-3 py-2 border-b border-base-300 text-sm font-semibold flex justify-between items-center">
              <span>{folderDisplayName} Images ({galleryLinkedCount})</span>
              <div className="flex items-center gap-2">
                <button type="button" className="btn btn-xs btn-outline" onClick={() => fileInputRef.current?.click()} disabled={uploadLoading}>
                  {uploadLoading ? "Uploading..." : "Upload"}
                </button>
                <button type="button" className="btn btn-xs btn-ghost" onClick={loadFiles} disabled={loadingFiles}>
                  {loadingFiles ? "Loading..." : "Refresh"}
                </button>
                {canManageOrder && isContextFolderView ? (
                  <button type="button" className="btn btn-xs btn-primary" onClick={handleSaveOrder} disabled={savingOrder || !orderDirty}>
                    {savingOrder ? "Saving..." : "Save Gallery Changes"}
                  </button>
                ) : null}
              </div>
            </div>

            {canManageOrder && isContextFolderView && orderDirty ? (
              <div className="px-3 py-2 border-b border-base-300 bg-warning/10 text-warning text-xs">
                Gallery selection/order has unsaved changes. Click Save Gallery Changes.
              </div>
            ) : null}

            <div className="max-h-136 overflow-auto">
              {files.length === 0 ? (
                <p className="text-base-content/60 text-sm py-4 text-center">{loadingFiles ? "Loading..." : "No images yet. Upload one above or from this panel."}</p>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2 p-2">
                  {files.map((file, index) => (
                    <div
                      key={`${file.name}-${file.virtualKey || "native"}`}
                      draggable={canManageOrder && isContextFolderView && file?.isInGallery !== false}
                      onDragStart={() => (canManageOrder && isContextFolderView && file?.isInGallery !== false ? handleDragStart(index) : null)}
                      onDragOver={(e) => (canManageOrder && isContextFolderView && file?.isInGallery !== false ? handleDragOver(e, index) : null)}
                      onDrop={() => (canManageOrder && isContextFolderView && file?.isInGallery !== false ? handleDragDrop(index) : null)}
                      onDragEnd={() => (canManageOrder && isContextFolderView && file?.isInGallery !== false ? handleDragEnd() : null)}
                      className={`relative group rounded-md border-2 transition-colors ${canManageOrder && isContextFolderView && file?.isInGallery !== false ? "cursor-grab active:cursor-grabbing" : ""} ${selectedFile?.url === file.url ? "border-primary" : dragOverIndex === index ? "border-secondary border-dashed" : "border-base-300"}`}
                    >
                      <button type="button" className="w-full aspect-square block" onClick={() => selectImage(file)}>
                        <div className="relative w-full h-full min-h-20">
                          <Image src={file.thumbnailURL || file.url} alt={displayFileName(file.name)} fill sizes="160px" className="rounded-md object-cover" />
                        </div>
                      </button>

                      {canManageOrder && isContextFolderView && file?.isInGallery !== false ? (
                        <div className="absolute top-1 left-1 badge badge-sm badge-neutral opacity-70 select-none pointer-events-none">
                          {files.slice(0, index + 1).filter((item) => item?.isInGallery !== false).length}
                        </div>
                      ) : null}

                      {canManageOrder && isContextFolderView ? (
                        <>
                          <button
                            type="button"
                            className={`absolute top-1 right-1 btn btn-xs opacity-0 group-hover:opacity-100 transition-opacity ${file?.isInGallery !== false ? "btn-warning" : "btn-success"}`}
                            onClick={() => (file?.isInGallery !== false ? handleRemoveFromGallery(file) : handleAddToGallery(file))}
                            title={file?.isInGallery !== false ? "Remove from gallery" : "Add back to gallery"}
                          >
                            {file?.isInGallery !== false ? "-" : "+"}
                          </button>
                        </>
                      ) : !isSingleImageMode ? (
                        <>
                          <button
                            type="button"
                            className="absolute top-1 right-8 btn btn-xs btn-warning opacity-0 group-hover:opacity-100 transition-opacity"
                            onClick={() => handleArchive(file)}
                            title="Archive image"
                          >
                            A
                          </button>

                          <button
                            type="button"
                            className="absolute top-1 right-1 btn btn-xs btn-error opacity-0 group-hover:opacity-100 transition-opacity"
                            onClick={() => handleDelete(file)}
                            disabled={!file?.isVideoPreview && deletingUrl === file.url}
                            title="Delete image"
                          >
                            {!file?.isVideoPreview && deletingUrl === file.url ? "..." : "X"}
                          </button>
                        </>
                      ) : null}

                      <div className="text-[10px] truncate px-1 pb-0.5 text-base-content/70 select-none">{displayFileName(file.name)}</div>
                      {canManageOrder && isContextFolderView && file?.isInGallery === false ? (
                        <div className="text-[10px] px-1 text-warning select-none">Unsorted (not in gallery)</div>
                      ) : null}
                      <div className="text-[10px] px-1 pb-1 text-base-content/50 select-none">{formatSize(file.contentLength)}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {selectedFile ? (
          <div className="space-y-4">
            {selectedFile?.isVideoPreview ? (
              (videoMetaDirty || videoCreditsDirty) && (
                <div className="alert alert-warning text-sm">Unsaved changes detected. Please click Save before leaving this section.</div>
              )
            ) : (
              (picMetaDirty || picCreditsDirty) && (
                <div className="alert alert-warning text-sm">Unsaved changes detected. Please click Save before leaving this section.</div>
              )
            )}

            {warningsDirty && (
              <div className="alert alert-warning text-sm">Unsaved content warning tags. Click Save Tags before leaving this section.</div>
            )}

            {selectedFile?.isVideoPreview ? (
              videoPreviewUrl ? (
                <div className="rounded-md border border-base-300 overflow-hidden" style={{ aspectRatio: "16/9" }}>
                  <iframe src={videoPreviewUrl} className="w-full h-full" frameBorder="0" allow="autoplay; fullscreen; picture-in-picture" allowFullScreen title="Video preview" />
                </div>
              ) : (
                <div className="text-sm text-base-content/60">Enter a valid Vimeo or YouTube URL above to preview and add metadata.</div>
              )
            ) : (
              <>
                <div className="relative h-48 w-full rounded-md overflow-hidden bg-base-200 border border-base-300">
                  <Image src={selectedFile.url} alt={displayFileName(selectedFile.name)} fill style={{ objectFit: "contain" }} />
                </div>
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 text-xs text-base-content/60 font-mono">
                    <span>{displayFileName(selectedFile.name)}</span>
                    {selectedSortPosition ? (
                      <span className="badge badge-sm badge-neutral">#{selectedSortPosition}</span>
                    ) : null}
                  </div>
                  {isSingleImageMode ? (
                    <button type="button" className="btn btn-xs btn-secondary" onClick={handleSetAsActiveSingleImage} disabled={settingAsActive}>
                      {settingAsActive ? "Setting..." : `Set Active ${folderDisplayName}`}
                    </button>
                  ) : null}
                </div>
              </>
            )}

            <div className="tabs tabs-boxed bg-base-100 border border-base-300 inline-flex">
              <button type="button" className={`tab ${editorTab === "metadata" ? "tab-active" : ""}`} onClick={() => setEditorTab("metadata")}>Metadata</button>
              <button type="button" className={`tab ${editorTab === "credits" ? "tab-active" : ""}`} onClick={() => setEditorTab("credits")}>Credits</button>
              <button type="button" className={`tab ${editorTab === "tags" ? "tab-active" : ""}`} onClick={() => setEditorTab("tags")}>Content Tags</button>
            </div>

            {editorTab === "metadata" ? (
              selectedFile?.isVideoPreview ? (
                <div className="rounded-md border border-base-300 bg-base-200 p-3 space-y-3">
                  <div className="font-semibold text-sm">Video Metadata</div>
                  <input className={defaultFieldClass} placeholder="Title" value={videoMeta.title} onChange={(e) => { setVideoMetaDirty(true); setVideoMeta((m) => ({ ...m, title: e.target.value })) }} />
                  <input className={defaultFieldClass} placeholder="Byline" value={videoMeta.byline} onChange={(e) => { setVideoMetaDirty(true); setVideoMeta((m) => ({ ...m, byline: e.target.value })) }} />
                  <textarea className="textarea textarea-bordered w-full" rows={2} placeholder="Description" value={videoMeta.description} onChange={(e) => { setVideoMetaDirty(true); setVideoMeta((m) => ({ ...m, description: e.target.value })) }} />

                  <div className="form-control">
                    <label className="label pb-0"><span className="label-text text-xs">Submitted by</span></label>
                    <input className="input input-bordered w-full bg-base-300 cursor-not-allowed" value={currentUserLabel} readOnly tabIndex={-1} />
                  </div>

                  <div className="flex justify-end">
                    <button type="button" className="btn btn-sm btn-primary" onClick={handleSaveVideoMeta} disabled={savingVideoMeta}>
                      {savingVideoMeta ? "Saving..." : "Save Video"}
                    </button>
                  </div>
                </div>
              ) : (
                <div className="rounded-md border border-base-300 bg-base-200 p-3 space-y-3">
                  <div className="font-semibold text-sm">Image Metadata</div>
                  <input className={defaultFieldClass} placeholder="Title" value={picMetadata.title} onChange={(e) => { setPicMetaDirty(true); setPicMetadata((m) => ({ ...m, title: e.target.value })) }} />
                  <input className={defaultFieldClass} placeholder="Alt text" value={picMetadata.altText} onChange={(e) => { setPicMetaDirty(true); setPicMetadata((m) => ({ ...m, altText: e.target.value })) }} />
                  <input className={defaultFieldClass} placeholder="Byline" value={picMetadata.byline} onChange={(e) => { setPicMetaDirty(true); setPicMetadata((m) => ({ ...m, byline: e.target.value })) }} />
                  <textarea className="textarea textarea-bordered w-full" rows={2} placeholder="Description" value={picMetadata.description} onChange={(e) => { setPicMetaDirty(true); setPicMetadata((m) => ({ ...m, description: e.target.value })) }} />

                  <div className="form-control">
                    <label className="label pb-0"><span className="label-text text-xs">Uploaded by</span></label>
                    <input className="input input-bordered w-full bg-base-300 cursor-not-allowed" value={currentUserLabel} readOnly tabIndex={-1} />
                  </div>

                  <div className="flex justify-end">
                    <button type="button" className="btn btn-sm btn-primary" onClick={handleSavePicMeta} disabled={savingPicMeta}>
                      {savingPicMeta ? "Saving..." : "Save Metadata"}
                    </button>
                  </div>
                </div>
              )
            ) : null}

            {editorTab === "credits" ? (
              selectedFile?.isVideoPreview ? (
                <CreditsAdder
                  credits={videoCredits}
                  onChange={(next) => { setVideoCredits(next); setVideoCreditsDirty(true) }}
                  artists={artists}
                  users={users}
                  onSave={handleSaveVideoCredits}
                  saving={savingVideoCredits}
                  roleOptions={roleOptions}
                  defaultRoleID={defaultRoleID}
                  onDirty={() => setVideoCreditsDirty(true)}
                  currentUser={currentUser}
                />
              ) : (
                <CreditsAdder
                  credits={picCredits}
                  onChange={(next) => { setPicCredits(next); setPicCreditsDirty(true) }}
                  artists={artists}
                  users={users}
                  onSave={handleSavePicCredits}
                  saving={savingPicCredits}
                  roleOptions={roleOptions}
                  defaultRoleID={defaultRoleID}
                  onDirty={() => setPicCreditsDirty(true)}
                  currentUser={currentUser}
                />
              )
            ) : null}

            {editorTab === "tags" ? (
              <div className="rounded-md border border-base-300 bg-base-200 p-3 space-y-3">
                <div className="font-semibold text-sm">Content Warning Tags</div>
                <p className="text-xs text-base-content/60">Use existing warning taxonomy tags for this media.</p>

                <div className="flex flex-wrap gap-2">
                  {warningOptions.map((option) => {
                    const selected = selectedWarnings.includes(option.key)
                    return (
                      <button
                        key={option.key}
                        type="button"
                        className={`btn btn-xs ${selected ? "btn-primary" : "btn-outline"}`}
                        onClick={() => toggleWarning(option.key)}
                      >
                        {option.label}
                      </button>
                    )
                  })}
                </div>

                {selectedWarnings.length > 0 ? (
                  <ContentTags warnings={selectedWarnings.map(warningKeyToLabel)} title="Selected Warnings" size="sm" />
                ) : (
                  <div className="text-xs text-base-content/60">No warning tags selected.</div>
                )}

                <div className="flex justify-end">
                  <button type="button" className="btn btn-sm btn-primary" onClick={handleSaveWarnings} disabled={savingWarnings}>
                    {savingWarnings ? "Saving..." : "Save Tags"}
                  </button>
                </div>
              </div>
            ) : null}
          </div>
        ) : (
          <div className="text-sm text-base-content/60 py-2">Select an image or video tile from the gallery above to edit metadata and credits.</div>
        )}
      </div>
    </div>
  )
}
