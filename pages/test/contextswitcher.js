/* This file is part of the Twisted Artists Guild project.

 Copyright (C) 2025 Twisted Artists Guild

 Licensed under the GNU General Public License v3.0
 (https://www.gnu.org/licenses/gpl-3.0.en.html).

 This software comes with NO WARRANTY; see the license for details.

 Open source · low-profit · human-first*/
import { useMemo, useState } from "react"

import TagSEO from "@/components/TagSEO"
import ContextSwitcher from "@/components/Header/ContextSwitcher"

const INITIAL_CONTEXTS = [
	{
		id: "artist-main",
		label: "Twisted Passions",
		type: "artist",
		avatarUrl: "https://tagpictures.blob.core.windows.net/platformpics/about/bobb/352758208_10167521936530573_1350574665168998075_n.jpg",
		color: "#3B82F6",
		unreadCount: 2,
		needsAttention: true,
	},
	{
		id: "collective",
		label: "TAG Collective",
		type: "collective",
		avatarUrl: "https://tagpictures.blob.core.windows.net/platformpics/about/bobb/367448489_10167756207805573_115514317805409958_n.jpg",
		color: "#14B8A6",
		unreadCount: 0,
		needsAttention: false,
	},
	{
		id: "business",
		label: "Gallery Ops",
		type: "business",
		avatarUrl: "",
		color: "#F59E0B",
		unreadCount: 5,
		needsAttention: true,
	},
	{
		id: "admin",
		label: "TAG Admin",
		type: "admin",
		avatarUrl: "",
		color: "#DC2626",
		unreadCount: 3,
		needsAttention: true,
	},
	{
		id: "moderator",
		label: "TAG Moderator",
		type: "moderator",
		avatarUrl: "",
		color: "#EA580C",
		unreadCount: 1,
		needsAttention: false,
	},
	{
		id: "staff",
		label: "TAG Staff",
		type: "staff",
		avatarUrl: "",
		color: "#F43F5E",
		unreadCount: 1,
		needsAttention: false,
	},
]

export default function ContextSwitcherTestPage() {
	const [contexts, setContexts] = useState(INITIAL_CONTEXTS)
	const [activeContextId, setActiveContextId] = useState(INITIAL_CONTEXTS[0].id)

	const activeContext = useMemo(
		() => contexts.find((context) => context.id === activeContextId) || contexts[0],
		[contexts, activeContextId],
	)

	const updateContext = (contextId, changes) => {
		setContexts((current) =>
			current.map((context) =>
				context.id === contextId
					? { ...context, ...changes }
					: context,
			),
		)
	}

	const handleColorChange = (contextId, color) => {
		updateContext(contextId, { color })
	}

	const incrementUnread = () => {
		updateContext(activeContextId, {
			unreadCount: (activeContext?.unreadCount || 0) + 1,
			needsAttention: true,
		})
	}

	const clearAttention = () => {
		updateContext(activeContextId, {
			unreadCount: 0,
			needsAttention: false,
		})
	}

	const pageMetaData = {
		title: "Context Switcher Tester",
		description: "UX exploration page for context switching variants",
		keywords: "context switcher, profile switcher, ux, testing",
		robots: "noindex, nofollow",
		author: "Twisted Artists Guild",
		viewport: "width=device-width, initial-scale=1.0",
		og: {
			title: "Context Switcher Tester",
			description: "Compact and applet context switcher prototypes",
		},
	}

	return (
		<div className="container mx-auto max-w-6xl p-4 md:p-6 space-y-6">
			<TagSEO metadataProp={pageMetaData} canonicalSlug="test/contextswitcher" />

			<section className="card bg-base-100 border border-base-300 shadow">
				<div className="card-body gap-3">
					<h1 className="text-3xl font-bold text-primary">Context Switcher UX Tester</h1>
					<p className="text-sm text-base-content/70">
						Sandbox page for iterating two variants before integrating into Login Profile.
					</p>
					<div className="flex flex-wrap items-center gap-2">
						<span className="badge badge-primary">Active: {activeContext?.label}</span>
						<span className="badge badge-outline">Type: {activeContext?.type}</span>
						<span className="badge badge-error">Unread: {activeContext?.unreadCount || 0}</span>
					</div>
				</div>
			</section>

			<div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
				<section className="card bg-base-100 border border-base-300 shadow">
					<div className="card-body gap-4">
						<h2 className="text-xl font-semibold text-base-content">Variant A: Compact (Popup)</h2>
						<p className="text-sm text-base-content/70">
							Intended for Login Profile area later. Keeps footprint small and opens a rich popup for switching.
						</p>
						<div className="flex items-center gap-3">
							<ContextSwitcher
								variant="compact"
								contexts={contexts}
								activeContextId={activeContextId}
								onChange={setActiveContextId}
								onColorChange={handleColorChange}
							/>
							<span className="text-xs text-base-content/60">Click avatar to open popup</span>
						</div>
					</div>
				</section>

				<ContextSwitcher
					variant="applet"
					title="Variant B: Applet (Embeddable)"
					contexts={contexts}
					activeContextId={activeContextId}
					onChange={setActiveContextId}
					onColorChange={handleColorChange}
				/>
			</div>

			<section className="card bg-base-100 border border-base-300 shadow">
				<div className="card-body gap-3">
					<h3 className="text-lg font-semibold text-base-content">Interaction Controls</h3>
					<p className="text-sm text-base-content/70">
						Use these controls to stress-test notification and attention states on the currently active context.
					</p>
					<div className="flex flex-wrap gap-2">
						<button type="button" className="btn btn-sm btn-primary" onClick={incrementUnread}>Simulate Notification</button>
						<button type="button" className="btn btn-sm btn-outline" onClick={clearAttention}>Clear Attention State</button>
					</div>
				</div>
			</section>
		</div>
	)
}

