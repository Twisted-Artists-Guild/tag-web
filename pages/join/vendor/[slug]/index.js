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

function buildVendorJoinHref(step, slug, id) {
  const normalizedSlug = String(slug || "").trim().toLowerCase()
  if (normalizedSlug) {
    const idSegment = id ? `&id=${encodeURIComponent(String(id))}` : ""
    return `/join/vendor/${encodeURIComponent(normalizedSlug)}?step=${step}${idSegment}`
  }

  return "/join/vendor?step=2"
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
    isPublished: Boolean(vendorData?.isPublished || vendorData?.IsPublished),
    isModerationBlocked: Boolean(vendorData?.isModerationBlocked || vendorData?.IsModerationBlocked),
  }
}

export default function JoinVendorSlugPage({ currentStep, vendorData, routeSlug, vendorId, sessionUser }) {
  const [vendorForm, setVendorForm] = useState(mapVendor(vendorData || {}))
  const [step3Error, setStep3Error] = useState("")
  const [contactError, setContactError] = useState("")
  const [publishError, setPublishError] = useState("")
  const [isSavingStep3, setIsSavingStep3] = useState(false)
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

  const totalBusinessContacts = businessAddressContacts.length + businessEmailContacts.length + businessPhoneContacts.length + businessUrlContacts.length
  const totalPublicContacts = publicAddressContacts.length + publicEmailContacts.length + publicPhoneContacts.length + publicSocialContacts.length + publicUrlContacts.length
  const hasRequiredContactTypes = businessAddressContacts.length > 0 && businessEmailContacts.length > 0 && businessPhoneContacts.length > 0
  const hasMedia = profileFiles.length > 0 || coverFiles.length > 0 || logoFiles.length > 0 || galleryFiles.length > 0

  const stepCompletionMap = useMemo(() => ({
    3: Boolean(vendorForm.companyName && vendorForm.contractExpires),
    4: hasMedia,
    5: true,
    6: true,
    7: Boolean(vendorForm.isPublished),
  }), [hasMedia, vendorForm.companyName, vendorForm.contractExpires, vendorForm.isPublished])

  const progressPercent = useMemo(() => {
    const steps = [3, 4, 5, 6, 7]
    const completeCount = steps.filter((step) => Boolean(stepCompletionMap[step])).length
    return Math.round((completeCount / steps.length) * 100)
  }, [stepCompletionMap])

  const pageMetaData = {
    title: "Join Vendor",
    description: "Vendor onboarding workflow with profile details, media, primary contacts, and publishing.",
    keywords: "join, vendor, onboarding",
    robots: "noindex, nofollow",
    og: {
      title: "Join Vendor",
      description: "Vendor onboarding workflow with profile details, media, primary contacts, and publishing.",
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
    if ((currentStep !== 5 && currentStep !== 6) || !resolvedVendorId) {
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
    isPublished: Boolean(vendorForm.isPublished),
    isModerationBlocked: Boolean(vendorForm.isModerationBlocked),
  }

  return (
    <JoinPageShell
      title="Join as a Vendor"
      description="Copying the artist workflow pattern: profile details, media, primary contacts, then review and publish."
      canonicalSlug="join/vendor"
      metadata={pageMetaData}
      steps={[
        {
          href: buildVendorJoinHref(3, resolvedSlug, resolvedVendorId),
          label: "Primary Business Details",
          isActive: currentStep === 3,
          isWarning: currentStep !== 3 && !stepCompletionMap[3],
        },
        {
          href: buildVendorJoinHref(4, resolvedSlug, resolvedVendorId),
          label: "Media and Gallery",
          isActive: currentStep === 4,
          isWarning: currentStep !== 4 && !stepCompletionMap[4],
        },
        {
          href: buildVendorJoinHref(5, resolvedSlug, resolvedVendorId),
          label: "Primary Contacts",
          isActive: currentStep === 5,
          isWarning: currentStep !== 5 && !stepCompletionMap[5],
        },
        {
          href: buildVendorJoinHref(6, resolvedSlug, resolvedVendorId),
          label: "Public Contacts",
          isActive: currentStep === 6,
          isWarning: currentStep !== 6 && !stepCompletionMap[6],
        },
        {
          href: buildVendorJoinHref(7, resolvedSlug, resolvedVendorId),
          label: "Review and Publish",
          isActive: currentStep === 7,
          isWarning: currentStep !== 7 && !stepCompletionMap[7],
        },
      ]}
      badge={resolvedVendorId ? `Vendor ID: ${resolvedVendorId}` : null}
      progress={progressPercent}
    >
      {!resolvedVendorId ? (
        <div className="alert alert-warning">
          <span>Missing vendor ID. Start at /join/vendor and reserve a workspace first.</span>
        </div>
      ) : null}

      {resolvedVendorId && currentStep === 3 ? (
        <div className="card bg-base-100 shadow border border-base-300">
          <div className="card-body gap-4">
            <div>
              <h2 className="card-title">Step 3: Primary Business Details</h2>
              <p className="text-sm text-base-content/70">These fields map directly to the vendor API model so the form stays backend-accurate.</p>
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

            {step3Error ? (
              <div className="alert alert-error"><span>{step3Error}</span></div>
            ) : null}

            <div className="flex gap-2 justify-between flex-wrap">
              <Link href="/join/vendor?step=2" className="btn btn-sm btn-outline">Back to Reservation</Link>
              <button
                type="button"
                className="btn btn-sm btn-primary"
                disabled={isSavingStep3}
                onClick={async () => {
                  if (!vendorForm.companyName.trim()) {
                    setStep3Error("Company name is required.")
                    return
                  }

                  if (!vendorForm.contractExpires.trim()) {
                    setStep3Error("Contract expiration date is required.")
                    return
                  }

                  setStep3Error("")
                  setIsSavingStep3(true)

                  try {
                    const saved = await persistVendor(basePayload, setStep3Error)
                    if (saved) {
                      window.location.href = buildVendorJoinHref(4, resolvedSlug, resolvedVendorId)
                    }
                  } finally {
                    setIsSavingStep3(false)
                  }
                }}
              >
                {isSavingStep3 ? "Saving..." : "Continue to Media and Gallery"}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {resolvedVendorId && currentStep === 4 ? (
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
          backHref={buildVendorJoinHref(3, resolvedSlug, resolvedVendorId)}
          backLabel="Back to Business Details"
          continueHref={buildVendorJoinHref(5, resolvedSlug, resolvedVendorId)}
          continueLabel="Continue to Primary Contacts"
        />
      ) : null}

      {resolvedVendorId && currentStep === 5 ? (
        <OrganizationPrimaryContactsStep
          context="vendor"
          entityId={resolvedVendorId}
          loadingContacts={loadingContacts}
          addressContacts={businessAddressContacts}
          emailContacts={businessEmailContacts}
          phoneContacts={businessPhoneContacts}
          urlContacts={businessUrlContacts}
          refreshContacts={refreshVendorContacts}
          hasRequiredContactTypes={hasRequiredContactTypes}
          contactError={contactError}
          setContactError={setContactError}
          backHref={buildVendorJoinHref(4, resolvedSlug, resolvedVendorId)}
          backLabel="Back to Media"
          continueHref={buildVendorJoinHref(6, resolvedSlug, resolvedVendorId)}
        />
      ) : null}

      {resolvedVendorId && currentStep === 6 ? (
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
          backHref={buildVendorJoinHref(5, resolvedSlug, resolvedVendorId)}
          continueHref={buildVendorJoinHref(7, resolvedSlug, resolvedVendorId)}
        />
      ) : null}

      {resolvedVendorId && currentStep === 7 ? (
        <div className="card bg-base-100 shadow border border-base-300">
          <div className="card-body gap-4">
            <div>
              <h2 className="card-title">Step 7: Review and Publish</h2>
              <p className="text-sm text-base-content/70">Final check before publish.</p>
            </div>

            <div className="rounded-box border border-base-300 bg-base-200/40 p-4 space-y-2 text-sm">
              <div><span className="font-semibold">Company:</span> {vendorForm.companyName || "Missing"}</div>
              <div><span className="font-semibold">Contract expires:</span> {vendorForm.contractExpires || "Missing"}</div>
              <div><span className="font-semibold">Business contacts saved:</span> {totalBusinessContacts}</div>
              <div><span className="font-semibold">Public contacts saved:</span> {totalPublicContacts}</div>
              <div><span className="font-semibold">Profile files:</span> {profileFiles.length}</div>
              <div><span className="font-semibold">Cover files:</span> {coverFiles.length}</div>
              <div><span className="font-semibold">Gallery files:</span> {galleryFiles.length}</div>
              <div><span className="font-semibold">Published:</span> {vendorForm.isPublished ? "Yes" : "No"}</div>
            </div>

            <div className="rounded-box border border-base-300 bg-base-200/40 p-4">
              <h3 className="font-semibold mb-2">Step Completion</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm">
                {[3, 4, 5, 6].map((step) => {
                  const labels = {
                    3: "Primary Business Details",
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
              <Link href={buildVendorJoinHref(6, resolvedSlug, resolvedVendorId)} className="btn btn-sm btn-outline">Back to Public Contacts</Link>
              <button
                type="button"
                className="btn btn-sm btn-success"
                disabled={isPublishing || vendorForm.isPublished}
                onClick={async () => {
                  setPublishError("")
                  setIsPublishing(true)

                  try {
                    const saved = await persistVendor({
                      ...basePayload,
                      isPublished: true,
                    }, setPublishError)

                    if (saved) {
                      setVendorForm((prev) => ({ ...prev, isPublished: true }))
                      const portalUrl = resolvedSlug ? `/portal/vendor/${encodeURIComponent(resolvedSlug)}` : "/portal/vendor"
                      window.location.href = portalUrl
                    }
                  } finally {
                    setIsPublishing(false)
                  }
                }}
              >
                {isPublishing ? "Publishing..." : vendorForm.isPublished ? "Published" : "Publish Vendor"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </JoinPageShell>
  )
}

export async function getVendorJoinServerProps(context, routeSlug = null) {
  const session = await getSessionFromRequest(context)

  if (!session?.user?.id) {
    return {
      redirect: {
        destination: `/api/auth/signin?callbackUrl=${encodeURIComponent(context.resolvedUrl || "/join/vendor")}`,
        permanent: false,
      },
    }
  }

  const currentStep = getWizardStep(context.query?.step)
  const normalizedRouteSlug = String(routeSlug || "").trim().toLowerCase()

  let vendorData = null
  let vendorId = Number(context.query?.id || 0)

  if (normalizedRouteSlug) {
    try {
      const response = await fetch(`/api/vendor/by-slug/${encodeURIComponent(normalizedRouteSlug)}`)
      if (response.ok) {
        vendorData = await response.json()
        vendorId = Number(vendorData?.vendorID || vendorData?.VendorID || 0)
      }
    } catch {
      // no-op
    }
  }

  if (!vendorData && vendorId > 0) {
    try {
      const response = await fetch(`/api/vendor/byID/${vendorId}`)
      if (response.ok) {
        vendorData = await response.json()
      }
    } catch {
      // no-op
    }
  }

  return {
    props: {
      sessionUser: session?.user || null,
      currentStep,
      vendorData,
      vendorId: vendorId > 0 ? vendorId : null,
      routeSlug: normalizedRouteSlug,
    },
  }
}

export async function getServerSideProps(context) {
  const routeSlug = String(context?.params?.slug || "").trim().toLowerCase()
  return getVendorJoinServerProps(context, routeSlug)
}
