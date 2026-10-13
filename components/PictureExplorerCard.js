/* This file is part of the Twisted Artists Guild project.

 Copyright (C) 2025 Twisted Artists Guild

 Licensed under the GNU General Public License v3.0
 (https://www.gnu.org/licenses/gpl-3.0.en.html).

 This software comes with NO WARRANTY; see the license for details.

 Open source · low-profit · human-first*/

import { useEffect, useMemo, useRef, useState } from "react"
import Image from "next/image"
import { useSession } from "next-auth/react"
import { defaultFieldClass } from "@/utils/formSettings"

const CONTAINER_CONFIGS = {
	// This will get depreciated - the intent was to pass in the starting location and ensure the user can't drift into unathorized areas.
	"personal-blog": { container: "tagpictures", startPrefix: "platformpics/blog/", label: "Blog Media" },
	"artist-blog": { container: "tagpictures", startPrefix: "platformpics/user/", label: "Artist Business Media" },
	listing: { container: "tagpictures", startPrefix: "platformpics/listing/", label: "Listing Media" },
	article: { container: "platformpics", startPrefix: "news/", label: "News Articles" },
	"staff-portal": { container: "tagpictures", startPrefix: "", label: "Staff Portal Media" },
}

const AVAILABLE_CONTAINERS = ["tagpictures", "platformpics"]

function normalizePrefix(value) {
	return String(value || "").replace(/^\/+/, "")
}

function normalizeUrl(value) {
	if (!value) return ""
	return String(value).trim().toLowerCase()
}

function displayProfileName(profile) {
	return profile?.stageName || profile?.preferredName || profile?.username || profile?.displayName || profile?.name || profile?.email || ""
}

export default function PictureExplorerCard({
	useCase = "personal-blog",
	title,
	startPrefix,
	startContainer,
	allowContainerSwitch = false,
	preserveStartPrefixOnContainerSwitch = true,
	showAssetForms = true,
	onMetadataSave,
	onCreditsSave,
	defaultMetadata = {},
	defaultCredits = {},
	creditsMode = "legacy",
}) {
	const { data: session } = useSession()
	const config = CONTAINER_CONFIGS[useCase] || CONTAINER_CONFIGS["personal-blog"]
	const resolvedContainer = startContainer || config.container
	const resolvedStartPrefix = normalizePrefix(startPrefix ?? config.startPrefix)
	const [container, setContainer] = useState(resolvedContainer)
	const [activeStartPrefix, setActiveStartPrefix] = useState(resolvedStartPrefix)
	const [prefix, setPrefix] = useState(resolvedStartPrefix)
	const [directories, setDirectories] = useState([])
	const [files, setFiles] = useState([])
	const [loading, setLoading] = useState(false)
	const [error, setError] = useState("")
	const [deleteLoading, setDeleteLoading] = useState("")
	const [renameLoading, setRenameLoading] = useState("")
	const [renameFile, setRenameFile] = useState(null)
	const [newName, setNewName] = useState("")
	const [copyMessage, setCopyMessage] = useState("")
	const [uploadLoading, setUploadLoading] = useState(false)
	const [uploadMessage, setUploadMessage] = useState("")
	const [uploadError, setUploadError] = useState("")
	const [isDragOver, setIsDragOver] = useState(false)
	const [selectedImageUrl, setSelectedImageUrl] = useState("")
	const [selectedImageName, setSelectedImageName] = useState("")
	const [selectedFile, setSelectedFile] = useState(null)
	const [metadataDraft, setMetadataDraft] = useState({
		title: "",
		altText: "",
		byline: "",
		description: "",
	})
	const [creditsDraft, setCreditsDraft] = useState({
		creditRoleID: "1",
		role: "Copyright Owner",
		copyrightOwner: "",
		ownerProfileUrl: "",
		additionalCredits: "",
	})
	const [creditRoleOptions, setCreditRoleOptions] = useState([])
	const [artistProfiles, setArtistProfiles] = useState([])
	const [ownerSuggestions, setOwnerSuggestions] = useState([])
	const [showOwnerSuggestions, setShowOwnerSuggestions] = useState(false)
	const [savingMetadata, setSavingMetadata] = useState(false)
	const [savingCredits, setSavingCredits] = useState(false)
	const [formsMessage, setFormsMessage] = useState("")
	const [formsError, setFormsError] = useState("")
	const fileInputRef = useRef(null)
	const ownerFieldPrimedRef = useRef(false)

	const rootSegments = useMemo(() => activeStartPrefix.split("/").filter(Boolean), [activeStartPrefix])
	const currentSegments = useMemo(() => prefix.split("/").filter(Boolean), [prefix])
	const relativeSegments = useMemo(
		() => currentSegments.slice(rootSegments.length),
		[currentSegments, rootSegments]
	)

	const displayFolderName = (folderPath) => {
		const trimmed = folderPath.endsWith("/") ? folderPath.slice(0, -1) : folderPath
		return trimmed.split("/").pop() || folderPath
	}

	const displayFileName = (filePath) => {
		if (!prefix || !filePath.startsWith(prefix)) return filePath
		return filePath.slice(prefix.length)
	}

	const isImageFile = (file) => {
		if (file.contentType?.startsWith("image/")) return true
		const ext = file.name.split(".").pop()?.toLowerCase()
		return ["jpg", "jpeg", "png", "gif", "webp", "svg"].includes(ext)
	}

	const formatFileSize = (bytes) => {
		if (!bytes) return "0 B"
		if (bytes < 1024) return `${bytes} B`
		if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
		return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
	}

	const buildMetadataDraft = () => ({
		title: defaultMetadata.title || "",
		altText: defaultMetadata.altText || "",
		byline: defaultMetadata.byline || "",
		description: defaultMetadata.description || "",
	})

	const buildCreditsDraft = () => ({
		creditRoleID: defaultCredits.creditRoleID || "1",
		role: defaultCredits.role || "Copyright Owner",
		copyrightOwner: defaultCredits.copyrightOwner || "",
		ownerProfileUrl: defaultCredits.ownerProfileUrl || defaultCredits.externalURL || "",
		additionalCredits: defaultCredits.additionalCredits || "",
	})

	const resetFormsForFile = (file) => {
		setSelectedFile(file || null)
		setMetadataDraft(buildMetadataDraft())
		setCreditsDraft(buildCreditsDraft())
		setFormsMessage("")
		setFormsError("")
	}

	const loadDirectory = async (
		nextPrefix = prefix,
		nextStartPrefix = activeStartPrefix,
		targetContainer = container
	) => {
		setLoading(true)
		setError("")
		setCopyMessage("")

		try {
			const normalizedStartPrefix = normalizePrefix(nextStartPrefix)
			const normalizedPrefix = normalizePrefix(nextPrefix) || normalizedStartPrefix
			const params = new URLSearchParams()
			params.set("container", targetContainer)
			params.set("startPrefix", normalizedStartPrefix)
			params.set("prefix", normalizedPrefix)

			const response = await fetch(`/api/image/list?${params.toString()}`)
			const data = await response.json()

			if (!response.ok) {
				throw new Error(data.error || "Unable to load directory")
			}

			setContainer(data.container || targetContainer)
			setActiveStartPrefix(data.startPrefix || normalizedStartPrefix)
			setPrefix(data.prefix || normalizedPrefix)
			setDirectories(data.directories || [])
			setFiles(data.files || [])

			const nextImageFiles = (data.files || []).filter((file) => isImageFile(file))
			if (nextImageFiles.length > 0) {
				setSelectedImageUrl(nextImageFiles[0].url)
				setSelectedImageName(nextImageFiles[0].name)
				resetFormsForFile(nextImageFiles[0])
			} else {
				setSelectedImageUrl("")
				setSelectedImageName("")
				resetFormsForFile(null)
			}
		} catch (loadError) {
			setDirectories([])
			setFiles([])
			setSelectedImageUrl("")
			setSelectedImageName("")
			resetFormsForFile(null)
			setError(loadError.message)
		} finally {
			setLoading(false)
		}
	}

	const handleContainerChange = (nextContainer) => {
		setContainer(nextContainer)
		if (preserveStartPrefixOnContainerSwitch) {
			loadDirectory(activeStartPrefix, activeStartPrefix, nextContainer)
			return
		}
		loadDirectory("", "", nextContainer)
	}

	const goToRoot = () => {
		loadDirectory(activeStartPrefix, activeStartPrefix)
	}

	const goToParent = () => {
		if (currentSegments.length <= rootSegments.length) return
		const parent = `${currentSegments.slice(0, -1).join("/")}/`
		loadDirectory(parent, activeStartPrefix)
	}

	const goToBreadcrumb = (index) => {
		if (index < 0 || index >= relativeSegments.length) {
			goToRoot()
			return
		}
		const selected = `${[...rootSegments, ...relativeSegments.slice(0, index + 1)].join("/")}/`
		loadDirectory(selected, activeStartPrefix)
	}

	const handleDelete = async (fileUrl) => {
		if (!window.confirm("Are you sure you want to delete this image?")) return

		setDeleteLoading(fileUrl)
		setError("")

		try {
			const response = await fetch("/api/image/delete", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ imageUrl: fileUrl }),
			})
			const data = await response.json()
			if (!response.ok) {
				throw new Error(data.error || data.message || "Delete failed")
			}
			await loadDirectory(prefix, activeStartPrefix)
		} catch (deleteError) {
			setError(deleteError.message)
		} finally {
			setDeleteLoading("")
		}
	}

	const handleRename = async () => {
		if (!renameFile || !newName.trim()) return
		setRenameLoading(true)
		setError("")

		try {
			const response = await fetch("/api/image/rename", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					container,
					oldName: renameFile.name,
					newName: `${prefix}${newName.trim()}`,
				}),
			})
			const data = await response.json()
			if (!response.ok) {
				throw new Error(data.error || "Rename failed")
			}
			setRenameFile(null)
			setNewName("")
			await loadDirectory(prefix, activeStartPrefix)
		} catch (renameError) {
			setError(renameError.message)
		} finally {
			setRenameLoading(false)
		}
	}

	const handleCopyUrl = async (url) => {
		setCopyMessage("")
		try {
			await navigator.clipboard.writeText(url)
			setCopyMessage("Copied full image URL to clipboard.")
		} catch {
			setCopyMessage("Unable to copy URL in this browser context.")
		}
	}

	const handleSelectImage = (file) => {
		if (!isImageFile(file)) return
		setSelectedImageUrl(file.url)
		setSelectedImageName(file.name)
		ownerFieldPrimedRef.current = false
		resetFormsForFile(file)
	}

	const currentUserProfile = useMemo(() => {
		if (!session?.user) return null
		return {
			type: "session",
			id: session.user.id || session.user.email || session.user.name || "current-user",
			displayName: session.user.name || session.user.email || "Current User",
			username: session.user.username || session.user.name || "",
			email: session.user.email || "",
			externalURL: "",
		}
	}, [session])

	const buildOwnerSuggestions = useMemo(() => {
		return (query = "", includeDefault = false) => {
			const lowered = String(query || "").trim().toLowerCase()
			const matches = []
			if (currentUserProfile && (includeDefault || !lowered || displayProfileName(currentUserProfile).toLowerCase().includes(lowered) || String(currentUserProfile.email || "").toLowerCase().includes(lowered))) {
				matches.push({
					...currentUserProfile,
					badge: "You",
				})
			}

			const artistMatches = artistProfiles
				.filter((artist) => {
					if (!lowered) return true
					const stageName = String(artist?.stageName || "").toLowerCase()
					const username = String(artist?.username || "").toLowerCase()
					const preferredName = String(artist?.preferredName || "").toLowerCase()
					const email = String(artist?.email || "").toLowerCase()
					const externalURL = String(artist?.externalURL || artist?.webSite || "").toLowerCase()
					return stageName.includes(lowered) || username.includes(lowered) || preferredName.includes(lowered) || email.includes(lowered) || externalURL.includes(lowered)
				})
				.slice(0, 12)
				.map((artist) => ({
					type: "artist",
					id: artist.artistID || artist.id || artist.userID || artist.username,
					displayName: displayProfileName(artist),
					username: artist.username || "",
					email: artist.email || "",
					externalURL: artist.externalURL || artist.webSite || "",
					badge: "Artist",
				}))

			const merged = [...matches, ...artistMatches]
			const seen = new Set()
			return merged.filter((item) => {
				const key = `${String(item.displayName || "").toLowerCase()}::${String(item.email || "").toLowerCase()}`
				if (!key || seen.has(key)) return false
				seen.add(key)
				return true
			})
		}
	}, [artistProfiles, currentUserProfile])

	const applyOwnerSuggestion = (suggestion) => {
		setCreditsDraft((current) => ({
			...current,
			copyrightOwner: suggestion.displayName,
			ownerProfileUrl: suggestion.externalURL || current.ownerProfileUrl || "",
		}))
		setShowOwnerSuggestions(false)
	}

	const tryResolveOwnerByLink = (link) => {
		const normalized = normalizeUrl(link)
		if (!normalized) return

		const match = artistProfiles.find((artist) => {
			const externalURL = normalizeUrl(artist?.externalURL || artist?.webSite)
			if (!externalURL) return false
			return externalURL === normalized || normalized.includes(externalURL) || externalURL.includes(normalized)
		})

		if (!match) return

		const displayName = displayProfileName(match)
		if (!displayName) return

		setCreditsDraft((current) => ({
			...current,
			copyrightOwner: displayName,
			ownerProfileUrl: match.externalURL || match.webSite || current.ownerProfileUrl || "",
		}))
		setFormsMessage(`Matched profile link to ${displayName}.`)
		setFormsError("")
	}

	const fallbackSave = async (payload, successMessage) => {
		await navigator.clipboard.writeText(JSON.stringify(payload, null, 2))
		setFormsMessage(`${successMessage} (payload copied to clipboard)`)
	}

	const handleMetadataSave = async () => {
		if (!selectedFile) return

		setSavingMetadata(true)
		setFormsError("")
		setFormsMessage("")

		const payload = {
			container,
			prefix,
			startPrefix: activeStartPrefix,
			file: selectedFile,
			metadata: metadataDraft,
		}

		try {
			if (typeof onMetadataSave === "function") {
				await onMetadataSave(payload)
				setFormsMessage("Metadata saved.")
			} else {
				await fallbackSave(payload, "Metadata captured")
			}
		} catch (saveError) {
			setFormsError(saveError.message || "Unable to save metadata.")
		} finally {
			setSavingMetadata(false)
		}
	}

	const handleCreditsSave = async () => {
		if (!selectedFile) return

		setSavingCredits(true)
		setFormsError("")
		setFormsMessage("")

		const payload = {
			container,
			prefix,
			startPrefix: activeStartPrefix,
			file: selectedFile,
			credits: creditsDraft,
		}

		try {
			if (typeof onCreditsSave === "function") {
				await onCreditsSave(payload)
				setFormsMessage("Credits saved.")
			} else {
				await fallbackSave(payload, "Credits captured")
			}
		} catch (saveError) {
			setFormsError(saveError.message || "Unable to save credits.")
		} finally {
			setSavingCredits(false)
		}
	}

	const uploadFileToCurrentDirectory = async (imageFile) => {
		setUploadError("")
		setUploadMessage("")

		if (!imageFile) {
			setUploadError("No file selected.")
			return
		}

		setUploadLoading(true)
		try {
			const formData = new FormData()
			formData.append("file", imageFile)
			formData.append("container", container)
			formData.append("startPrefix", activeStartPrefix)
			formData.append("targetPrefix", prefix)

			const response = await fetch("/api/image/upload", {
				method: "POST",
				body: formData,
			})
			const data = await response.json()

			if (!response.ok) {
				throw new Error(data.error || "Upload failed")
			}

			setUploadMessage(`Uploaded to ${prefix || "/"}: ${data.url}`)
			await loadDirectory(prefix, activeStartPrefix)
		} catch (uploadErr) {
			setUploadError(uploadErr.message)
		} finally {
			setUploadLoading(false)
		}
	}

	const onDropZoneDrop = (event) => {
		event.preventDefault()
		setIsDragOver(false)
		const droppedFile = event.dataTransfer?.files?.[0]
		if (droppedFile && droppedFile.type.startsWith("image/")) {
			uploadFileToCurrentDirectory(droppedFile)
		} else {
			setUploadError("Drop an image file to upload.")
		}
	}

	useEffect(() => {
		const initialize = setTimeout(() => {
			loadDirectory(resolvedStartPrefix, resolvedStartPrefix, resolvedContainer)
		}, 0)
		return () => clearTimeout(initialize)
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [useCase, resolvedStartPrefix, resolvedContainer])

	useEffect(() => {
		fetch(`/api/artist`)
			.then((response) => (response.ok ? response.json() : []))
			.then((data) => setArtistProfiles(Array.isArray(data) ? data : []))
			.catch(() => setArtistProfiles([]))
	}, [])

	useEffect(() => {
		fetch(`/api/blog/credit-roles`)
			.then((r) => (r.ok ? r.json() : []))
			.then((data) => setCreditRoleOptions(Array.isArray(data) ? data : []))
			.catch(() => setCreditRoleOptions([]))
	}, [])

	useEffect(() => {
		if (!selectedFile) return
		if (!currentUserProfile) return
		setCreditsDraft((current) => {
			if (String(current.copyrightOwner || "").trim()) return current
			return {
				...current,
				copyrightOwner: currentUserProfile.displayName || "",
			}
		})
	}, [currentUserProfile, selectedFile])

	return (
		<div className="card bg-base-100 shadow-md border border-base-300">
			<div className="card-body gap-4">
				<h2 className="card-title">{title || config.label}</h2>

				{formsError ? <div className="alert alert-error">{formsError}</div> : null}
				{formsMessage ? <div className="alert alert-success">{formsMessage}</div> : null}

				{allowContainerSwitch && (
					<div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-end">
						<div className="form-control md:col-span-4">
							<label className="label">Container</label>
							<select
								className={defaultFieldClass}
								value={container}
								onChange={(e) => handleContainerChange(e.target.value)}
							>
								{AVAILABLE_CONTAINERS.map((name) => (
									<option key={name} value={name}>
										{name}
									</option>
								))}
							</select>
						</div>
					</div>
				)}

				<div className="rounded-md border border-base-300 bg-base-200 p-4">
					<div className="grid grid-cols-1 md:gap-6 md:grid-cols-[65%_35%]">
						<div>
							<div className="text-xs uppercase tracking-wide text-base-content/70 mb-2">Current Path</div>
							<div className="font-mono text-sm break-all bg-base-100 p-2 rounded mb-2 flex flex-wrap items-center gap-1">
								{currentSegments.length === 0 ? (
									<button className="btn btn-xs btn-ghost" type="button" onClick={() => goToBreadcrumb(-1)}>
										/
									</button>
								) : (
									<>
										<span>/</span>
										{currentSegments.map((segment, index) => {
											const isBoundarySegment = index < rootSegments.length
											const breadcrumbIndex = index - rootSegments.length

											return (
												<span key={`${segment}-${index}`} className="inline-flex items-center gap-1">
													{isBoundarySegment ? (
														<span>{segment}</span>
													) : (
														<button
															type="button"
															className="btn btn-xs btn-ghost"
															onClick={() => goToBreadcrumb(breadcrumbIndex)}
														>
															{segment}
														</button>
													)}
													<span>/</span>
												</span>
											)
										})}
									</>
								)}
							</div>
							<div className="flex flex-wrap gap-2">
								<button className="btn btn-xs btn-ghost" type="button" onClick={goToRoot}>
									Root
								</button>
								<button
									className="btn btn-xs btn-ghost"
									type="button"
									onClick={goToParent}
									disabled={currentSegments.length <= rootSegments.length}
								>
									Up
								</button>
								<button
									className="btn btn-xs btn-ghost"
									type="button"
									onClick={() => loadDirectory(prefix, activeStartPrefix)}
									disabled={loading}
								>
									{loading ? "Loading..." : "Refresh"}
								</button>
							</div>
						</div>

						<div
							className={`rounded-md border-2 border-dashed p-4 transition-colors ${
								isDragOver ? "border-primary bg-primary/10" : "border-base-100 bg-base-100"
							}`}
							onDragOver={(e) => {
								e.preventDefault()
								setIsDragOver(true)
							}}
							onDragLeave={() => setIsDragOver(false)}
							onDrop={onDropZoneDrop}
						>
							<div className="font-semibold mb-2">Upload to Current Directory</div>
							<div className="text-xs text-base-content/60 mb-3">Drop an image here, or choose a file.</div>
							<div className="flex gap-2">
								<input
									ref={fileInputRef}
									type="file"
									accept="image/*"
									className="hidden"
									onChange={(e) => uploadFileToCurrentDirectory(e.target.files?.[0] || null)}
								/>
								<button
									type="button"
									className="btn btn-sm btn-outline"
									onClick={() => fileInputRef.current?.click()}
									disabled={uploadLoading}
								>
									Choose File
								</button>
								<button
									type="button"
									className="btn btn-sm btn-primary"
									onClick={() => fileInputRef.current?.click()}
									disabled={uploadLoading}
								>
									{uploadLoading ? "Uploading..." : "Upload"}
								</button>
							</div>
						</div>
					</div>
				</div>

				{uploadError ? <div className="alert alert-error">{uploadError}</div> : null}
				{uploadMessage ? <div className="alert alert-success break-all">{uploadMessage}</div> : null}

				{error ? <div className="alert alert-error">{error}</div> : null}
				{copyMessage ? <div className="alert alert-success">{copyMessage}</div> : null}

				<div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
					<div className="lg:col-span-4 border border-base-300 rounded-md">
						<div className="px-3 py-2 border-b border-base-300 text-sm font-semibold">Folders</div>
						<div className="max-h-80 overflow-auto p-2 space-y-1">
							<button
								type="button"
								className="btn btn-sm btn-ghost justify-start w-full"
								onClick={goToParent}
								disabled={currentSegments.length <= rootSegments.length}
							>
								..
							</button>
							{directories.map((directory) => (
								<button
									key={directory}
									type="button"
									className="btn btn-sm btn-ghost justify-start w-full"
									onClick={() => loadDirectory(directory, activeStartPrefix)}
								>
									{displayFolderName(directory)}
								</button>
							))}
							{directories.length === 0 ? (
								<div className="text-sm text-base-content/60 px-2 py-1">No subfolders</div>
							) : null}
						</div>
					</div>

					<div className="lg:col-span-8 border border-base-300 rounded-md">
						<div className="px-3 py-2 border-b border-base-300 text-sm font-semibold">Files ({files.length})</div>
						<div className="max-h-80 overflow-auto">
							<table className="table table-sm">
								<thead>
									<tr>
										<th>Preview</th>
										<th>Name (Click to preview)</th>
										<th>Size (KB/MB)</th>
										<th>Modified</th>
										<th></th>
									</tr>
								</thead>
								<tbody>
									{files.map((file) => (
										<tr key={file.name} className={selectedImageUrl === file.url ? "bg-base-200" : ""}>
											<td>
												{isImageFile(file) ? (
													<button type="button" className="rounded" onClick={() => handleSelectImage(file)}>
														<Image
															src={file.url}
															alt={file.name}
															width={48}
															height={48}
															className="rounded object-cover"
														/>
													</button>
												) : (
													<span className="badge badge-ghost">file</span>
												)}
											</td>
											<td className="max-w-xs break-all">
												<button
													type="button"
													className="link link-hover"
													onClick={() => handleSelectImage(file)}
													disabled={!isImageFile(file)}
												>
													{displayFileName(file.name)}
												</button>
											</td>
											<td>{formatFileSize(file.contentLength || 0)}</td>
											<td>{file.lastModified ? new Date(file.lastModified).toLocaleString() : "-"}</td>
											<td>
												<div className="flex gap-2">
													{isImageFile(file) ? (
														<button
															type="button"
															className="btn btn-xs btn-outline"
															onClick={() => handleCopyUrl(file.url)}
														>
															Copy URL
														</button>
													) : null}
													<button
														type="button"
														className="btn btn-xs btn-outline"
														onClick={() => setRenameFile(file)}
													>
														Rename
													</button>
													<button
														type="button"
														className="btn btn-xs btn-error btn-outline"
														onClick={() => handleDelete(file.url)}
														disabled={deleteLoading === file.url}
													>
														{deleteLoading === file.url ? "Deleting..." : "Delete"}
													</button>
												</div>
											</td>
										</tr>
									))}
									{files.length === 0 ? (
										<tr>
											<td colSpan={5} className="text-base-content/60">
												No files in this folder.
											</td>
										</tr>
									) : null}
								</tbody>
							</table>
						</div>
					</div>
				</div>

				<div className="rounded-md border border-base-300 bg-base-200 p-3">
					<div className="text-sm font-semibold mb-2">Selected Image Preview</div>
					{selectedImageUrl ? (
						<>
							<div className="text-xs text-base-content/70 mb-2 break-all">{displayFileName(selectedImageName)}</div>
							<div className="relative h-[70vh] w-full overflow-hidden rounded-md bg-base-100">
								<Image src={selectedImageUrl} alt={selectedImageName} fill style={{ objectFit: "contain" }} />
							</div>
							<div className="mt-2 flex justify-end">
								<button type="button" className="btn btn-sm btn-outline" onClick={() => handleCopyUrl(selectedImageUrl)}>
									Copy Full URL
								</button>
							</div>
						</>
					) : (
						<div className="text-sm text-base-content/60">Select an image row above to preview it here.</div>
					)}
				</div>

				{showAssetForms ? (
					<div className="rounded-md border border-base-300 bg-base-200 p-3">
						<div className="text-sm font-semibold mb-3">Metadata And Credits</div>
						{selectedFile ? (
							<div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
								<div className="rounded-md border border-base-300 bg-base-100 p-3">
									<div className="font-semibold mb-2">Metadata</div>
									<div className="space-y-2">
										<input
											type="text"
											className={defaultFieldClass}
											placeholder="Title"
											value={metadataDraft.title}
											onChange={(e) => setMetadataDraft((current) => ({ ...current, title: e.target.value }))}
										/>
										<input
											type="text"
											className={defaultFieldClass}
											placeholder="Alt text"
											value={metadataDraft.altText}
											onChange={(e) => setMetadataDraft((current) => ({ ...current, altText: e.target.value }))}
										/>
										<input
											type="text"
											className={defaultFieldClass}
											placeholder="Byline"
											value={metadataDraft.byline}
											onChange={(e) => setMetadataDraft((current) => ({ ...current, byline: e.target.value }))}
										/>
										<textarea
											className="textarea textarea-bordered w-full"
											rows={3}
											placeholder="Description"
											value={metadataDraft.description}
											onChange={(e) => setMetadataDraft((current) => ({ ...current, description: e.target.value }))}
										/>
										<div className="flex justify-end">
											<button
												type="button"
												className="btn btn-sm btn-primary"
												onClick={handleMetadataSave}
												disabled={savingMetadata}
											>
												{savingMetadata ? "Saving..." : "Save Metadata"}
											</button>
										</div>
									</div>
								</div>

								<div className="rounded-md border border-base-300 bg-base-100 p-3">
									<div className="font-semibold mb-2">Credits</div>
									<div className="space-y-2">
										{creditsMode === "smart-owner" ? (
											<>
												<label className="form-control">
													<span className="label-text text-xs">Role</span>
													<select
														className="select select-bordered w-full"
														value={creditsDraft.creditRoleID || "1"}
														onChange={(e) => {
															const roleId = e.target.value
															const role = creditRoleOptions.find((option) => String(option.creditRoleID) === String(roleId))
															setCreditsDraft((current) => ({ ...current, creditRoleID: roleId, role: role?.label || "Copyright Owner" }))
														}}
													>
														{creditRoleOptions.map((option) => (
															<option key={option.creditRoleID} value={String(option.creditRoleID)}>
																{option.label}
															</option>
														))}
													</select>
												</label>

												<div className="relative">
													<input
														type="text"
														className={defaultFieldClass}
														placeholder="Copyright owner name, artist, or profile link"
														value={creditsDraft.copyrightOwner}
														onFocus={() => {
															if (!ownerFieldPrimedRef.current) {
																ownerFieldPrimedRef.current = true
																setCreditsDraft((current) => ({ ...current, copyrightOwner: "" }))
															}
															setOwnerSuggestions(buildOwnerSuggestions("", true))
															setShowOwnerSuggestions(true)
														}}
														onBlur={() => {
															setTimeout(() => setShowOwnerSuggestions(false), 100)
														}}
														onPaste={(e) => {
															const pasted = e.clipboardData?.getData("text") || ""
															if (/^https?:\/\//i.test(pasted.trim())) {
																setTimeout(() => tryResolveOwnerByLink(pasted.trim()), 0)
															}
														}}
														onChange={(e) => {
															const value = e.target.value
															setCreditsDraft((current) => ({ ...current, copyrightOwner: value }))
															setOwnerSuggestions(buildOwnerSuggestions(value))
															setShowOwnerSuggestions(true)
														}}
													/>
													{showOwnerSuggestions && ownerSuggestions.length > 0 ? (
														<div className="absolute z-20 mt-1 w-full rounded-md border border-base-300 bg-base-100 shadow-lg max-h-56 overflow-auto">
															{ownerSuggestions.map((suggestion) => (
																<button
																	key={`${suggestion.type}-${suggestion.id}-${suggestion.displayName}`}
																	type="button"
																	className="w-full px-3 py-2 text-left text-sm hover:bg-base-200"
																	onClick={() => applyOwnerSuggestion(suggestion)}
																>
																	<div className="flex items-center justify-between gap-2">
																		<span className="truncate">{suggestion.displayName}</span>
																		<span className="badge badge-ghost badge-xs">{suggestion.badge}</span>
																	</div>
																	{suggestion.username || suggestion.email ? (
																		<div className="text-[11px] text-base-content/60 truncate">{suggestion.username || suggestion.email}</div>
																	) : null}
																</button>
															))}
														</div>
													) : null}
												</div>

												<input
													type="text"
													className={defaultFieldClass}
													placeholder="Profile link (optional)"
													value={creditsDraft.ownerProfileUrl}
													onBlur={(e) => tryResolveOwnerByLink(e.target.value)}
													onChange={(e) => setCreditsDraft((current) => ({ ...current, ownerProfileUrl: e.target.value }))}
												/>

												<div className="text-xs text-base-content/60">
													Starts by suggesting your profile. Friends can be prioritized next once friend graph is wired in.
												</div>
											</>
										) : (
											<>
												<input
													type="text"
													className={defaultFieldClass}
													placeholder="Copyright owner"
													value={creditsDraft.copyrightOwner}
													onChange={(e) => setCreditsDraft((current) => ({ ...current, copyrightOwner: e.target.value }))}
												/>
												<input
													type="text"
													className={defaultFieldClass}
													placeholder="Photographer or videographer"
													value={creditsDraft.photographer || ""}
													onChange={(e) => setCreditsDraft((current) => ({ ...current, photographer: e.target.value }))}
												/>
												<input
													type="text"
													className={defaultFieldClass}
													placeholder="Makeup or styling"
													value={creditsDraft.makeup || ""}
													onChange={(e) => setCreditsDraft((current) => ({ ...current, makeup: e.target.value }))}
												/>
											</>
										)}
										<textarea
											className="textarea textarea-bordered w-full"
											rows={3}
											placeholder="Additional credits"
											value={creditsDraft.additionalCredits}
											onChange={(e) => setCreditsDraft((current) => ({ ...current, additionalCredits: e.target.value }))}
										/>
										<div className="flex justify-end">
											<button
												type="button"
												className="btn btn-sm btn-secondary"
												onClick={handleCreditsSave}
												disabled={savingCredits}
											>
												{savingCredits ? "Saving..." : "Save Credits"}
											</button>
										</div>
									</div>
								</div>
							</div>
						) : (
							<div className="text-sm text-base-content/60">
								Select an image first to edit metadata and credits.
							</div>
						)}
					</div>
				) : null}

				{renameFile && (
					<div className="modal modal-open">
						<div className="modal-box">
							<h3 className="font-bold text-lg mb-4">Rename File</h3>
							<div className="form-control mb-4">
								<label className="label">
									<span className="label-text text-xs">Current name: {displayFileName(renameFile.name)}</span>
								</label>
								<input
									type="text"
									className={defaultFieldClass}
									value={newName}
									onChange={(e) => setNewName(e.target.value)}
									placeholder="New file name"
									onKeyDown={(e) => e.key === "Enter" && handleRename()}
									autoFocus
								/>
							</div>
							<div className="modal-action">
								<button
									type="button"
									className="btn"
									onClick={() => {
										setRenameFile(null)
										setNewName("")
									}}
								>
									Cancel
								</button>
								<button
									type="button"
									className="btn btn-primary"
									onClick={handleRename}
									disabled={renameLoading || !newName.trim()}
								>
									{renameLoading ? "Renaming..." : "Rename"}
								</button>
							</div>
						</div>
						<div className="modal-backdrop" onClick={() => setRenameFile(null)} />
					</div>
				)}
			</div>
		</div>
	)
}
