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

function buildVendorPortalHref(step, slug, id) {
  const normalizedSlug = String(slug || "").trim().toLowerCase()
  if (normalizedSlug) {
    const idSegment = id ? `&id=${encodeURIComponent(String(id))}` : ""
    return `/portal/vendor/${encodeURIComponent(normalizedSlug)}/edit?step=${step}${idSegment}`
  }

  return "/portal/vendor"
}

function toInputDate(value) {
  const raw = String(value || "").trim()
  if (!raw) {
    return ""
  }

  if (raw.includes("T")) {
    return raw.slice(0, 10)
  }

  return raw
}

function toApiDate(value, fallback = null) {
  const raw = String(value || "").trim()
  if (!raw) {
    return fallback
  }

  return `${raw}T00:00:00.000Z`
}

function optionalText(value) {
  const trimmed = String(value || "").trim()
  return trimmed || ""
}

function mapVendor(vendorData) {
  return {
    vendorID: Number(vendorData?.vendorID || vendorData?.VendorID || 0),
    companyName: String(vendorData?.companyName || vendorData?.CompanyName || ""),
    contractExpires: toInputDate(vendorData?.contractExpires || vendorData?.ContractExpires),
    linkToContract: String(vendorData?.linkToContract || vendorData?.LinkToContract || ""),
    linkToMSA: String(vendorData?.linkToMSA || vendorData?.LinkToMSA || ""),
    msa_Executed: toInputDate(vendorData?.msa_Executed || vendorData?.MSA_Executed),
    notesOnContracts: String(vendorData?.notesOnContracts || vendorData?.NotesOnContracts || ""),
    notesOnVendors: String(vendorData?.notesOnVendors || vendorData?.NotesOnVendors || ""),
    pocEmail: String(vendorData?.pocEmail || vendorData?.POCEmail || ""),
    pocName: String(vendorData?.pocName || vendorData?.POCName || ""),
    pocPhone: String(vendorData?.pocPhone || vendorData?.POCPhone || ""),
  }
}

export default function PortalVendorEditPage({ currentStep, vendorData, routeSlug, vendorId, sessionUser }) {
  const [vendorForm, setVendorForm] = useState(mapVendor(vendorData || {}))
  const [step2Error, setStep2Error] = useState("")
  const [contactError, setContactError] = useState("")
  const [isSavingStep2, setIsSavingStep2] = useState(false)
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

  const resolvedVendorId = Number(vendorId || vendorForm.vendorID || 0)
  const resolvedSlug = String(routeSlug || "").trim().toLowerCase()
  const vendorRootPrefix = useMemo(() => (
    resolvedVendorId > 0 ? `platformpics/vendorcontent/${resolvedVendorId}/` : ""
  ), [resolvedVendorId])
  const vendorProfilePrefix = useMemo(() => (
    vendorRootPrefix ? `${vendorRootPrefix}profile/` : ""
  ), [vendorRootPrefix])
  const vendorCoverPrefix = useMemo(() => (
    vendorRootPrefix ? `${vendorRootPrefix}cover/` : ""
  ), [vendorRootPrefix])
  const vendorGalleryPrefix = useMemo(() => (
    vendorRootPrefix ? `${vendorRootPrefix}gallery/` : ""
  ), [vendorRootPrefix])

  const hasMedia = profileFiles.length > 0 || coverFiles.length > 0 || logoFiles.length > 0 || galleryFiles.length > 0
  const stepCompletionMap = useMemo(() => ({
    1: Boolean(resolvedSlug),
    2: Boolean(vendorForm.companyName && vendorForm.contractExpires),
    3: hasMedia,
    4: true,
    5: true,
  }), [hasMedia, resolvedSlug, vendorForm.companyName, vendorForm.contractExpires])

  const progressPercent = useMemo(() => {
    const steps = [1, 2, 3, 4, 5]
    const completeCount = steps.filter((step) => Boolean(stepCompletionMap[step])).length
    return Math.round((completeCount / steps.length) * 100)
  }, [stepCompletionMap])

  const pageMetaData = {
    title: "Edit Vendor",
    description: "Portal vendor edit workflow using shared onboarding modules.",
    keywords: "portal, vendor, edit",
    robots: "noindex, nofollow",
    og: {
      title: "Edit Vendor",
      description: "Portal vendor edit workflow using shared onboarding modules.",
    },
  }

  const refreshVendorContacts = async () => {
    if (!resolvedVendorId) {
      return
    }

    setLoadingContacts(true)
    try {
      const response = await fetch(`/api/contact/vendor/${resolvedVendorId}?includePrivate=true`)
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
    if ((currentStep !== 4 && currentStep !== 5) || !resolvedVendorId) {
      return
    }

    refreshVendorContacts()
  }, [currentStep, resolvedVendorId])

  const persistVendor = async (payload, setError) => {
    const response = await fetch(`/api/vendor/${resolvedVendorId}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    })

    if (!response.ok) {
      const message = await response.text()
      setError(message || `Unable to save vendor (${response.status}).`)
      return false
    }

    return true
  }

  const basePayload = {
    vendorID: resolvedVendorId,
    companyName: optionalText(vendorForm.companyName),
    contractExpires: toApiDate(vendorForm.contractExpires, new Date().toISOString()),
    linkToContract: optionalText(vendorForm.linkToContract),
    linkToMSA: optionalText(vendorForm.linkToMSA),
    msa_Executed: toApiDate(vendorForm.msa_Executed, new Date().toISOString()),
    notesOnContracts: optionalText(vendorForm.notesOnContracts),
    notesOnVendors: optionalText(vendorForm.notesOnVendors),
    pocEmail: optionalText(vendorForm.pocEmail),
    pocName: optionalText(vendorForm.pocName),
    pocPhone: optionalText(vendorForm.pocPhone),
  }

  return (
    <JoinPageShell
      title="Edit Vendor"
      description="Use the same modular workflow as join to keep portal editing consistent."
      canonicalSlug="portal/vendor/edit"
      metadata={pageMetaData}
      backHref={resolvedSlug ? `/portal/vendor/${encodeURIComponent(resolvedSlug)}` : "/portal/vendor"}
      backLabel="Back to Vendor"
      steps={[
        {
          href: buildVendorPortalHref(1, resolvedSlug, resolvedVendorId),
          label: "Slug",
          isActive: currentStep === 1,
          isWarning: currentStep !== 1 && !stepCompletionMap[1],
        },
        {
          href: buildVendorPortalHref(2, resolvedSlug, resolvedVendorId),
          label: "Business Details",
          isActive: currentStep === 2,
          isWarning: currentStep !== 2 && !stepCompletionMap[2],
        },
        {
          href: buildVendorPortalHref(3, resolvedSlug, resolvedVendorId),
          label: "Media and Gallery",
          isActive: currentStep === 3,
          isWarning: currentStep !== 3 && !stepCompletionMap[3],
        },
        {
          href: buildVendorPortalHref(4, resolvedSlug, resolvedVendorId),
          label: "Primary Contacts",
          isActive: currentStep === 4,
          isWarning: currentStep !== 4 && !stepCompletionMap[4],
        },
        {
          href: buildVendorPortalHref(5, resolvedSlug, resolvedVendorId),
          label: "Public Contacts",
          isActive: currentStep === 5,
          isWarning: currentStep !== 5 && !stepCompletionMap[5],
        },
      ]}
      badge={resolvedVendorId ? `Vendor ID: ${resolvedVendorId}` : null}
      progress={progressPercent}
    >
      {!resolvedVendorId ? (
        <div className="alert alert-warning">
          <span>Missing vendor ID. Open this page from a specific vendor profile.</span>
        </div>
      ) : null}

      {resolvedVendorId && currentStep === 1 ? (
        <div className="card bg-base-100 shadow border border-base-300">
          <div className="card-body gap-4">
            <div>
              <h2 className="card-title">Step 1: Update Vendor Slug</h2>
              <p className="text-sm text-base-content/70">Update the vendor slug using the same reservation component used in join.</p>
            </div>

            <RegisterSlug
              domain="vendor"
              domainLabel="Vendor"
              reserveEndpoint={`/api/vendor/reserve-slug`}
              updateEndpoint={(id) => `/api/vendor/${id}/update-slug`}
              checkEndpoint={(candidateSlug) => `/api/vendor/check-slug/${encodeURIComponent(candidateSlug)}?excludeId=${encodeURIComponent(String(resolvedVendorId))}`}
              currentSlug={resolvedSlug}
              entityId={resolvedVendorId}
              progressApi={{
                getProgress: () => ({ slug: resolvedSlug, entityId: resolvedVendorId }),
                setProgress: () => {},
                markStepComplete: () => {},
              }}
              titleFieldLabel="Vendor Display Name"
              titlePlaceholder="Enter vendor name"
              slugDescription="Vendor slug creates a dedicated vendor profile URL."
            />

            <div className="flex gap-2 justify-end">
              <Link href={buildVendorPortalHref(2, resolvedSlug, resolvedVendorId)} className="btn btn-sm btn-primary">Continue to Business Details</Link>
            </div>
          </div>
        </div>
      ) : null}

      {resolvedVendorId && currentStep === 2 ? (
        <div className="card bg-base-100 shadow border border-base-300">
          <div className="card-body gap-4">
            <div>
              <h2 className="card-title">Step 2: Business Details</h2>
              <p className="text-sm text-base-content/70">These fields map directly to the vendor API model.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <label className="form-control w-full">
                <div className="label"><span className="label-text">Company Name</span></div>
                <input
                  type="text"
                  className="input input-bordered w-full"
                  value={vendorForm.companyName}
                  onChange={(event) => setVendorForm((prev) => ({ ...prev, companyName: event.target.value }))}
                />
              </label>

              <label className="form-control w-full">
                <div className="label"><span className="label-text">Contract Expires</span></div>
                <input
                  type="date"
                  className="input input-bordered w-full"
                  value={vendorForm.contractExpires}
                  onChange={(event) => setVendorForm((prev) => ({ ...prev, contractExpires: event.target.value }))}
                />
              </label>

              <label className="form-control w-full">
                <div className="label"><span className="label-text">Link to Contract</span></div>
                <input
                  type="url"
                  className="input input-bordered w-full"
                  value={vendorForm.linkToContract}
                  onChange={(event) => setVendorForm((prev) => ({ ...prev, linkToContract: event.target.value }))}
                  placeholder="https://..."
                />
              </label>

              <label className="form-control w-full">
                <div className="label"><span className="label-text">Link to MSA</span></div>
                <input
                  type="url"
                  className="input input-bordered w-full"
                  value={vendorForm.linkToMSA}
                  onChange={(event) => setVendorForm((prev) => ({ ...prev, linkToMSA: event.target.value }))}
                  placeholder="https://..."
                />
              </label>

              <label className="form-control w-full md:col-span-2">
                <div className="label"><span className="label-text">MSA Executed Date</span></div>
                <input
                  type="date"
                  className="input input-bordered w-full"
                  value={vendorForm.msa_Executed}
                  onChange={(event) => setVendorForm((prev) => ({ ...prev, msa_Executed: event.target.value }))}
                />
              </label>

              <label className="form-control w-full md:col-span-2">
                <div className="label"><span className="label-text">Notes on Contracts</span></div>
                <textarea
                  className="textarea textarea-bordered w-full"
                  value={vendorForm.notesOnContracts}
                  onChange={(event) => setVendorForm((prev) => ({ ...prev, notesOnContracts: event.target.value }))}
                  rows={4}
                />
              </label>

              <label className="form-control w-full md:col-span-2">
                <div className="label"><span className="label-text">Notes on Vendor</span></div>
                <textarea
                  className="textarea textarea-bordered w-full"
                  value={vendorForm.notesOnVendors}
                  onChange={(event) => setVendorForm((prev) => ({ ...prev, notesOnVendors: event.target.value }))}
                  rows={4}
                />
              </label>
            </div>

            {step2Error ? (
              <div className="alert alert-error"><span>{step2Error}</span></div>
            ) : null}

            <div className="flex gap-2 justify-between flex-wrap">
              <Link href={buildVendorPortalHref(1, resolvedSlug, resolvedVendorId)} className="btn btn-sm btn-outline">Back to Slug</Link>
              <button
                type="button"
                className="btn btn-sm btn-primary"
                disabled={isSavingStep2}
                onClick={async () => {
                  if (!vendorForm.companyName.trim()) {
                    setStep2Error("Company name is required.")
                    return
                  }

                  if (!vendorForm.contractExpires.trim()) {
                    setStep2Error("Contract expiration date is required.")
                    return
                  }

                  setStep2Error("")
                  setIsSavingStep2(true)

                  try {
                    const saved = await persistVendor(basePayload, setStep2Error)
                    if (saved) {
                      window.location.href = buildVendorPortalHref(3, resolvedSlug, resolvedVendorId)
                    }
                  } finally {
                    setIsSavingStep2(false)
                  }
                }}
              >
                {isSavingStep2 ? "Saving..." : "Continue to Media and Gallery"}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {resolvedVendorId && currentStep === 3 ? (
        <OrganizationMediaStep
          context="vendor"
          entityId={resolvedVendorId}
          entitySlug={resolvedSlug}
          sessionUser={sessionUser}
          profilePrefix={vendorProfilePrefix}
          coverPrefix={vendorCoverPrefix}
          galleryPrefix={vendorGalleryPrefix}
          setProfileFiles={setProfileFiles}
          setCoverFiles={setCoverFiles}
          setLogoFiles={setLogoFiles}
          setGalleryFiles={setGalleryFiles}
          backHref={buildVendorPortalHref(2, resolvedSlug, resolvedVendorId)}
          backLabel="Back to Business Details"
          continueHref={buildVendorPortalHref(4, resolvedSlug, resolvedVendorId)}
          continueLabel="Continue to Primary Contacts"
        />
      ) : null}

      {resolvedVendorId && currentStep === 4 ? (
        <OrganizationPrimaryContactsStep
          context="vendor"
          entityId={resolvedVendorId}
          loadingContacts={loadingContacts}
          addressContacts={businessAddressContacts}
          emailContacts={businessEmailContacts}
          phoneContacts={businessPhoneContacts}
          refreshContacts={refreshVendorContacts}
          contactError={contactError}
          setContactError={setContactError}
          backHref={buildVendorPortalHref(3, resolvedSlug, resolvedVendorId)}
          backLabel="Back to Media"
          continueHref={buildVendorPortalHref(5, resolvedSlug, resolvedVendorId)}
        />
      ) : null}

      {resolvedVendorId && currentStep === 5 ? (
        <OrganizationPublicContactsStep
          context="vendor"
          entityId={resolvedVendorId}
          loadingContacts={loadingContacts}
          contactsTab={contactsTab}
          setContactsTab={setContactsTab}
          publicAddressContacts={publicAddressContacts}
          publicEmailContacts={publicEmailContacts}
          publicPhoneContacts={publicPhoneContacts}
          publicSocialContacts={publicSocialContacts}
          publicUrlContacts={publicUrlContacts}
          refreshContacts={refreshVendorContacts}
          backHref={buildVendorPortalHref(4, resolvedSlug, resolvedVendorId)}
          backLabel="Back to Primary Contacts"
          continueHref={resolvedSlug ? `/portal/vendor/${encodeURIComponent(resolvedSlug)}` : "/portal/vendor"}
          continueLabel="Done - Back to Vendor"
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
    const vendorData = await serverFetch(`/vendor/by-slug/${encodeURIComponent(normalizedSlug)}`)
    const vendorId = vendorData?.id || vendorData?.ID || vendorData?.vendorID || vendorData?.VendorID || null

    if (!vendorId) {
      return { notFound: true }
    }

    return {
      props: {
        currentStep,
        sessionUser: sessionUser?.user || null,
        vendorId,
        vendorData: vendorData || {},
        routeSlug: normalizedSlug,
      },
    }
  } catch {
    return { notFound: true }
  }
}
