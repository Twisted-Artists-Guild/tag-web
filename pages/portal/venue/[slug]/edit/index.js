import Link from "next/link"
import { useEffect, useMemo, useState } from "react"
import { getServerSession } from "next-auth/next"

import { authOptions } from "@/pages/api/auth/[...nextauth]"
import OrganizationMediaStep from "@/components/forms/onboarding/organizations/OrganizationMediaStep"
import OrganizationPrimaryContactsStep from "@/components/forms/onboarding/organizations/OrganizationPrimaryContactsStep"
import OrganizationPublicContactsStep from "@/components/forms/onboarding/organizations/OrganizationPublicContactsStep"
import VenueDiscoverabilityStep from "@/components/forms/onboarding/venues/VenueDiscoverabilityStep"
import VenueProfileStep from "@/components/forms/onboarding/venues/VenueProfileStep"
import JoinPageShell from "@/components/join/common/join-page-shell"
import RegisterSlug from "@/components/forms/onboarding/register-slug"
import serverFetch from "@/libs/serverFetch"
import { fetchVenueAccess, fetchVenueForPage, getEditRedirect } from "@/utils/venue-form"
import { getPublishProblems, mapVenueToProfile } from "@/utils/venue-profile"

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

const STEP_SLUG = 1
const STEP_PROFILE = 2
const STEP_DISCOVERABILITY = 3
const STEP_MEDIA = 4
const STEP_PRIMARY_CONTACTS = 5
const STEP_PUBLIC_CONTACTS = 6

function getPortalStep(rawStep) {
  const parsed = Number(rawStep || STEP_SLUG)
  if (parsed >= STEP_SLUG && parsed <= STEP_PUBLIC_CONTACTS) {
    return parsed
  }

  return STEP_SLUG
}

function buildVenuePortalHref(step, slug, id) {
  const normalizedSlug = String(slug || "").trim().toLowerCase()
  if (normalizedSlug) {
    const idSegment = id ? `&id=${encodeURIComponent(String(id))}` : ""
    return `/portal/venue/${encodeURIComponent(normalizedSlug)}/edit?step=${step}${idSegment}`
  }

  return "/portal/venue"
}

export default function PortalVenueEditPage({ currentStep, venueData, routeSlug, venueId, sessionUser }) {
  const [venueForm] = useState(() => mapVenueToProfile(venueData))
  const [contactError, setContactError] = useState("")
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

  const hasMedia = profileFiles.length > 0 || coverFiles.length > 0 || logoFiles.length > 0 || galleryFiles.length > 0
  const publishProblems = useMemo(() => getPublishProblems(venueForm), [venueForm])
  const stepCompletionMap = useMemo(() => ({
    [STEP_SLUG]: Boolean(resolvedSlug),
    [STEP_PROFILE]: publishProblems.length === 0,
    [STEP_DISCOVERABILITY]: venueForm.categoryIds.length > 0,
    [STEP_MEDIA]: hasMedia,
    [STEP_PRIMARY_CONTACTS]: true,
    [STEP_PUBLIC_CONTACTS]: true,
  }), [hasMedia, publishProblems.length, resolvedSlug, venueForm.categoryIds.length])

  const progressPercent = useMemo(() => {
    const steps = [STEP_SLUG, STEP_PROFILE, STEP_DISCOVERABILITY, STEP_MEDIA, STEP_PRIMARY_CONTACTS, STEP_PUBLIC_CONTACTS]
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
    if ((currentStep !== STEP_PRIMARY_CONTACTS && currentStep !== STEP_PUBLIC_CONTACTS) || !resolvedVenueId) {
      return
    }

    refreshVenueContacts()
  }, [currentStep, resolvedVenueId])

  const stepHref = (step) => buildVenuePortalHref(step, resolvedSlug, resolvedVenueId)
  const goToStep = (step) => { window.location.href = stepHref(step) }

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
          href: stepHref(STEP_SLUG),
          label: "Slug",
          isActive: currentStep === STEP_SLUG,
          isWarning: currentStep !== STEP_SLUG && !stepCompletionMap[STEP_SLUG],
        },
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

      {resolvedVenueId && currentStep === STEP_PROFILE ? (
        <VenueProfileStep
          initialForm={venueForm}
          title="Step 2: Venue Profile"
          intro="Update your venue's name, description, address and events page. Changes show on your public venue page once saved."
          backHref={stepHref(STEP_SLUG)}
          backLabel="Back to Slug"
          continueLabel="Save and continue to Categories"
          onContinue={() => goToStep(STEP_DISCOVERABILITY)}
          showSaveOnly
        />
      ) : null}

      {resolvedVenueId && currentStep === STEP_DISCOVERABILITY ? (
        <VenueDiscoverabilityStep
          initialForm={venueForm}
          venueId={resolvedVenueId}
          title="Step 3: Categories, Amenities and Regions"
          intro="Choose how your venue is found: its categories, the amenities it offers, and the regions it serves."
          backHref={stepHref(STEP_PROFILE)}
          backLabel="Back to Venue Profile"
          continueLabel="Save and continue to Media"
          onContinue={() => goToStep(STEP_MEDIA)}
          showSaveOnly
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
          refreshContacts={refreshVenueContacts}
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
    const venueData = await fetchVenueForPage({
      req: context.req,
      id: context.query?.id,
      slug: normalizedSlug,
      fetchApi: serverFetch,
    })
    const venueId = venueData?.id || venueData?.ID || venueData?.venueID || venueData?.VenueID || null

    if (!venueId) {
      return { notFound: true }
    }

    // Only the venue's owners and staff may edit it. When the API can't confirm that, the visitor is sent away.
    const access = await fetchVenueAccess({ req: context.req, id: venueId, fetchApi: serverFetch })
    const destination = getEditRedirect(access)
    if (destination) {
      return { redirect: { destination, permanent: false } }
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
