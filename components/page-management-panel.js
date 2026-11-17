import { Dialog, DialogPanel, DialogTitle, Description } from "@headlessui/react"
import dynamic from "next/dynamic"
import Link from "next/link"
import { useRouter } from "next/router"
import { useSession } from "next-auth/react"
import { useEffect, useId, useState } from "react"
import { ChevronDown, Settings2 } from "lucide-react"
import { isAdmin } from "@/utils/authHelpers"
import {
  getPageManagementAccess,
  getPageManagementRelationship,
  getPageManagementTarget,
  resolvePageOwnership,
} from "@/utils/page-management"

const GalleryManager = dynamic(() => import("@/components/gallery/GalleryManager"), {
  ssr: false,
  loading: () => <p role="status">Loading image editor...</p>,
})
const mediaLabels = {
  cover: "Change cover",
  profile: "Change profile picture",
  gallery: "Manage gallery",
}

export default function PageManagementPanel({ entityType, entity, slug, artistSlug, isIndex = false }) {
  const { data: session } = useSession()
  const target = { ...getPageManagementTarget(entityType, entity || {}, slug, artistSlug), isIndex }

  return (
    <PageManagementControls
      key={`${session?.user?.id}:${entityType}:${isIndex}:${target.id}:${target.ownerUserId}:${target.ownerArtistId}`}
      session={session}
      target={target}
    />
  )
}

function PageManagementControls({ session, target }) {
  const router = useRouter()
  const controlsId = useId()
  const reasonId = useId()
  const [expanded, setExpanded] = useState(false)
  const [ownership, setOwnership] = useState({ loading: !target.isIndex, isOwner: false, error: "" })
  const [retry, setRetry] = useState(0)
  const [action, setAction] = useState(null)
  const [reason, setReason] = useState("")
  const [confirmedReason, setConfirmedReason] = useState("")
  const { entityType, id, ownerUserId, ownerArtistId } = target
  const userId = session?.user?.id

  useEffect(() => {
    if (!userId || !id) return
    let ignore = false
    resolvePageOwnership({ entityType, id, ownerUserId, ownerArtistId }, userId)
      .then((isOwner) => {
        if (!ignore) setOwnership({ loading: false, isOwner, error: "" })
      })
      .catch((error) => {
        console.error("Page ownership check failed:", error)
        if (!ignore) setOwnership({ loading: false, isOwner: false, error: error.message || "Unable to check page ownership." })
      })
    return () => { ignore = true }
  }, [entityType, id, ownerUserId, ownerArtistId, userId, retry])

  const access = getPageManagementAccess(session, target, ownership.isOwner)
  const hasActions = access.canEdit || access.canModerate || access.canManageContests || access.canCreateBlog
  const admin = isAdmin(session)
  // Index actions have no entity owner and retain their existing creation permissions.
  if (!admin && !target.isIndex && !ownership.isOwner) return null
  if (!userId || (!hasActions && !ownership.error)) return null

  const mediaKinds = entityType === "blog" ? ["gallery"] : ["cover", "profile", "gallery"]
  const rootPrefix = `platformpics/${entityType}/${id}/`
  const needsReason = access.needsReason && !confirmedReason
  const actionLabel = action === "details" ? "Edit details" : mediaLabels[action]
  const targetType = entityType.charAt(0).toUpperCase() + entityType.slice(1)
  const moderationQuery = new URLSearchParams({
    targetType,
    targetId: String(id),
    targetUrl: router.asPath.split(/[?#]/)[0],
  })

  function openAction(nextAction) {
    setReason("")
    setConfirmedReason("")
    setAction(nextAction)
  }

  function closeDialog() {
    setAction(null)
    setConfirmedReason("")
  }

  function handleReasonSubmit(event) {
    event.preventDefault()
    const trimmedReason = reason.trim()
    if (!trimmedReason) return
    setConfirmedReason(trimmedReason)
  }

  return (
    <aside aria-label="Page management" className="mb-2 w-full rounded-box border border-base-300 bg-base-100 text-base-content text-sm">
      <div className="grid grid-cols-[1fr_auto] items-center gap-x-2 gap-y-1 px-3 py-1 sm:grid-cols-[1fr_auto_1fr]">
        <span className="flex items-center gap-2">
          <Settings2 size={16} aria-hidden="true" />
          Management Panel
        </span>
        <div className="col-span-2 row-start-2 text-center text-xs sm:col-span-1 sm:col-start-2 sm:row-start-1" aria-live="polite">
          <span className="font-semibold">{session.user.name || "Your account"}</span>
          <span className="mx-2 text-base-content/40" aria-hidden="true">|</span>
          <span className="text-base-content/70">
            {ownership.loading ? "Checking relationship..." : getPageManagementRelationship(session, target, ownership.isOwner)}
          </span>
        </div>
        <button type="button" className="btn btn-ghost btn-xs col-start-2 row-start-1 justify-self-end sm:col-start-3" aria-expanded={expanded} aria-controls={controlsId} onClick={() => setExpanded(!expanded)}>
          Manage <ChevronDown size={14} aria-hidden="true" className={expanded ? "rotate-180" : ""} />
        </button>
      </div>
      <div id={controlsId} hidden={!expanded} className="border-t border-base-300 px-3 py-2 space-y-2">
        <p className="text-base-content/70">
          {access.canCreateBlog ? "Create a new blog post in the portal." : ""}
          {access.canEdit ? "Update page details or pictures using your available editing access. " : ""}
          {access.canModerate ? "Review content reports in the moderation dashboard." : ""}
        </p>
        {admin && ownership.error ? (
          <div role="alert" className="text-error">
            {ownership.error}{" "}
            {access.needsReason
              ? "You can still edit using admin access with a reason."
              : access.canEdit
                ? "Your existing editing permission is still available."
                : "Owner editing is unavailable until ownership can be checked."}
            <button type="button" className="btn btn-ghost btn-xs ml-2" onClick={() => {
              setOwnership({ loading: true, isOwner: false, error: "" })
              setRetry(retry + 1)
            }}>Retry</button>
          </div>
        ) : null}
        <div className="flex flex-wrap gap-2">
          {access.canCreateBlog ? <Link href="/portal/staff/tagblog/create" className="btn btn-primary btn-sm">Create blog post</Link> : null}
          {access.canEdit && target.editHref && !access.needsReason ? (
            <Link href={target.editHref} className="btn btn-primary btn-sm">Edit details</Link>
          ) : access.canEdit && target.editHref ? (
            <button type="button" className="btn btn-primary btn-sm" onClick={() => openAction("details")}>Edit details</button>
          ) : null}
          {access.canEdit && mediaKinds.map((kind) => (
            <button type="button" key={kind} className="btn btn-outline btn-sm" onClick={() => openAction(kind)}>
              {mediaLabels[kind]}
            </button>
          ))}
          {access.canModerate ? <Link href={`/portal/staff/moderation?${moderationQuery}`} className="btn btn-outline btn-sm">Open moderation</Link> : null}
          {access.canManageContests ? <Link href="/portal/staff/contests" className="btn btn-outline btn-sm">Contest tools</Link> : null}
        </div>
      </div>
      <Dialog open={!!action && access.canEdit} onClose={closeDialog} className="relative z-50">
        <div className="fixed inset-0 bg-black/50" aria-hidden="true" />
        <div className="fixed inset-0 overflow-y-auto p-4">
          <div className="flex min-h-full items-center justify-center">
            <DialogPanel className={`w-full rounded-box bg-base-100 p-4 shadow-xl space-y-4 ${needsReason || action === "details" ? "max-w-lg" : "max-w-5xl"}`}>
              <div className="flex items-center justify-between gap-3">
                <DialogTitle className="text-lg font-semibold">{actionLabel}</DialogTitle>
                <button type="button" className="btn btn-ghost btn-sm" onClick={closeDialog}>
                  Close
                </button>
              </div>
              <Description className="text-sm text-base-content/70">
                {needsReason ? "You are editing someone else's content as an admin. Enter a reason to continue." : `Manage this ${entityType}'s ${action === "details" ? "details in the portal" : "pictures"}.`}
              </Description>
              {needsReason ? (
                <form onSubmit={handleReasonSubmit} className="space-y-3">
                  <label htmlFor={reasonId} className="block font-medium">Reason for admin edit</label>
                  <input id={reasonId} className="input input-bordered w-full" value={reason} onChange={(event) => setReason(event.target.value)} required maxLength={2000} />
                  <p className="text-xs text-base-content/70">UI only: this reason is not logged or saved.</p>
                  <button type="submit" className="btn btn-primary btn-sm" disabled={!reason.trim()}>Continue</button>
                </form>
              ) : (
                <>
                  {confirmedReason ? <p role="status" className="rounded-box bg-base-200 p-3 text-sm break-words">Admin edit reason: {confirmedReason}. This reason has not been logged or saved.</p> : null}
                  {action === "details" ? (
                    <Link href={target.editHref} className="btn btn-primary btn-sm">Continue to editor</Link>
                  ) : action ? (
                    <GalleryManager
                      entityType={entityType}
                      entityId={id}
                      entityLabel={`${targetType} #${id}`}
                      currentUser={session.user}
                      folderKind={action}
                      title={actionLabel}
                      basePrefix={`${rootPrefix}${action}/`}
                      lockedRootPrefix={rootPrefix}
                      allowVideo={false}
                      singleImageMode={action !== "gallery" && entityType !== "vendor"}
                      onSaved={() => router.reload()}
                    />
                  ) : null}
                </>
              )}
            </DialogPanel>
          </div>
        </div>
      </Dialog>
    </aside>
  )
}
