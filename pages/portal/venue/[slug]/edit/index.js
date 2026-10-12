import Link from "next/link"
import { useEffect, useMemo, useState } from "react"
import { getServerSession } from "next-auth/next"

import { authOptions } from "@/pages/api/auth/[...nextauth]"
import OrganizationMediaStep from "@/components/forms/onboarding/organizations/OrganizationMediaStep"
import OrganizationPrimaryContactsStep from "@/components/forms/onboarding/organizations/OrganizationPrimaryContactsStep"
import OrganizationPublicContactsStep from "@/components/forms/onboarding/organizations/OrganizationPublicContactsStep"
import JoinPageShell from "@/components/join/common/join-page-shell"
import RegisterSlug from "@/components/forms/onboarding/register-slug"
import serverFetch from "@/libs/serverFetch"

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

function getPortalStep(rawStep) {
  const parsed = Number(rawStep || 1)
  if (parsed >= 1 && parsed <= 5) {
    return parsed
  }

  return 1
}

function buildVenuePortalHref(step, slug, id) {
  const normalizedSlug = String(slug || "").trim().toLowerCase()
  if (normalizedSlug) {
    const idSegment = id ? `&id=${encodeURIComponent(String(id))}` : ""
    return `/portal/venue/${encodeURIComponent(normalizedSlug)}/edit?step=${step}${idSegment}`
  }

  return "/portal/venue"
}

function mapVenue(venueData) {
  return {
    venueID: Number(venueData?.venueID || venueData?.VenueID || 0),
    name: String(venueData?.name || venueData?.Name || ""),
    addressID: Number(venueData?.addressID || venueData?.AddressID || 0),
    externalLinkID: Number(venueData?.externalLinkID || venueData?.ExternalLinkID || 0),
    phoneContactID: Number(venueData?.phoneContactID || venueData?.PhoneContactID || 0),
    isModerationBlocked: Boolean(venueData?.isModerationBlocked || venueData?.IsModerationBlocked),
  }
}

export default function PortalVenueEditPage({ currentStep, venueData, routeSlug, venueId, sessionUser }) {
  const [venueForm, setVenueForm] = useState(mapVenue(venueData || {}))
  const [formError, setFormError] = useState("")
  const [contactError, setContactError] = useState("")
  const [isSaving, setIsSaving] = useState(false)
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

  const hasMedia = profileFiles.length > 0 || coverFiles.length > 0 || logoFiles.length > 0 || galleryFiles.length > 0
  const stepCompletionMap = useMemo(() => ({
    1: Boolean(resolvedSlug),
    2: Boolean(venueForm.name),
    3: hasMedia,
    4: true,
    5: true,
  }), [hasMedia, resolvedSlug, venueForm.name])

  const progressPercent = useMemo(() => {
    const steps = [1, 2, 3, 4, 5]
    const completeCount = steps.filter((step) => Boolean(stepCompletionMap[step])).length
    return Math.round((completeCount / steps.length) * 100)
  }, [stepCompletionMap])

  const pageMetaData = {
    title: "Edit Venue",
    description: "Portal venue edit workflow using shared onboarding modules.",
    keywords: "portal, venue, edit",
    robots: "noindex, nofollow",
    og: {
      title: "Edit Venue",
      description: "Portal venue edit workflow using shared onboarding modules.",
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
    if ((currentStep !== 4 && currentStep !== 5) || !resolvedVenueId) {
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
    isModerationBlocked: Boolean(venueForm.isModerationBlocked),
  }

  return (
    <JoinPageShell
      title="Edit Venue"
      description="Use the same modular workflow as join to keep portal editing consistent."
      canonicalSlug="portal/venue/edit"
      metadata={pageMetaData}
      backHref={resolvedSlug ? `/portal/venue/${encodeURIComponent(resolvedSlug)}` : "/portal/venue"}
      backLabel="Back to Venue"
      steps={[
        {
          href: buildVenuePortalHref(1, resolvedSlug, resolvedVenueId),
          label: "Slug",
          isActive: currentStep === 1,
          isWarning: currentStep !== 1 && !stepCompletionMap[1],
        },
        {
          href: buildVenuePortalHref(2, resolvedSlug, resolvedVenueId),
          label: "Venue Profile",
          isActive: currentStep === 2,
          isWarning: currentStep !== 2 && !stepCompletionMap[2],
        },
        {
          href: buildVenuePortalHref(3, resolvedSlug, resolvedVenueId),
          label: "Media and Gallery",
          isActive: currentStep === 3,
          isWarning: currentStep !== 3 && !stepCompletionMap[3],
        },
        {
          href: buildVenuePortalHref(4, resolvedSlug, resolvedVenueId),
          label: "Primary Contacts",
          isActive: currentStep === 4,
          isWarning: currentStep !== 4 && !stepCompletionMap[4],
        },
        {
          href: buildVenuePortalHref(5, resolvedSlug, resolvedVenueId),
          label: "Public Contacts",
          isActive: currentStep === 5,
          isWarning: currentStep !== 5 && !stepCompletionMap[5],
        },
      ]}
      badge={resolvedVenueId ? `Venue ID: ${resolvedVenueId}` : null}
      progress={progressPercent}
    >
      {!resolvedVenueId ? (
        <div className="alert alert-warning">
          <span>Missing venue ID. Open this page from a specific venue profile.</span>
        </div>
      ) : null}

      {resolvedVenueId && currentStep === 1 ? (
        <div className="card bg-base-100 shadow border border-base-300">
          <div className="card-body gap-4">
            <div>
              <h2 className="card-title">Step 1: Update Venue Slug</h2>
              <p className="text-sm text-base-content/70">Update the venue slug using the same reservation component used in join.</p>
            </div>

            <RegisterSlug
              domain="venue"
              domainLabel="Venue"
              reserveEndpoint={`/api/venue/reserve-slug`}
              updateEndpoint={(id) => `/api/venue/${id}/update-slug`}
              checkEndpoint={(candidateSlug) => `/api/venue/check-slug/${encodeURIComponent(candidateSlug)}?excludeId=${encodeURIComponent(String(resolvedVenueId))}`}
              currentSlug={resolvedSlug}
              entityId={resolvedVenueId}
              progressApi={{
                getProgress: () => ({ slug: resolvedSlug, entityId: resolvedVenueId }),
                setProgress: () => {},
                markStepComplete: () => {},
              }}
              titleFieldLabel="Venue Display Name"
              titlePlaceholder="Enter venue name"
              slugDescription="Venue slug creates a dedicated venue profile URL."
            />

            <div className="flex gap-2 justify-end">
              <Link href={buildVenuePortalHref(2, resolvedSlug, resolvedVenueId)} className="btn btn-sm btn-primary">Continue to Venue Profile</Link>
            </div>
          </div>
        </div>
      ) : null}

      {resolvedVenueId && currentStep === 2 ? (
        <div className="card bg-base-100 shadow border border-base-300">
          <div className="card-body gap-4">
            <div>
              <h2 className="card-title">Step 2: Venue Profile</h2>
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
            </div>

            {formError ? (
              <div className="alert alert-error"><span>{formError}</span></div>
            ) : null}

            <div className="flex gap-2 justify-between flex-wrap">
              <Link href={buildVenuePortalHref(1, resolvedSlug, resolvedVenueId)} className="btn btn-sm btn-outline">Back to Slug</Link>
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
                      window.location.href = buildVenuePortalHref(3, resolvedSlug, resolvedVenueId)
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

      {resolvedVenueId && currentStep === 3 ? (
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
          backHref={buildVenuePortalHref(2, resolvedSlug, resolvedVenueId)}
          backLabel="Back to Venue Profile"
          continueHref={buildVenuePortalHref(4, resolvedSlug, resolvedVenueId)}
          continueLabel="Continue to Primary Contacts"
        />
      ) : null}

      {resolvedVenueId && currentStep === 4 ? (
        <OrganizationPrimaryContactsStep
          context="venue"
          entityId={resolvedVenueId}
          loadingContacts={loadingContacts}
          addressContacts={businessAddressContacts}
          emailContacts={businessEmailContacts}
          phoneContacts={businessPhoneContacts}
          refreshContacts={refreshVenueContacts}
          contactError={contactError}
          setContactError={setContactError}
          backHref={buildVenuePortalHref(3, resolvedSlug, resolvedVenueId)}
          backLabel="Back to Media"
          continueHref={buildVenuePortalHref(5, resolvedSlug, resolvedVenueId)}
        />
      ) : null}

      {resolvedVenueId && currentStep === 5 ? (
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
          backHref={buildVenuePortalHref(4, resolvedSlug, resolvedVenueId)}
          backLabel="Back to Primary Contacts"
          continueHref={resolvedSlug ? `/portal/venue/${encodeURIComponent(resolvedSlug)}` : "/portal/venue"}
          continueLabel="Done - Back to Venue"
        />
      ) : null}
    </JoinPageShell>
  )
}

export async function getServerSideProps(context) {
  const session = await getServerSession(context.req, context.res, authOptions)
  const sessionUser = await getSessionFromRequest(context)

  if (!session || !sessionUser) {
    return {
      redirect: { destination: "/api/auth/signin", permanent: false },
    }
  }

  const { slug } = context.params
  const normalizedSlug = String(slug || "").trim().toLowerCase()
  const currentStep = getPortalStep(context.query?.step)

  try {
    const venueData = await serverFetch(`/venue/by-slug/${encodeURIComponent(normalizedSlug)}`)
    const venueId = venueData?.id || venueData?.ID || venueData?.venueID || venueData?.VenueID || null

    if (!venueId) {
      return { notFound: true }
    }

    return {
      props: {
        currentStep,
        sessionUser: sessionUser?.user || null,
        venueId,
        venueData: venueData || {},
        routeSlug: normalizedSlug,
      },
    }
  } catch {
    return { notFound: true }
  }
}
