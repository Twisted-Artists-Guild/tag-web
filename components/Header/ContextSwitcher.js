/* This file is part of the Twisted Artists Guild project.

 Copyright (C) 2025 Twisted Artists Guild

 Licensed under the GNU General Public License v3.0
 (https://www.gnu.org/licenses/gpl-3.0.en.html).

 This software comes with NO WARRANTY; see the license for details.

 Open source · low-profit · human-first*/
"use client"

import Image from "next/image"
import { useMemo, useState } from "react"
import { Check, ChevronsUpDown, Lock, Palette, Sparkles } from "lucide-react"

export const RESERVED_ROLE_COLORS = {
	admin: "#DC2626",
	moderator: "#EA580C",
	staff: "#F43F5E",
}

export const RESERVED_ROLE_COLOR_PRESETS = {
	admin: ["#DC2626", "#B91C1C", "#EF4444", "#991B1B"],
	moderator: ["#EA580C", "#C2410C", "#F59E0B", "#9A3412"],
	staff: ["#F43F5E", "#E11D48", "#EC4899", "#BE123C"],
}

export const STANDARD_PROFILE_COLOR_PRESETS = [
	"#3B82F6", // Royal Blue
	"#0EA5E9", // Sky Blue
	"#14B8A6", // Teal
	"#22C55E", // Emerald Green
	"#10B981", // Mint
	"#8B5CF6", // Purple
	"#A855F7", // Violet
	"#06B6D4", // Cyan
	"#D97706", // Golden Amber
	"#6366F1", // Indigo
]

export const ALL_RESERVED_HEXES = [
	"#DC2626", "#B91C1C", "#EF4444", "#991B1B",
	"#EA580C", "#C2410C", "#F59E0B", "#9A3412",
	"#F43F5E", "#E11D48", "#EC4899", "#BE123C",
]

export function isReservedCoreColor(colorHex) {
	if (!colorHex) return false
	const hex = String(colorHex).trim().toUpperCase()
	return ALL_RESERVED_HEXES.includes(hex)
}

function getContextRoleVisual(type) {
	const normalizedType = String(type || "").toLowerCase()

	if (normalizedType === "admin") {
		return {
			label: "Admin",
			pillClass: "bg-error/15 text-error border border-error/35 font-semibold",
			ringClass: "border-error/80",
			isCore: true,
		}
	}

	if (normalizedType === "moderator") {
		return {
			label: "Moderator",
			pillClass: "bg-warning/20 text-warning-content border border-warning/40 font-semibold",
			ringClass: "border-warning/80 border-dashed",
			isCore: true,
		}
	}

	if (normalizedType === "staff") {
		return {
			label: "Staff",
			pillClass: "bg-secondary/20 text-secondary-content border border-secondary/40 font-semibold",
			ringClass: "border-secondary/80 border-dotted",
			isCore: true,
		}
	}

	return {
		label: String(type || "profile"),
		pillClass: "bg-base-200 text-base-content/70 border border-base-content/15",
		ringClass: "",
		isCore: false,
	}
}

function getInitials(label) {
	if (!label) {
		return "?"
	}

	return label
		.split(" ")
		.filter(Boolean)
		.slice(0, 2)
		.map((part) => part[0])
		.join("")
		.toUpperCase()
}

function getHaloClasses(isActive, needsAttention) {
	if (needsAttention) {
		return "ring-2 ring-offset-2 ring-offset-base-100 animate-pulse motion-reduce:animate-none"
	}

	if (isActive) {
		return "ring-2 ring-offset-2 ring-offset-base-100"
	}

	return "ring-1 ring-offset-1 ring-offset-base-100"
}

function AvatarWithHalo({ context, isActive, size = "md" }) {
	const color = context.color || STANDARD_PROFILE_COLOR_PRESETS[0]
	const roleVisual = getContextRoleVisual(context.type)
	const sizeClass = size === "sm" ? "w-8" : "w-10"
	const haloStyle = {
		boxShadow: isActive || context.needsAttention ? `0 0 0 3px ${color}66, 0 0 14px ${color}88` : `0 0 0 1px ${color}66`,
		borderColor: color,
	}

	return (
		<div className={`avatar relative ${getHaloClasses(isActive, context.needsAttention)}`} style={haloStyle}>
			{roleVisual.ringClass ? <span className={`absolute -inset-1 rounded-full border-2 ${roleVisual.ringClass}`} /> : null}
			<div className={`${sizeClass} rounded-full bg-base-200 overflow-hidden flex items-center justify-center text-xs font-semibold text-base-content relative z-10 border`} style={{ borderColor: `${color}88` }}>
				{context.avatarUrl ? (
					<Image
						src={context.avatarUrl}
						alt={`${context.label} avatar`}
						width={40}
						height={40}
					/>
				) : (
					<span>{getInitials(context.label)}</span>
				)}
			</div>
		</div>
	)
}

function ContextListItem({ context, isActive, onSelect, onColorChange }) {
	const roleVisual = getContextRoleVisual(context.type)
	const color = context.color || STANDARD_PROFILE_COLOR_PRESETS[0]
	const [isPickerOpen, setIsPickerOpen] = useState(false)
	const [customHex, setCustomHex] = useState("")
	const [hexError, setHexError] = useState("")

	const normalizedType = String(context.type || "").toLowerCase()
	const isCoreRole = roleVisual.isCore

	const availablePresets = isCoreRole
		? (RESERVED_ROLE_COLOR_PRESETS[normalizedType] || RESERVED_ROLE_COLOR_PRESETS.admin)
		: STANDARD_PROFILE_COLOR_PRESETS

	const rowStyle = {
		backgroundColor: isActive ? `${color}24` : `${color}14`,
		borderColor: isActive ? `${color}66` : `${color}44`,
		boxShadow: `inset 0 0 0 1px ${isActive ? `${color}33` : `${color}1F`}`,
	}

	const handleApplyCustomHex = (e) => {
		e.preventDefault()
		let raw = customHex.trim()
		if (!raw) return
		if (!raw.startsWith("#")) {
			raw = `#${raw}`
		}

		if (!/^#[0-9A-Fa-f]{6}$/.test(raw)) {
			setHexError("Please enter a valid 6-character hex code (e.g. #3B82F6).")
			return
		}

		if (!isCoreRole && isReservedCoreColor(raw)) {
			setHexError("This color is reserved for TAG Core staff/mod/admin identities.")
			return
		}

		setHexError("")
		onColorChange?.(context.id, raw.toUpperCase())
		setCustomHex("")
	}

	const handleSwatchClick = (swatchColor, e) => {
		e.stopPropagation()
		if (!isCoreRole && isReservedCoreColor(swatchColor)) {
			setHexError("Reserved for TAG Core (Admin/Mod/Staff)")
			return
		}
		setHexError("")
		onColorChange?.(context.id, swatchColor)
	}

	return (
		<div className="space-y-1">
			<div
				className="w-full flex items-center gap-2.5 rounded-box px-2 py-2 text-left transition-colors border group"
				style={rowStyle}
			>
				<button
					type="button"
					onClick={() => onSelect(context.id)}
					className="flex items-center gap-2.5 min-w-0 flex-1 text-left"
				>
					<span className="h-8 w-1 rounded-full shrink-0" style={{ backgroundColor: color }} />
					<AvatarWithHalo context={context} isActive={isActive} />
					<div className="min-w-0 flex-1">
						<div className="font-medium text-sm text-base-content truncate flex items-center gap-1.5">
							<span className="inline-block h-2 w-2 rounded-full shrink-0" style={{ backgroundColor: color }} />
							<span className="truncate">{context.label}</span>
						</div>
						{context.subtitle ? <div className="text-[11px] text-base-content/60 truncate">{context.subtitle}</div> : null}
						<div className="mt-0.5 flex items-center gap-1">
							<span className={`badge badge-xs ${roleVisual.pillClass}`}>{roleVisual.label}</span>
							{isCoreRole ? (
								<span className="badge badge-xs bg-base-300/80 text-base-content font-medium border border-base-content/20 flex items-center gap-0.5">
									<Sparkles className="w-2.5 h-2.5 text-warning" />
									TAG Core
								</span>
							) : null}
						</div>
					</div>
				</button>

				{context.unreadCount > 0 ? (
					<span className="badge badge-error badge-sm">{context.unreadCount}</span>
				) : null}

				{typeof onColorChange === "function" ? (
					<button
						type="button"
						onClick={(e) => {
							e.stopPropagation()
							setIsPickerOpen((prev) => !prev)
						}}
						className={`btn btn-xs btn-circle ${isPickerOpen ? "btn-primary" : "btn-ghost text-base-content/60 hover:text-base-content"}`}
						title="Configure Identity Glow Color"
						aria-label="Configure Identity Glow Color"
					>
						<Palette className="w-3.5 h-3.5" />
					</button>
				) : null}

				{isActive ? <Check className="w-4 h-4 text-primary shrink-0" /> : null}
			</div>

			{isPickerOpen && typeof onColorChange === "function" ? (
				<div
					className="rounded-box border p-2.5 space-y-2 text-xs bg-base-100 shadow-inner"
					style={{ borderColor: `${color}66` }}
				>
					<div className="flex items-center justify-between">
						<span className="font-semibold flex items-center gap-1.5 text-base-content">
							<span className="w-2.5 h-2.5 rounded-full inline-block" style={{ backgroundColor: color }} />
							Identity Glow Palette
						</span>
						{isCoreRole ? (
							<span className="badge badge-xs badge-outline text-[10px] text-warning border-warning/50">
								Core Reserved Palette
							</span>
						) : (
							<span className="text-[10px] text-base-content/50">Personal Glow</span>
						)}
					</div>

					<div className="space-y-1.5">
						<div className="text-[11px] text-base-content/70">Select preset glow color:</div>
						<div className="flex flex-wrap gap-1.5">
							{availablePresets.map((preset) => (
								<button
									key={preset}
									type="button"
									onClick={(e) => handleSwatchClick(preset, e)}
									className={`w-6 h-6 rounded-full border transition-transform hover:scale-110 flex items-center justify-center ${color.toUpperCase() === preset.toUpperCase() ? "ring-2 ring-primary ring-offset-1" : ""}`}
									style={{ backgroundColor: preset, borderColor: `${preset}AA` }}
									title={preset}
								>
									{color.toUpperCase() === preset.toUpperCase() ? <Check className="w-3 h-3 text-white drop-shadow" /> : null}
								</button>
							))}
						</div>
					</div>

					{!isCoreRole ? (
						<div className="space-y-1 pt-1 border-t border-base-200">
							<div className="text-[10px] text-base-content/50 uppercase tracking-wider font-semibold">
								Reserved Core Colors (Locked)
							</div>
							<div className="flex flex-wrap gap-1.5 opacity-80">
								{ALL_RESERVED_HEXES.slice(0, 4).map((reservedColor) => (
									<div
										key={reservedColor}
										className="w-6 h-6 rounded-full border border-base-300 relative flex items-center justify-center cursor-not-allowed"
										style={{ backgroundColor: reservedColor }}
										title="Reserved for TAG Core (Admin/Mod/Staff)"
									>
										<Lock className="w-3 h-3 text-white drop-shadow" />
									</div>
								))}
							</div>
						</div>
					) : null}

					<form onSubmit={handleApplyCustomHex} className="pt-1.5 flex items-center gap-1.5">
						<input
							type="text"
							value={customHex}
							onChange={(e) => {
								setCustomHex(e.target.value)
								setHexError("")
							}}
							placeholder="HEX e.g. #3B82F6"
							className="input input-xs input-bordered flex-1 text-xs font-mono"
						/>
						<button type="submit" className="btn btn-xs btn-primary">
							Apply
						</button>
					</form>

					{hexError ? <div className="text-[11px] text-error font-medium">{hexError}</div> : null}

					<div className="text-[10px] text-base-content/60 italic pt-1.5 border-t border-base-200">
						Note: &ldquo;Everyone sees this color.&rdquo;
					</div>
				</div>
			) : null}
		</div>
	)
}

export default function ContextSwitcher({
	contexts = [],
	variant = "applet",
	activeContextId,
	onChange,
	onColorChange,
	compactSize = "md",
	compactMenuPosition = "bottom-right",
	title = "Context Switcher",
}) {
	const [internalActiveId, setInternalActiveId] = useState(activeContextId || contexts[0]?.id || null)
	const [isOpen, setIsOpen] = useState(false)

	const selectedContextId = activeContextId ?? internalActiveId
	const selectedContext = useMemo(
		() => contexts.find((context) => context.id === selectedContextId) || contexts[0] || null,
		[contexts, selectedContextId],
	)
	const panelColor = selectedContext?.color || STANDARD_PROFILE_COLOR_PRESETS[0]
	const subPanelTintStyle = {
		borderColor: `${panelColor}88`,
		backgroundColor: `${panelColor}20`,
		backgroundImage: `linear-gradient(180deg, ${panelColor}2B 0%, ${panelColor}18 100%)`,
		boxShadow: `inset 0 0 0 1px ${panelColor}33`,
	}

	const handleSelect = (contextId) => {
		if (activeContextId === undefined) {
			setInternalActiveId(contextId)
		}

		onChange?.(contextId)
		setIsOpen(false)
	}

	if (!selectedContext) {
		return (
			<div className="rounded-box border border-base-300 bg-base-100 p-3 text-sm text-base-content/70">
				No contexts available.
			</div>
		)
	}

	if (variant === "compact") {
		const isSmall = compactSize === "sm"
		const compactMenuPositionClassMap = {
			"bottom-right": "right-0 mt-2",
			"bottom-left": "left-0 mt-2",
			"top-right": "right-0 bottom-full mb-2",
			"top-left": "left-0 bottom-full mb-2",
		}
		const compactMenuPositionClass = compactMenuPositionClassMap[compactMenuPosition] || compactMenuPositionClassMap["bottom-right"]
		return (
			<div className="relative">
				<button
					type="button"
					className={`btn btn-ghost btn-circle ${isSmall ? "w-9 h-9" : "w-11 h-11"} border border-base-content/10 bg-base-100/30 relative overflow-visible`}
					onClick={() => setIsOpen((current) => !current)}
					aria-label="Open profile context switcher"
					aria-expanded={isOpen}
					style={{ borderColor: `${selectedContext.color || STANDARD_PROFILE_COLOR_PRESETS[0]}66` }}
				>
					<AvatarWithHalo context={selectedContext} isActive size={isSmall ? "sm" : "md"} />
					<span className={`absolute ${isSmall ? "-bottom-1 -right-1 w-4 h-4" : "-bottom-1 -right-1 w-5 h-5"}`}>
						<span className="absolute inset-0 rounded-full border border-primary/70 border-dashed animate-[spin_2.4s_linear_infinite] motion-reduce:animate-none" />
						<span className="absolute inset-0 rounded-full bg-primary text-primary-content flex items-center justify-center border border-base-100 shadow">
							<ChevronsUpDown className={isSmall ? "w-2.5 h-2.5" : "w-3 h-3"} />
						</span>
					</span>
				</button>

				{isOpen ? (
					<>
						<div className="fixed inset-0" style={{ zIndex: 210 }} onClick={() => setIsOpen(false)} />
						<div className={`absolute ${compactMenuPositionClass} w-80 max-w-[calc(100vw-2rem)] rounded-box border border-base-300 bg-base-100 p-3 shadow-xl space-y-3`} style={{ zIndex: 220 }}>
							<div className="flex items-center justify-between">
								<div>
									<div className="text-xs uppercase tracking-wider text-base-content/50">Profile Context</div>
									<div className="font-semibold text-base-content">{selectedContext.label}</div>
								</div>
								<ChevronsUpDown className="w-4 h-4 text-base-content/50" />
							</div>

							<div className="space-y-1 max-h-64 overflow-y-auto rounded-box border border-base-300 bg-base-200/40 p-2">
								{contexts.map((context) => (
									<ContextListItem
										key={context.id}
										context={context}
										isActive={context.id === selectedContextId}
										onSelect={handleSelect}
										onColorChange={onColorChange}
									/>
								))}
							</div>
						</div>
					</>
				) : null}
			</div>
		)
	}

	return (
		<section className="card bg-base-100 border border-base-300 shadow">
			<div className="card-body gap-4">
				<div className="flex items-center justify-between gap-3">
					<div>
						<h3 className="text-lg font-semibold text-base-content">{title}</h3>
						<p className="text-xs text-base-content/60">Applet variant for page-level embedding.</p>
					</div>
				</div>

				<div className="space-y-1.5 rounded-box border p-2" style={{ borderColor: `${panelColor}55` }}>
					{contexts.map((context) => (
						<ContextListItem
							key={context.id}
							context={context}
							isActive={context.id === selectedContextId}
							onSelect={handleSelect}
							onColorChange={onColorChange}
						/>
					))}
				</div>
			</div>
		</section>
	)
}

