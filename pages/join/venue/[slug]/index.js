import Link from "next/link"
import { useEffect, useMemo, useState } from "react"

import OrganizationPrimaryContactsStep from "@/components/forms/onboarding/organizations/OrganizationPrimaryContactsStep"
import OrganizationPublicContactsStep from "@/components/forms/onboarding/organizations/OrganizationPublicContactsStep"
import OrganizationMediaStep from "@/components/forms/onboarding/organizations/OrganizationMediaStep"
import VenueDiscoverabilityStep from "@/components/forms/onboarding/venues/VenueDiscoverabilityStep"
import VenueProfileStep from "@/components/forms/onboarding/venues/VenueProfileStep"
import JoinPageShell from "@/components/join/common/join-page-shell"
import { fetchVenueAccess, fetchVenueForPage, getEditRedirect } from "@/utils/venue-form"
import { formatAddress, getPublishProblems, mapVenueToProfile, publishVenue, summarizeDescription } from "@/utils/venue-profile"
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

// Steps 1 and 2 (terms and slug reservation) are on /join/venue; this page covers 3 to 8.
const STEP_PROFILE = 3
const STEP_DISCOVERABILITY = 4
const STEP_MEDIA = 5
const STEP_PRIMARY_CONTACTS = 6
const STEP_PUBLIC_CONTACTS = 7
const STEP_REVIEW = 8

function getWizardStep(rawStep) {
  const parsed = Number(rawStep || STEP_PROFILE)
  if (parsed >= STEP_PROFILE && parsed <= STEP_REVIEW) {
    return parsed
  }

  return STEP_PROFILE
}

function buildVenueJoinHref(step, slug, id) {
  const normalizedSlug = String(slug || "").trim().toLowerCase()
  if (normalizedSlug) {
    const idSegment = id ? `&id=${encodeURIComponent(String(id))}` : ""
    return `/join/venue/${encodeURIComponent(normalizedSlug)}?step=${step}${idSegment}`
  }

  return "/join/venue?step=2"
}

export default function JoinVenueSlugPage({ currentStep, venueData, routeSlug, venueId, sessionUser }) {
  const [venueForm, setVenueForm] = useState(() => mapVenueToProfile(venueData))
  const [contactError, setContactError] = useState("")
  const [publishError, setPublishError] = useState("")
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
    resolvedVenueId > 0 ? `platformpics/venue/${resolvedVenueId}/` : ""
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
  const publishProblems = useMemo(() => getPublishProblems(venueForm), [venueForm])

  const stepCompletionMap = useMemo(() => ({
    [STEP_PROFILE]: publishProblems.length === 0,
    [STEP_DISCOVERABILITY]: venueForm.categoryIds.length > 0,
    [STEP_MEDIA]: hasMedia,
    [STEP_PRIMARY_CONTACTS]: true,
    [STEP_PUBLIC_CONTACTS]: true,
    [STEP_REVIEW]: Boolean(venueForm.isPublished),
  }), [hasMedia, publishProblems.length, venueForm.categoryIds.length, venueForm.isPublished])

  const progressPercent = useMemo(() => {
    const steps = [STEP_PROFILE, STEP_DISCOVERABILITY, STEP_MEDIA, STEP_PRIMARY_CONTACTS, STEP_PUBLIC_CONTACTS, STEP_REVIEW]
    const completeCount = steps.filter((step) => Boolean(stepCompletionMap[step])).length
    return Math.round((completeCount / steps.length) * 100)
  }, [stepCompletionMap])

  const pageMetaData = {
    title: "Join Venue",
    description: "Venue onboarding workflow with profile details, categories, amenities, regions, media, primary contacts, and publishing.",
    keywords: "join, venue, onboarding",
    robots: "noindex, nofollow",
    og: {
      title: "Join Venue",
      description: "Venue onboarding workflow with profile details, categories, amenities, regions, media, primary contacts, and publishing.",
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
    if ((currentStep !== STEP_PRIMARY_CONTACTS && currentStep !== STEP_PUBLIC_CONTACTS && currentStep !== STEP_REVIEW) || !resolvedVenueId) {
      return
    }

    refreshVenueContacts()
  }, [currentStep, resolvedVenueId])

  const stepHref = (step) => buildVenueJoinHref(step, resolvedSlug, resolvedVenueId)
  const goToStep = (step) => { window.location.href = stepHref(step) }

  return (
    <JoinPageShell
      title="Join as a Venue"
      description="Profile details, categories, amenities and regions, media, contacts, then review and publish."
      canonicalSlug="join/venue"
      metadata={pageMetaData}
      steps={[
        {
          href: stepHref(STEP_PROFILE),
          label: "Venue Profile",
          isActive: currentStep === STEP_PROFILE,
          isWarning: currentStep !== STEP_PROFILE && !stepCompletionMap[STEP_PROFILE],
        },
        {
          href: stepHref(STEP_DISCOVERABILITY),
          label: "Categories and Regions",
          isActive: currentStep === STEP_DISCOVERABILITY,
          isWarning: currentStep !== STEP_DISCOVERABILITY && !stepCompletionMap[STEP_DISCOVERABILITY],
        },
        {
          href: stepHref(STEP_MEDIA),
          label: "Media and Gallery",
          isActive: currentStep === STEP_MEDIA,
          isWarning: currentStep !== STEP_MEDIA && !stepCompletionMap[STEP_MEDIA],
        },
        {
          href: stepHref(STEP_PRIMARY_CONTACTS),
          label: "Primary Contacts",
          isActive: currentStep === STEP_PRIMARY_CONTACTS,
          isWarning: currentStep !== STEP_PRIMARY_CONTACTS && !stepCompletionMap[STEP_PRIMARY_CONTACTS],
        },
        {
          href: stepHref(STEP_PUBLIC_CONTACTS),
          label: "Public Contacts",
          isActive: currentStep === STEP_PUBLIC_CONTACTS,
          isWarning: currentStep !== STEP_PUBLIC_CONTACTS && !stepCompletionMap[STEP_PUBLIC_CONTACTS],
        },
        {
          href: stepHref(STEP_REVIEW),
          label: "Review and Publish",
          isActive: currentStep === STEP_REVIEW,
          isWarning: currentStep !== STEP_REVIEW && !stepCompletionMap[STEP_REVIEW],
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

      {resolvedVenueId && currentStep === STEP_PROFILE ? (
        <VenueProfileStep
          initialForm={venueForm}
          title="Step 3: Venue Profile"
          intro="Tell people about your space: its name, a description, and where it is. The address is what puts your venue in search results."
          backHref="/join/venue?step=2"
          backLabel="Back to Reservation"
          continueLabel="Save and continue to Categories"
          onContinue={() => goToStep(STEP_DISCOVERABILITY)}
        />
      ) : null}

      {resolvedVenueId && currentStep === STEP_DISCOVERABILITY ? (
        <VenueDiscoverabilityStep
          initialForm={venueForm}
          venueId={resolvedVenueId}
          title="Step 4: Categories, Amenities and Regions"
          intro="Help artists and organizers find your venue: what kind of space it is, what it offers, and which regions it serves."
          backHref={stepHref(STEP_PROFILE)}
          backLabel="Back to Venue Profile"
          continueLabel="Save and continue to Media"
          onContinue={() => goToStep(STEP_MEDIA)}
        />
      ) : null}

      {resolvedVenueId && currentStep === STEP_MEDIA ? (
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
          backHref={stepHref(STEP_DISCOVERABILITY)}
          backLabel="Back to Categories and Regions"
          continueHref={stepHref(STEP_PRIMARY_CONTACTS)}
          continueLabel="Continue to Primary Contacts"
        />
      ) : null}

      {resolvedVenueId && currentStep === STEP_PRIMARY_CONTACTS ? (
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
          backHref={stepHref(STEP_MEDIA)}
          backLabel="Back to Media"
          continueHref={stepHref(STEP_PUBLIC_CONTACTS)}
        />
      ) : null}

      {resolvedVenueId && currentStep === STEP_PUBLIC_CONTACTS ? (
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
          backHref={stepHref(STEP_PRIMARY_CONTACTS)}
          continueHref={stepHref(STEP_REVIEW)}
        />
      ) : null}

      {resolvedVenueId && currentStep === STEP_REVIEW ? (
        <div className="card bg-base-100 shadow border border-base-300">
          <div className="card-body gap-4">
            <div>
              <h2 className="card-title">Step 8: Review and Publish</h2>
              <p className="text-sm text-base-content/70">Final check before publish. Your venue is listed as soon as you publish; there is no approval step.</p>
            </div>

            {publishProblems.length > 0 ? (
              <div role="alert" className="alert alert-warning items-start">
                <div>
                  <p className="font-semibold">Finish the venue profile before publishing:</p>
                  <ul className="list-disc ml-5 text-sm">
                    {publishProblems.map((problem) => <li key={problem.field}>{problem.message}</li>)}
                  </ul>
                  <Link href={stepHref(STEP_PROFILE)} className="link text-sm">Go to Venue Profile</Link>
                </div>
              </div>
            ) : null}

            <dl className="rounded-box border border-base-300 bg-base-200/40 p-4 space-y-2 text-sm">
              <div><dt className="inline font-semibold">Venue name: </dt><dd className="inline">{venueForm.name || "Missing"}</dd></div>
              <div><dt className="inline font-semibold">Address: </dt><dd className="inline">{formatAddress(venueForm) || "Missing"}</dd></div>
              <div><dt className="inline font-semibold">Description: </dt><dd className="inline">{summarizeDescription(venueForm.description) || "None"}</dd></div>
              <div><dt className="inline font-semibold">Events page: </dt><dd className="inline break-all">{venueForm.eventSourceUrl || "None"}</dd></div>
              <div><dt className="inline font-semibold">Categories: </dt><dd className="inline">{venueForm.extraCategories.map((category) => category.name ?? category.Name).join(", ") || "None"}</dd></div>
              <div><dt className="inline font-semibold">Amenities: </dt><dd className="inline">{venueForm.tags.join(", ") || "None"}</dd></div>
              <div><dt className="inline font-semibold">Regions: </dt><dd className="inline">{venueForm.extraRegions.map((region) => region.name ?? region.Name).join(", ") || "None"}</dd></div>
              <div><dt className="inline font-semibold">Business contacts saved: </dt><dd className="inline">{totalBusinessContacts}</dd></div>
              <div><dt className="inline font-semibold">Public contacts saved: </dt><dd className="inline">{totalPublicContacts}</dd></div>
              <div><dt className="inline font-semibold">Published: </dt><dd className="inline">{venueForm.isPublished ? "Yes" : "No"}</dd></div>
            </dl>

            <div className="rounded-box border border-base-300 bg-base-200/40 p-4">
              <h3 className="font-semibold mb-2">Step Completion</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm">
                {[STEP_PROFILE, STEP_DISCOVERABILITY, STEP_MEDIA, STEP_PRIMARY_CONTACTS, STEP_PUBLIC_CONTACTS].map((step) => {
                  const labels = {
                    [STEP_PROFILE]: "Venue Profile",
                    [STEP_DISCOVERABILITY]: "Categories and Regions",
                    [STEP_MEDIA]: "Media and Gallery",
                    [STEP_PRIMARY_CONTACTS]: "Primary Contacts",
                    [STEP_PUBLIC_CONTACTS]: "Public Contacts",
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
              <div role="alert" className="alert alert-error"><span>{publishError}</span></div>
            ) : null}

            <div className="flex gap-2 justify-between flex-wrap">
              <Link href={stepHref(STEP_PUBLIC_CONTACTS)} className="btn btn-sm btn-outline">Back to Public Contacts</Link>
              <button
                type="button"
                className="btn btn-sm btn-success"
                disabled={isPublishing || venueForm.isPublished || publishProblems.length > 0}
                onClick={async () => {
                  setPublishError("")
                  setIsPublishing(true)

                  try {
                    const result = await publishVenue({ form: venueForm })
                    if (!result.ok) {
                      setPublishError(result.message)
                      return
                    }

                    setVenueForm((prev) => ({ ...prev, isPublished: true }))
                    const portalUrl = resolvedSlug ? `/portal/venue/${encodeURIComponent(resolvedSlug)}` : "/portal"
                    window.location.href = portalUrl
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

  venueData = await fetchVenueForPage({
    req: context.req,
    id: context.query?.id,
    slug: normalizedRouteSlug,
    fetchApi: serverFetch,
  })
  if (venueData) {
    venueId = Number(venueData?.venueID || venueData?.VenueID || venueId || 0)
  }

  // Only the venue's owners and staff may build or edit it. When the API can't confirm that, the visitor is sent away.
  if (venueId > 0) {
    const access = await fetchVenueAccess({ req: context.req, id: venueId, fetchApi: serverFetch })
    const destination = getEditRedirect(access)
    if (destination) {
      return { redirect: { destination, permanent: false } }
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
