import Image from "next/image"
import Link from "next/link"
import { useMemo, useState } from "react"
import { getServerSession } from "next-auth/next"

import UserContextNav from "@/components/portal/UserContextNav"
import TagSEO from "@/components/TagSEO"
import { authOptions } from "@/pages/api/auth/[...nextauth]"
import serverFetch from "@/libs/serverFetch"
import { fetchJsonWithSession } from "@/utils/venue-form"

const ROLE_META = {
	admin: { label: "Admin", badge: "badge-error", icon: "🛡️" },
	staff: { label: "Staff", badge: "badge-warning", icon: "⭐" },
	moderator: { label: "Moderator", badge: "badge-info", icon: "🔍" },
	artist: { label: "Artist", badge: "badge-success", icon: "🎨" },
}

const MODULES = [
	{ key: "shipping", title: "Shipping Tracker", icon: "📦" },
	{ key: "personalizedFeed", title: "Personalized Feed", icon: "🧠" },
	{ key: "favoriteArtistsFeed", title: "New Listings From Favorited Artists", icon: "💖" },
	{ key: "giftCard", title: "Gift Card Balance", icon: "🎁" },
]

const DEFAULT_MODULE_ORDER = MODULES.map((m) => m.key)

const FAKE_SHIPMENTS = [
	{ order: "#A5012", itemCount: 2, inFlightToHome: false, eta: "May 10" },
	{ order: "#A4981", itemCount: 1, inFlightToHome: true, eta: "May 9" },
	{ order: "#A4975", itemCount: 3, inFlightToHome: true, eta: "May 12" },
]

const FAKE_STANDARD_FEED = [
	"Sunrise Ink Study added in Drawings",
	"Glass Bloom listing updated with new images",
	"Community pick: Coastal Night",
]

const FAKE_FAVORITE_FEED = [
	{ artist: "Cinder Vale", listing: "Night Rivulet" },
	{ artist: "Mara Quinn", listing: "Dustlight II" },
	{ artist: "Ivy Ko", listing: "Alley Botanica" },
]

function SectionHeading({ children }) {
	return <h2 className="text-xs font-semibold text-base-content/50 uppercase tracking-widest">{children}</h2>
}

function ModuleCard({ module, index, total, onMoveUp, onMoveDown, onRemove, children }) {
	return (
		<div className="card bg-base-100 shadow border border-base-300">
			<div className="card-body p-4 gap-3">
				<div className="flex items-start justify-between gap-3">
					<h3 className="font-semibold text-base-content">
						<span className="mr-2">{module.icon}</span>
						{module.title}
					</h3>
					<div className="flex items-center gap-1">
						<button type="button" className="btn btn-xs btn-ghost" onClick={onMoveUp} disabled={index === 0}>
							↑
						</button>
						<button type="button" className="btn btn-xs btn-ghost" onClick={onMoveDown} disabled={index === total - 1}>
							↓
						</button>
						<button type="button" className="btn btn-xs btn-ghost text-error" onClick={onRemove}>
							Hide
						</button>
					</div>
				</div>
				{children}
			</div>
		</div>
	)
}

function renderModuleBody(moduleKey, context) {
	const { sessionUser } = context

	switch (moduleKey) {
		case "shipping":
			const itemsOrdered = FAKE_SHIPMENTS.reduce((sum, shipment) => sum + shipment.itemCount, 0)
			const itemsInFlightToHome = FAKE_SHIPMENTS
				.filter((shipment) => shipment.inFlightToHome)
				.reduce((sum, shipment) => sum + shipment.itemCount, 0)

			return (
				<div className="space-y-2 text-sm">
					<div className="badge badge-ghost">Faked for now</div>
					<div className="stats stats-horizontal shadow-sm bg-base-200 w-full">
						<div className="stat px-3 py-2">
							<div className="stat-title text-xs">Items Ordered</div>
							<div className="stat-value text-lg">{itemsOrdered}</div>
						</div>
						<div className="stat px-3 py-2">
							<div className="stat-title text-xs">In Flight To Home</div>
							<div className="stat-value text-lg text-info">{itemsInFlightToHome}</div>
						</div>
					</div>
					{FAKE_SHIPMENTS.map((shipment) => (
						<div key={shipment.order} className="flex justify-between gap-2 border-b border-base-200 pb-1">
							<span>{shipment.order}</span>
							<span className="text-base-content/60">{shipment.itemCount} item(s)</span>
							<span className="font-medium">
								{shipment.inFlightToHome ? "In flight to home" : "Preparing shipment"}
								{" "}
								• ETA {shipment.eta}
							</span>
						</div>
					))}
				</div>
			)

		case "personalizedFeed":
			return (
				<div className="space-y-2 text-sm">
					<div className="badge badge-ghost">Faked with standard feed</div>
					<p className="text-base-content/60">Personalized for {sessionUser?.name || "your account"}.</p>
					<ul className="list-disc pl-5 space-y-1">
						{FAKE_STANDARD_FEED.map((item) => <li key={item}>{item}</li>)}
					</ul>
				</div>
			)

		case "favoriteArtistsFeed":
			return (
				<div className="space-y-2 text-sm">
					<div className="badge badge-ghost">Faked for now</div>
					<ul className="space-y-1">
						{FAKE_FAVORITE_FEED.map((item) => (
							<li key={`${item.artist}-${item.listing}`} className="flex justify-between gap-2">
								<span className="font-medium">{item.artist}</span>
								<span className="text-base-content/60">{item.listing}</span>
							</li>
						))}
					</ul>
				</div>
			)

		case "privacy":
			return (
				<div className="space-y-2 text-sm">
					<p className="text-base-content/70">Manage privacy, notification, and account-level preferences from one place.</p>
					<Link href="/portal/user/settings" className="btn btn-sm btn-outline">Open Settings Hub</Link>
				</div>
			)

		case "profile":
			return (
				<div className="space-y-2 text-sm">
					<p className="text-base-content/70">Update your profile copy and upload your picture.</p>
					<Link href="/portal/user/profile" className="btn btn-sm btn-primary">Edit Profile</Link>
				</div>
			)

		case "giftCard":
			return (
				<div className="space-y-2 text-sm">
					<div className="badge badge-ghost">Faked for now</div>
					<div className="text-3xl font-bold text-primary">$42.00</div>
					<p className="text-base-content/60">Gift card balance for {sessionUser?.email}</p>
				</div>
			)

		case "contentWarnings":
			return (
				<div className="space-y-2 text-sm">
					<p className="text-base-content/70">Choose which content warning tags you want to hide or show.</p>
					<div className="flex gap-2 flex-wrap">
						<Link href="/portal/user/preferences/content" className="btn btn-sm btn-accent">Edit Content Warning Preferences</Link>
						<Link href="/portal/user/preferences" className="btn btn-sm btn-ghost">Preferences Hub</Link>
					</div>
				</div>
			)

		default:
			return <p className="text-sm text-base-content/60">Module content unavailable.</p>
	}
}

export default function UserIndexPage({ sessionUser, apiSnapshot }) {
	const pageMetaData = {
		title: "My Dashboard",
		description: "User account dashboard.",
		keywords: "user, account, profile, settings",
		robots: "noindex, nofollow",
		og: { title: "My Dashboard", description: "User account dashboard." },
	}

	const roles = apiSnapshot?.roles || []
	const registeredVendors = apiSnapshot?.registeredVendors || []
	const registeredVenues = apiSnapshot?.registeredVenues || []

	const roleLabels = roles.filter((role) => ROLE_META[role]).map((role) => ROLE_META[role].label)
	const greetingRoles =
		roleLabels.length === 0
			? null
			: roleLabels.length === 1
				? roleLabels[0]
				: `${roleLabels.slice(0, -1).join(", ")} and ${roleLabels[roleLabels.length - 1]}`

	const [moduleOrder, setModuleOrder] = useState(DEFAULT_MODULE_ORDER)
	const [selectedModuleKey, setSelectedModuleKey] = useState(MODULES[0].key)

	const visibleModules = useMemo(
		() => moduleOrder.map((key) => MODULES.find((module) => module.key === key)).filter(Boolean),
		[moduleOrder],
	)

	const hiddenModules = useMemo(
		() => MODULES.filter((module) => !moduleOrder.includes(module.key)),
		[moduleOrder],
	)

	const moveModule = (fromIndex, toIndex) => {
		if (toIndex < 0 || toIndex >= moduleOrder.length) {
			return
		}

		const next = [...moduleOrder]
		const [moved] = next.splice(fromIndex, 1)
		next.splice(toIndex, 0, moved)
		setModuleOrder(next)
	}

	const removeModule = (keyToRemove) => {
		setModuleOrder((current) => current.filter((key) => key !== keyToRemove))
		setSelectedModuleKey(keyToRemove)
	}

	const addModule = () => {
		if (hiddenModules.length === 0) {
			return
		}

		const keyToAdd = hiddenModules.some((module) => module.key === selectedModuleKey)
			? selectedModuleKey
			: hiddenModules[0].key

		setModuleOrder((current) => (
			current.includes(keyToAdd) ? current : [...current, keyToAdd]
		))

		const remaining = hiddenModules.filter((module) => module.key !== keyToAdd)
		if (remaining.length > 0) {
			setSelectedModuleKey(remaining[0].key)
		} else {
			setSelectedModuleKey(keyToAdd)
		}
	}

	return (
		<div className="min-h-screen bg-base-200 p-4 md:p-8">
			<TagSEO metadataProp={pageMetaData} canonicalSlug="portal/user" />				<UserContextNav />
			<div className="max-w-5xl mx-auto space-y-6">
				<div className="card bg-base-100 shadow-lg">
					<div className="card-body flex-row items-center gap-4 flex-wrap">
						{sessionUser?.image && (
							<div className="avatar">
								<div className="w-16 rounded-full ring ring-primary ring-offset-base-100 ring-offset-2">
									<Image src={sessionUser.image} alt={sessionUser.name || "Avatar"} width={64} height={64} />
								</div>
							</div>
						)}
						<div className="flex-1 min-w-0">
							<h1 className="text-2xl font-bold text-base-content">Hi, {sessionUser?.name || "there"}!</h1>
							{greetingRoles ? (
								<p className="text-base-content/70 mt-0.5">
									I see you are a <span className="font-semibold text-primary">{greetingRoles}</span>. Welcome back.
								</p>
							) : (
								<p className="text-base-content/70 mt-0.5">Welcome back.</p>
							)}
							<div className="flex flex-wrap gap-2 mt-2">
								{roles.filter((role) => ROLE_META[role]).map((role) => (
									<span key={role} className={`badge ${ROLE_META[role].badge} gap-1`}>
										{ROLE_META[role].icon} {ROLE_META[role].label}
									</span>
								))}
							</div>
						</div>
					</div>
				</div>

				<div className="card bg-base-100 border border-base-300 shadow">
					<div className="card-body p-4 gap-3">
						<SectionHeading>Linked Vendor & Venue Entities</SectionHeading>
						<p className="text-sm text-base-content/70">
							Tables are temporary output for now. Cards can replace these once entity card UX is finalized.
						</p>

						<div className="space-y-3">
							<h3 className="font-semibold text-base-content">Linked Vendors</h3>
							{registeredVendors.length > 0 ? (
								<div className="overflow-x-auto rounded-xl border border-base-300">
									<table className="table table-zebra table-sm">
										<thead>
											<tr>
												<th>Vendor</th>
												<th>Slug</th>
												<th>Status</th>
												<th className="text-right">Open</th>
											</tr>
										</thead>
										<tbody>
											{registeredVendors.map((vendor) => {
												const slug = vendor.path || vendor.slug || ""
												return (
													<tr key={`${vendor.vendorID || slug || vendor.title}`}> 
														<td className="font-medium">{vendor.title || vendor.name || "Untitled Vendor"}</td>
														<td><code>{slug || "(no slug)"}</code></td>
														<td>{vendor.isPublished ? <span className="badge badge-success badge-sm">Published</span> : <span className="badge badge-warning badge-sm">Draft</span>}</td>
														<td className="text-right">
															{slug ? <Link href={`/portal/vendor/${slug}`} className="btn btn-xs btn-primary">Open</Link> : <span className="badge badge-ghost badge-sm">n/a</span>}
														</td>
													</tr>
												)
											})}
										</tbody>
									</table>
								</div>
							) : (
								<div className="text-sm text-base-content/60">No linked vendors found.</div>
							)}
						</div>

						<div className="space-y-3">
							<h3 className="font-semibold text-base-content">Linked Venues</h3>
							{registeredVenues.length > 0 ? (
								<div className="overflow-x-auto rounded-xl border border-base-300">
									<table className="table table-zebra table-sm">
										<thead>
											<tr>
												<th>Venue</th>
												<th>Slug</th>
												<th className="text-right">Open</th>
											</tr>
										</thead>
										<tbody>
											{registeredVenues.map((venue) => {
												const slug = venue.path || venue.slug || ""
												return (
													<tr key={`${venue.venueID || slug || venue.title || venue.name}`}> 
														<td className="font-medium">{venue.title || venue.name || "Untitled Venue"}</td>
														<td><code>{slug || "(no slug)"}</code></td>
														<td className="text-right">
															{slug ? <Link href={`/portal/venue/${slug}`} className="btn btn-xs btn-primary">Open</Link> : <span className="badge badge-ghost badge-sm">n/a</span>}
														</td>
													</tr>
												)
											})}
										</tbody>
									</table>
								</div>
							) : (
								<div className="text-sm text-base-content/60">No linked venues found.</div>
							)}
						</div>
					</div>
				</div>

				<div className="card bg-base-100 border border-base-300 shadow">
					<div className="card-body p-4 gap-3">
						<SectionHeading>Homepage Module Layout</SectionHeading>
						<p className="text-sm text-base-content/70">
							Add modules and arrange them in the order you want.
						</p>
						<div className="flex flex-wrap gap-2 items-center">
							<select
								className="select select-bordered select-sm w-full sm:w-auto"
								value={selectedModuleKey}
								onChange={(event) => setSelectedModuleKey(event.target.value)}
								disabled={hiddenModules.length === 0}
							>
								{hiddenModules.length === 0 ? (
									<option value="">All modules are currently shown</option>
								) : (
									hiddenModules.map((module) => (
										<option key={module.key} value={module.key}>
											{module.icon} {module.title}
										</option>
									))
								)}
							</select>
							<button type="button" className="btn btn-sm btn-primary" onClick={addModule} disabled={hiddenModules.length === 0}>
								Add module
							</button>
						</div>
					</div>
				</div>

				<div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
					{visibleModules.map((module, index) => (
						<ModuleCard
							key={module.key}
							module={module}
							index={index}
							total={visibleModules.length}
							onMoveUp={() => moveModule(index, index - 1)}
							onMoveDown={() => moveModule(index, index + 1)}
							onRemove={() => removeModule(module.key)}
						>
							{renderModuleBody(module.key, { sessionUser })}
						</ModuleCard>
					))}
				</div>

				<div className="card bg-base-100 shadow border border-base-300">
					<div className="card-body p-4 flex-row flex-wrap items-center gap-4 justify-between">
						<div className="text-sm text-base-content/60">
							Signed in as <span className="font-medium text-base-content">{sessionUser?.email}</span>
						</div>
						<Link href="/api/auth/signout" className="btn btn-sm btn-ghost text-error">
							Sign out
						</Link>
					</div>
				</div>
			</div>
		</div>
	)
}

export async function getServerSideProps(context) {
	const session = await getServerSession(context.req, context.res, authOptions)

	if (!session?.user) {
		return {
			redirect: {
				destination: `/api/auth/signin?callbackUrl=${encodeURIComponent("/portal/user")}`,
				permanent: false,
			},
		}
	}

	const userId = session.user.id || null
	const apiSnapshot = {
		user: null,
		preference: null,
		privacy: null,
		settings: null,
		registeredArtists: [],
		registeredVendors: [],
		registeredVenues: [],
		roles: session.user.roles || [],
		permissions: session.user.permissions || [],
	}

	if (userId) {
		try {

			const fetchJsonOrNull = async (url) => {
				const res = await serverFetch(url)
				if (!res.ok) {
					return null
				}
				return res.json()
			}

			const [user, preference, privacy, settings, registeredArtists, vendorLinksRaw, linkedVenuesRaw] = await Promise.all([
				fetchJsonOrNull(`/user-details/${userId}/private?viewerUserId=${encodeURIComponent(String(userId))}`),
				fetchJsonOrNull(`/userpreference/${userId}`),
				fetchJsonOrNull(`/userprivacy/by-user/${userId}?viewerUserId=${encodeURIComponent(String(userId))}`),
				fetchJsonOrNull(`/usersettings/${userId}`),
				fetchJsonOrNull(`/linker_usertoartist/byUserID/${userId}`),
				fetchJsonOrNull(`/linker_vendortouser`),
				fetchJsonWithSession({ req: context.req, path: `/linker_usertovenue/byUserID/${userId}`, fetchApi: serverFetch }),
			])

			apiSnapshot.user = user
			apiSnapshot.preference = preference
			apiSnapshot.privacy = privacy
			apiSnapshot.settings = settings
			const linkedArtists = Array.isArray(registeredArtists)
				? registeredArtists.map((artist) => ({
					artistID: artist?.artistID ?? artist?.ArtistID ?? null,
					title: artist?.title ?? artist?.Title ?? null,
					path: artist?.path ?? artist?.Path ?? null,
					byline: artist?.byline ?? artist?.Byline ?? null,
					profilePic: artist?.profilePic ?? artist?.ProfilePic ?? null,
					linkRole: artist?.linkRole ?? artist?.LinkRole ?? null,
				}))
				: []

			const artistProfiles = await Promise.all(
				linkedArtists.map(async (artist) => {
					if (!artist.path) {
						return artist
					}

					const profileData = await fetchJsonOrNull(`/artist/${artist.path}/profile`)
					if (!profileData?.artist) {
						return artist
					}

					const profileArtist = profileData.artist
					return {
						...artist,
						artistID: artist.artistID ?? profileArtist?.artistID ?? profileArtist?.ArtistID ?? null,
						title: artist.title ?? profileArtist?.title ?? profileArtist?.Title ?? null,
						path: artist.path ?? profileArtist?.path ?? profileArtist?.Path ?? null,
						byline: artist.byline ?? profileArtist?.byline ?? profileArtist?.Byline ?? null,
						statement: profileArtist?.statement ?? profileArtist?.Statement ?? null,
						biography: profileArtist?.biography ?? profileArtist?.Biography ?? null,
						seoTags: profileArtist?.seoTags ?? profileArtist?.SEOTags ?? null,
						since: profileArtist?.since ?? profileArtist?.Since ?? null,
						profilePic: profileData?.profilePic ?? artist.profilePic ?? null,
						coverPic: profileData?.coverPic ?? null,
						listings: Array.isArray(profileData?.listings) ? profileData.listings : [],
						panelSize: "full",
					}
				}),
			)

			apiSnapshot.registeredArtists = artistProfiles

			const vendorLinks = Array.isArray(vendorLinksRaw) ? vendorLinksRaw : []
			const linkedVendorIds = Array.from(
				new Set(
					vendorLinks
						.filter((row) => Number(row?.userID || row?.UserID || row?.userId || row?.UserId || 0) === Number(userId))
						.map((row) => Number(row?.vendorID || row?.VendorID || row?.vendorId || row?.VendorId || 0))
						.filter((value) => Number.isFinite(value) && value > 0),
				),
			)

			const vendorProfiles = await Promise.all(
				linkedVendorIds.map(async (vendorId) => {
					const vendorData = await fetchJsonOrNull(`/vendor/byID/${vendorId}`)
					if (!vendorData) {
						return null
					}

					return {
						vendorID: vendorData?.vendorID ?? vendorData?.VendorID ?? vendorId,
						title: vendorData?.title ?? vendorData?.Title ?? vendorData?.name ?? vendorData?.Name ?? null,
						path: vendorData?.path ?? vendorData?.Path ?? null,
						slug: vendorData?.slug ?? vendorData?.Slug ?? null,
						isPublished: Boolean(vendorData?.isPublished ?? vendorData?.IsPublished),
					}
				}),
			)

			apiSnapshot.registeredVendors = vendorProfiles.filter(Boolean)

			const linkedVenues = Array.isArray(linkedVenuesRaw)
				? linkedVenuesRaw.map((venue) => ({
					venueID: venue?.venueID ?? venue?.VenueID ?? venue?.id ?? venue?.ID ?? null,
					title: venue?.title ?? venue?.Title ?? venue?.name ?? venue?.Name ?? null,
					path: venue?.path ?? venue?.Path ?? null,
					slug: venue?.slug ?? venue?.Slug ?? null,
				}))
				: []

			apiSnapshot.registeredVenues = linkedVenues
		} catch (error) {
			console.error("Unable to load user API snapshot:", error.message)
		}
	}

	const props = {
		sessionUser: session.user,
		apiSnapshot,
	}

	return {
		props: JSON.parse(JSON.stringify(props)),
	}
}
