import Link from "next/link"
import { useEffect, useMemo, useState } from "react"

import OrganizationPrimaryContactsStep from "@/components/forms/onboarding/organizations/OrganizationPrimaryContactsStep"
import OrganizationPublicContactsStep from "@/components/forms/onboarding/organizations/OrganizationPublicContactsStep"
import OrganizationMediaStep from "@/components/forms/onboarding/organizations/OrganizationMediaStep"
import JoinPageShell from "@/components/join/common/join-page-shell"

function getRequestOrigin(req) {
  const forwardedProto = String(req?.headers?.["x-forwarded-proto"] || "").split(",")[0].trim()
  const forwardedHost = String(req?.headers?.["x-forwarded-host"] || "").trim()
  const host = forwardedHost || String(req?.headers?.host || "").trim()

  if (!host) {
    return null
  }

  const protocol = forwardedProto || (process.env.NODE_ENV === "development" ? "http" : "https")
  return `${protocol}://${host}`
}

async function getSessionFromRequest(context) {
  const origin = getRequestOrigin(context?.req)
  if (!origin) {
    return null
  }

  try {
    const response = await fetch(`${origin}/api/auth/session`, {
      headers: {
        cookie: context?.req?.headers?.cookie || "",
      },
    })

    if (!response.ok) {
      return null
    }

    return await response.json()
  } catch {
    return null
  }
}

function getWizardStep(rawStep) {
  const parsed = Number(rawStep || 3)
  if (parsed >= 3 && parsed <= 7) {
    return parsed
  }

  return 3
}

function buildVenueJoinHref(step, slug, id) {
  const normalizedSlug = String(slug || "").trim().toLowerCase()
  if (normalizedSlug) {
    const idSegment = id ? `&id=${encodeURIComponent(String(id))}` : ""
    return `/join/venue/${encodeURIComponent(normalizedSlug)}?step=${step}${idSegment}`
  }

  return "/join/venue?step=2"
}

function mapVenue(venueData) {
  return {
    venueID: Number(venueData?.venueID || venueData?.VenueID || 0),
    name: String(venueData?.name || venueData?.Name || ""),
    addressID: Number(venueData?.addressID || venueData?.AddressID || 0),
    externalLinkID: Number(venueData?.externalLinkID || venueData?.ExternalLinkID || 0),
    phoneContactID: Number(venueData?.phoneContactID || venueData?.PhoneContactID || 0),
    isPublished: Boolean(venueData?.isPublished || venueData?.IsPublished),
    isModerationBlocked: Boolean(venueData?.isModerationBlocked || venueData?.IsModerationBlocked),
  }
}

export default function JoinVenueSlugPage({ currentStep, venueData, routeSlug, venueId, sessionUser }) {
  const [venueForm, setVenueForm] = useState(mapVenue(venueData || {}))
  const [formError, setFormError] = useState("")
  const [contactError, setContactError] = useState("")
  const [publishError, setPublishError] = useState("")
  const [isSaving, setIsSaving] = useState(false)
  const [isPublishing, setIsPublishing] = useState(false)
  const [loadingContacts, setLoadingContacts] = useState(false)
  const [contactsTab, setContactsTab] = useState("public-address")

  const [businessAddressContacts, setBusinessAddressContacts] = useState([])
  const [businessEmailContacts, setBusinessEmailContacts] = useState([])
  const [businessPhoneContacts, setBusinessPhoneContacts] = useState([])
  const [businessUrlContacts, setBusinessUrlContacts] = useState([])
  const [publicAddressContacts, setPublicAddressContacts] = useState([])
  const [publicEmailContacts, setPublicEmailContacts] = useState([])
  const [publicPhoneContacts, setPublicPhoneContacts] = useState([])
  const [publicSocialContacts, setPublicSocialContacts] = useState([])
  const [publicUrlContacts, setPublicUrlContacts] = useState([])

  const [profileFiles, setProfileFiles] = useState([])
  const [coverFiles, setCoverFiles] = useState([])
  const [logoFiles, setLogoFiles] = useState([])
  const [galleryFiles, setGalleryFiles] = useState([])

  const resolvedVenueId = Number(venueId || venueForm.venueID || 0)
  const resolvedSlug = String(routeSlug || "").trim().toLowerCase()
  const venueRootPrefix = useMemo(() => (
    resolvedVenueId > 0 ? `platformpics/venuecontent/${resolvedVenueId}/` : ""
  ), [resolvedVenueId])
  const venueProfilePrefix = useMemo(() => (
    venueRootPrefix ? `${venueRootPrefix}profile/` : ""
  ), [venueRootPrefix])
  const venueCoverPrefix = useMemo(() => (
    venueRootPrefix ? `${venueRootPrefix}cover/` : ""
  ), [venueRootPrefix])
  const venueGalleryPrefix = useMemo(() => (
    venueRootPrefix ? `${venueRootPrefix}gallery/` : ""
  ), [venueRootPrefix])

  const totalBusinessContacts = businessAddressContacts.length + businessEmailContacts.length + businessPhoneContacts.length + businessUrlContacts.length
  const totalPublicContacts = publicAddressContacts.length + publicEmailContacts.length + publicPhoneContacts.length + publicSocialContacts.length + publicUrlContacts.length
  const hasRequiredContactTypes = businessAddressContacts.length > 0 && businessEmailContacts.length > 0 && businessPhoneContacts.length > 0
  const hasMedia = profileFiles.length > 0 || coverFiles.length > 0 || logoFiles.length > 0 || galleryFiles.length > 0

  const stepCompletionMap = useMemo(() => ({
    3: Boolean(venueForm.name),
    4: hasMedia,
    5: true,
    6: true,
    7: Boolean(venueForm.isPublished),
  }), [hasMedia, venueForm.isPublished, venueForm.name])

  const progressPercent = useMemo(() => {
    const steps = [3, 4, 5, 6, 7]
    const completeCount = steps.filter((step) => Boolean(stepCompletionMap[step])).length
    return Math.round((completeCount / steps.length) * 100)
  }, [stepCompletionMap])

  const pageMetaData = {
    title: "Join Venue",
    description: "Venue onboarding workflow with profile details, media, primary contacts, and publishing.",
    keywords: "join, venue, onboarding",
    robots: "noindex, nofollow",
    og: {
      title: "Join Venue",
      description: "Venue onboarding workflow with profile details, media, primary contacts, and publishing.",
    },
  }

  const refreshVenueContacts = async () => {
    if (!resolvedVenueId) {
      return
    }

    setLoadingContacts(true)
    try {
      const response = await fetch(`/api/contact/venue/${resolvedVenueId}?includePrivate=true`)
      if (!response.ok) {
        return
      }

      const data = await response.json()
      const rows = Array.isArray(data?.contacts) ? data.contacts : []
      const isPrivateRow = (contact) => contact?.isPrivate === true || String(contact?.isPrivate || "").trim().toLowerCase() === "true"
      const businessRows = rows.filter((contact) => isPrivateRow(contact))
      const publicRows = rows.filter((contact) => !isPrivateRow(contact))

      setBusinessAddressContacts(businessRows.filter((contact) => String(contact?.contactType || "").toLowerCase() === "address"))
      setBusinessEmailContacts(businessRows.filter((contact) => String(contact?.contactType || "").toLowerCase() === "email"))
      setBusinessPhoneContacts(businessRows.filter((contact) => String(contact?.contactType || "").toLowerCase() === "phone"))
      setBusinessUrlContacts(businessRows.filter((contact) => String(contact?.contactType || "").toLowerCase() === "url" && String(contact?.category || "").toLowerCase() === "website"))
      setPublicAddressContacts(publicRows.filter((contact) => String(contact?.contactType || "").toLowerCase() === "address"))
      setPublicEmailContacts(publicRows.filter((contact) => String(contact?.contactType || "").toLowerCase() === "email"))
      setPublicPhoneContacts(publicRows.filter((contact) => String(contact?.contactType || "").toLowerCase() === "phone"))
      setPublicUrlContacts(publicRows.filter((contact) => String(contact?.contactType || "").toLowerCase() === "url" && String(contact?.category || "").toLowerCase() === "website"))
      setPublicSocialContacts(publicRows.filter((contact) => String(contact?.contactType || "").toLowerCase() === "url" && String(contact?.category || "").toLowerCase() !== "website"))
    } catch {
      // no-op
    } finally {
      setLoadingContacts(false)
    }
  }

  useEffect(() => {
    if ((currentStep !== 5 && currentStep !== 6) || !resolvedVenueId) {
      return
    }

    refreshVenueContacts()
  }, [currentStep, resolvedVenueId])

  const persistVenue = async (payload, setError) => {
    const response = await fetch(`/api/venue/${resolvedVenueId}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    })

    if (!response.ok) {
      const message = await response.text()
      setError(message || `Unable to save venue (${response.status}).`)
      return false
    }

    return true
  }

  const basePayload = {
    venueID: resolvedVenueId,
    name: String(venueForm.name || "").trim(),
    addressID: venueForm.addressID,
    externalLinkID: venueForm.externalLinkID,
    phoneContactID: venueForm.phoneContactID,
    isPublished: Boolean(venueForm.isPublished),
    isModerationBlocked: Boolean(venueForm.isModerationBlocked),
  }

  return (
    <JoinPageShell
      title="Join as a Venue"
      description="Copying the artist workflow pattern: profile details, media, primary contacts, then review and publish."
      canonicalSlug="join/venue"
      metadata={pageMetaData}
      steps={[
        {
          href: buildVenueJoinHref(3, resolvedSlug, resolvedVenueId),
          label: "Venue Profile",
          isActive: currentStep === 3,
          isWarning: currentStep !== 3 && !stepCompletionMap[3],
        },
        {
          href: buildVenueJoinHref(4, resolvedSlug, resolvedVenueId),
          label: "Media and Gallery",
          isActive: currentStep === 4,
          isWarning: currentStep !== 4 && !stepCompletionMap[4],
        },
        {
          href: buildVenueJoinHref(5, resolvedSlug, resolvedVenueId),
          label: "Primary Contacts",
          isActive: currentStep === 5,
          isWarning: currentStep !== 5 && !stepCompletionMap[5],
        },
        {
          href: buildVenueJoinHref(6, resolvedSlug, resolvedVenueId),
          label: "Public Contacts",
          isActive: currentStep === 6,
          isWarning: currentStep !== 6 && !stepCompletionMap[6],
        },
        {
          href: buildVenueJoinHref(7, resolvedSlug, resolvedVenueId),
          label: "Review and Publish",
          isActive: currentStep === 7,
          isWarning: currentStep !== 7 && !stepCompletionMap[7],
        },
      ]}
      badge={resolvedVenueId ? `Venue ID: ${resolvedVenueId}` : null}
      progress={progressPercent}
    >
      {!resolvedVenueId ? (
        <div className="alert alert-warning">
          <span>Missing venue ID. Start at /join/venue and reserve a workspace first.</span>
        </div>
      ) : null}

      {resolvedVenueId && currentStep === 3 ? (
        <div className="card bg-base-100 shadow border border-base-300">
          <div className="card-body gap-4">
            <div>
              <h2 className="card-title">Step 3: Venue Profile</h2>
              <p className="text-sm text-base-content/70">Venue name and moderation status. FK-linked contact/media rows are managed separately.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <label className="form-control w-full md:col-span-2">
                <div className="label"><span className="label-text">Venue Name</span></div>
                <input
                  type="text"
                  className="input input-bordered w-full"
                  value={venueForm.name}
                  onChange={(event) => setVenueForm((prev) => ({ ...prev, name: event.target.value }))}
                />
              </label>

              <label className="form-control w-full">
                <div className="label"><span className="label-text">Moderation Blocked</span></div>
                <select
                  className="select select-bordered w-full"
                  value={venueForm.isModerationBlocked ? "true" : "false"}
                  onChange={(event) => setVenueForm((prev) => ({ ...prev, isModerationBlocked: event.target.value === "true" }))}
                >
                  <option value="false">No</option>
                  <option value="true">Yes</option>
                </select>
              </label>

              <label className="form-control w-full">
                <div className="label"><span className="label-text">Published</span></div>
                <select
                  className="select select-bordered w-full"
                  value={venueForm.isPublished ? "true" : "false"}
                  onChange={(event) => setVenueForm((prev) => ({ ...prev, isPublished: event.target.value === "true" }))}
                >
                  <option value="false">No</option>
                  <option value="true">Yes</option>
                </select>
              </label>
            </div>

            {formError ? (
              <div className="alert alert-error"><span>{formError}</span></div>
            ) : null}

            <div className="flex gap-2 justify-between flex-wrap">
              <Link href="/join/venue?step=2" className="btn btn-sm btn-outline">Back to Reservation</Link>
              <button
                type="button"
                className="btn btn-sm btn-primary"
                disabled={isSaving}
                onClick={async () => {
                  if (!venueForm.name.trim()) {
                    setFormError("Venue name is required.")
                    return
                  }

                  setFormError("")
                  setIsSaving(true)

                  try {
                    const saved = await persistVenue(basePayload, setFormError)
                    if (saved) {
                      window.location.href = buildVenueJoinHref(4, resolvedSlug, resolvedVenueId)
                    }
                  } finally {
                    setIsSaving(false)
                  }
                }}
              >
                {isSaving ? "Saving..." : "Continue to Media and Gallery"}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {resolvedVenueId && currentStep === 4 ? (
        <OrganizationMediaStep
          context="venue"
          entityId={resolvedVenueId}
          entitySlug={resolvedSlug}
          sessionUser={sessionUser}
          profilePrefix={venueProfilePrefix}
          coverPrefix={venueCoverPrefix}
          galleryPrefix={venueGalleryPrefix}
          setProfileFiles={setProfileFiles}
          setCoverFiles={setCoverFiles}
          setLogoFiles={setLogoFiles}
          setGalleryFiles={setGalleryFiles}
          backHref={buildVenueJoinHref(3, resolvedSlug, resolvedVenueId)}
          backLabel="Back to Venue Profile"
          continueHref={buildVenueJoinHref(5, resolvedSlug, resolvedVenueId)}
          continueLabel="Continue to Primary Contacts"
        />
      ) : null}

      {resolvedVenueId && currentStep === 5 ? (
        <OrganizationPrimaryContactsStep
          context="venue"
          entityId={resolvedVenueId}
          loadingContacts={loadingContacts}
          addressContacts={businessAddressContacts}
          emailContacts={businessEmailContacts}
          phoneContacts={businessPhoneContacts}
          urlContacts={businessUrlContacts}
          refreshContacts={refreshVenueContacts}
          hasRequiredContactTypes={hasRequiredContactTypes}
          contactError={contactError}
          setContactError={setContactError}
          backHref={buildVenueJoinHref(4, resolvedSlug, resolvedVenueId)}
          backLabel="Back to Media"
          continueHref={buildVenueJoinHref(6, resolvedSlug, resolvedVenueId)}
        />
      ) : null}

      {resolvedVenueId && currentStep === 6 ? (
        <OrganizationPublicContactsStep
          context="venue"
          entityId={resolvedVenueId}
          loadingContacts={loadingContacts}
          contactsTab={contactsTab}
          setContactsTab={setContactsTab}
          publicAddressContacts={publicAddressContacts}
          publicEmailContacts={publicEmailContacts}
          publicPhoneContacts={publicPhoneContacts}
          publicSocialContacts={publicSocialContacts}
          publicUrlContacts={publicUrlContacts}
          refreshContacts={refreshVenueContacts}
          backHref={buildVenueJoinHref(5, resolvedSlug, resolvedVenueId)}
          continueHref={buildVenueJoinHref(7, resolvedSlug, resolvedVenueId)}
        />
      ) : null}

      {resolvedVenueId && currentStep === 7 ? (
        <div className="card bg-base-100 shadow border border-base-300">
          <div className="card-body gap-4">
            <div>
              <h2 className="card-title">Step 7: Review and Publish</h2>
              <p className="text-sm text-base-content/70">Final check before publish.</p>
            </div>

            <div className="rounded-box border border-base-300 bg-base-200/40 p-4 space-y-2 text-sm">
              <div><span className="font-semibold">Venue name:</span> {venueForm.name || "Missing"}</div>
              <div><span className="font-semibold">Business contacts saved:</span> {totalBusinessContacts}</div>
              <div><span className="font-semibold">Public contacts saved:</span> {totalPublicContacts}</div>
              <div><span className="font-semibold">Profile files:</span> {profileFiles.length}</div>
              <div><span className="font-semibold">Cover files:</span> {coverFiles.length}</div>
              <div><span className="font-semibold">Gallery files:</span> {galleryFiles.length}</div>
              <div><span className="font-semibold">Published:</span> {venueForm.isPublished ? "Yes" : "No"}</div>
            </div>

            <div className="rounded-box border border-base-300 bg-base-200/40 p-4">
              <h3 className="font-semibold mb-2">Step Completion</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm">
                {[3, 4, 5, 6].map((step) => {
                  const labels = {
                    3: "Venue Profile",
                    4: "Media and Gallery",
                    5: "Primary Contacts",
                    6: "Public Contacts",
                  }
                  const done = Boolean(stepCompletionMap[step])
                  return (
                    <div key={step} className="flex items-center justify-between rounded border border-base-300 px-2 py-1">
                      <span>{labels[step]}</span>
                      <span className={`badge badge-xs ${done ? "badge-success" : "badge-neutral"}`}>{done ? "Done" : "Pending"}</span>
                    </div>
                  )
                })}
              </div>
            </div>

            {publishError ? (
              <div className="alert alert-error"><span>{publishError}</span></div>
            ) : null}

            <div className="flex gap-2 justify-between flex-wrap">
              <Link href={buildVenueJoinHref(6, resolvedSlug, resolvedVenueId)} className="btn btn-sm btn-outline">Back to Public Contacts</Link>
              <button
                type="button"
                className="btn btn-sm btn-success"
                disabled={isPublishing || venueForm.isPublished}
                onClick={async () => {
                  setPublishError("")
                  setIsPublishing(true)

                  try {
                    const saved = await persistVenue({
                      ...basePayload,
                      isPublished: true,
                    }, setPublishError)

                    if (saved) {
                      setVenueForm((prev) => ({ ...prev, isPublished: true }))
                      const portalUrl = resolvedSlug ? `/portal/venue/${encodeURIComponent(resolvedSlug)}` : "/portal"
                      window.location.href = portalUrl
                    }
                  } finally {
                    setIsPublishing(false)
                  }
                }}
              >
                {isPublishing ? "Publishing..." : venueForm.isPublished ? "Published" : "Publish Venue"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </JoinPageShell>
  )
}

export async function getVenueJoinServerProps(context, routeSlug = null) {
  const session = await getSessionFromRequest(context)

  if (!session?.user?.id) {
    return {
      redirect: {
        destination: `/api/auth/signin?callbackUrl=${encodeURIComponent(context.resolvedUrl || "/join/venue")}`,
        permanent: false,
      },
    }
  }

  const currentStep = getWizardStep(context.query?.step)
  const normalizedRouteSlug = String(routeSlug || "").trim().toLowerCase()

  let venueData = null
  let venueId = Number(context.query?.id || 0)

  if (normalizedRouteSlug) {
    try {
      const response = await fetch(`/api/venue/by-slug/${encodeURIComponent(normalizedRouteSlug)}`)
      if (response.ok) {
        venueData = await response.json()
        venueId = Number(venueData?.venueID || venueData?.VenueID || 0)
      }
    } catch {
      // no-op
    }
  }

  if (!venueData && venueId > 0) {
    try {
      const response = await fetch(`/api/venue/byID/${venueId}`)
      if (response.ok) {
        venueData = await response.json()
      }
    } catch {
      // no-op
    }
  }

  return {
    props: {
      sessionUser: session?.user || null,
      currentStep,
      venueData,
      venueId: venueId > 0 ? venueId : null,
      routeSlug: normalizedRouteSlug,
    },
  }
}

export async function getServerSideProps(context) {
  const routeSlug = String(context?.params?.slug || "").trim().toLowerCase()
  return getVenueJoinServerProps(context, routeSlug)
}
