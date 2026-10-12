/* This file is part of the Twisted Artists Guild project.

 Copyright (C) 2025 Twisted Artists Guild

 Licensed under the GNU General Public License v3.0
 (https://www.gnu.org/licenses/gpl-3.0.en.html).

 This software comes with NO WARRANTY; see the license for details.

 Open source · low-profit · human-first*/

import Link from "next/link"
import { useRouter } from "next/router"
import { getServerSession } from "next-auth/next"
import { useEffect, useState } from "react"

import { authOptions } from "@/pages/api/auth/[...nextauth]"
import TagSEO from "@/components/TagSEO"
import ArtistContextNav from "@/components/portal/ArtistContextNav"
import RegisterSlug from "@/components/forms/onboarding/register-slug"
import AddressForm from "@/components/forms/contact/address-form"
import EmailForm from "@/components/forms/contact/email-form"
import PhoneForm from "@/components/forms/contact/phone-form"
import SocialHandlesForm from "@/components/forms/contact/social-handles-form"
import UrlLinksForm from "@/components/forms/contact/url-links-form"
import GalleryManager from "@/components/gallery/GalleryManager"
import TTTitleLine from "@/components/tiptap/TT_TitleLine"
import TTArticle from "@/components/tiptap/TT_Article"
import serverFetch from "@/libs/serverFetch"

function getRequestOrigin(req) {
  const forwardedProto = String(req?.headers?.["x-forwarded-proto"] || "").split(",")[0].trim()
  const forwardedHost = String(req?.headers?.["x-forwarded-host"] || "").trim()
  const host = forwardedHost || String(req?.headers?.host || "").trim()
  if (!host) return null
  const protocol = forwardedProto || (process.env.NODE_ENV === "development" ? "http" : "https")
  return `${protocol}://${host}`
}

async function getSessionFromRequest(context) {
  const origin = getRequestOrigin(context?.req)
  if (!origin) return null
  try {
    const response = await fetch(`${origin}/api/auth/session`, {
      headers: { cookie: context?.req?.headers?.cookie || "" },
    })
    return response.ok ? await response.json() : null
  } catch {
    return null
  }
}

/**
 * Portal Edit page for Artist
 * URL: /portal/artist/{slug}/edit
 * Features: slug update (with reservation check), profile, contacts, media
 * Skips: terms agreement, publish step
 */
export default function PortalArtistEditPage({ artistId, artistData }) {
  const router = useRouter()
  const [currentStep, setCurrentStep] = useState(1)
  const [contactsTab, setContactsTab] = useState("address")
  
  const [publicAddressContacts, setPublicAddressContacts] = useState([])
  const [publicEmailContacts, setPublicEmailContacts] = useState([])
  const [publicPhoneContacts, setPublicPhoneContacts] = useState([])
  const [publicSocialContacts, setPublicSocialContacts] = useState([])
  const [publicUrlContacts, setPublicUrlContacts] = useState([])
  
  const [privateAddressContacts, setPrivateAddressContacts] = useState([])
  const [privateEmailContacts, setPrivateEmailContacts] = useState([])
  const [privatePhoneContacts, setPrivatePhoneContacts] = useState([])
  const [privateUrlContacts, setPrivateUrlContacts] = useState([])

  const [loadingContacts, setLoadingContacts] = useState(false)
  const [profileFiles, setProfileFiles] = useState([])
  const [coverFiles, setCoverFiles] = useState([])

  // Profile form state
  const [profileTitle, setProfileTitle] = useState(String(artistData?.title || artistData?.Title || "").trim())
  const [profileByline, setProfileByline] = useState(String(artistData?.byline || artistData?.Byline || "").trim())
  const [profileBiography, setProfileBiography] = useState(String(artistData?.biography || artistData?.Biography || "").trim())
  const [profileStatement, setProfileStatement] = useState(String(artistData?.statement || artistData?.Statement || "").trim())
  const [profileSeoTags, setProfileSeoTags] = useState(String(artistData?.seoTags || artistData?.SEOTags || "").trim())
  const [city, setCity] = useState(String(artistData?.city || artistData?.City || "").trim())
  const [stateOrProvince, setStateOrProvince] = useState(String(artistData?.stateOrProvince || artistData?.StateOrProvince || "").trim())
  const [zipCode, setZipCode] = useState(String(artistData?.zipCode || artistData?.ZipCode || artistData?.postalCode || artistData?.PostalCode || "").trim())
  const [country, setCountry] = useState(String(artistData?.country || artistData?.Country || "USA").trim())
  const [businessEntityType, setBusinessEntityType] = useState(String(artistData?.businessEntityType || artistData?.BusinessEntityType || "").trim())
  const [incorporationStatus, setIncorporationStatus] = useState(
    typeof artistData?.isFormallyIncorporated === "boolean"
      ? artistData.isFormallyIncorporated ? "true" : "false"
      : typeof artistData?.IsFormallyIncorporated === "boolean"
        ? artistData.IsFormallyIncorporated ? "true" : "false"
        : ""
  )
  const [incorporatedYear, setIncorporatedYear] = useState(String(artistData?.incorporatedYear || artistData?.IncorporatedYear || "").trim())
  const [profileFormError, setProfileFormError] = useState("")
  const [isSavingProfileForm, setIsSavingProfileForm] = useState(false)

  useEffect(() => {
    if (!artistId) return
    const loadContacts = async () => {
      setLoadingContacts(true)
      try {
        const res = await fetch(`/api/contact/artist/${artistId}?includePrivate=true`)
        if (res.ok) {
          const data = await res.json()
          const rows = Array.isArray(data?.contacts) ? data.contacts : []
          const publicRows = rows.filter(c => String(c?.scope || "").toLowerCase() === "secondary")
          const privateRows = rows.filter(c => ["private", "primary"].includes(String(c?.scope || "").toLowerCase()))

          setPublicAddressContacts(publicRows.filter(c => String(c?.contactType || "").toLowerCase() === "address"))
          setPublicEmailContacts(publicRows.filter(c => String(c?.contactType || "").toLowerCase() === "email"))
          setPublicPhoneContacts(publicRows.filter(c => String(c?.contactType || "").toLowerCase() === "phone"))
          setPublicUrlContacts(publicRows.filter(c => String(c?.contactType || "").toLowerCase() === "url" && String(c?.category || "").toLowerCase() === "website"))
          setPublicSocialContacts(publicRows.filter(c => String(c?.contactType || "").toLowerCase() === "url" && String(c?.category || "").toLowerCase() !== "website"))

          setPrivateAddressContacts(privateRows.filter(c => String(c?.contactType || "").toLowerCase() === "address"))
          setPrivateEmailContacts(privateRows.filter(c => String(c?.contactType || "").toLowerCase() === "email"))
          setPrivatePhoneContacts(privateRows.filter(c => String(c?.contactType || "").toLowerCase() === "phone"))
          setPrivateUrlContacts(privateRows.filter(c => String(c?.contactType || "").toLowerCase() === "url"))
        }
      } finally {
        setLoadingContacts(false)
      }
    }
    loadContacts()
  }, [artistId])

  const pageMetaData = {
    title: "Edit Artist Profile",
    description: "Update your artist profile, contacts, and media.",
    robots: "noindex, nofollow",
  }

  const steps = [
    { num: 1, label: "Update Slug", key: "slug" },
    { num: 2, label: "Profile", key: "profile" },
    { num: 3, label: "Business Details", key: "business-details" },
    { num: 4, label: "Media", key: "media" },
    { num: 5, label: "Private Contacts", key: "private-contacts" },
    { num: 6, label: "Public Contacts", key: "public-contacts" },
  ]

  return (
    <div className="min-h-screen bg-base-200 p-4 md:p-8">
      <TagSEO metadataProp={pageMetaData} canonicalSlug={`portal/artist/${artistData?.path || "edit"}`} />
      <ArtistContextNav />

      <div className="max-w-4xl mx-auto space-y-6">
        <div className="card bg-base-100 shadow border border-base-300">
          <div className="card-body gap-3">
            <div className="flex items-center justify-between flex-wrap gap-3">
              <h1 className="text-3xl font-bold">Edit Artist Profile</h1>
              <Link href={`/portal/artist/${artistData?.path || ""}`} className="btn btn-sm btn-ghost">
                Back to Profile
              </Link>
            </div>
          </div>
        </div>

        {/* Step indicator */}
        <div className="card bg-base-100 shadow border border-base-300">
          <div className="card-body">
            <div className="flex flex-wrap gap-2">
              {steps.map(step => (
                <button
                  key={step.key}
                  onClick={() => setCurrentStep(step.num)}
                  className={`btn btn-sm ${currentStep === step.num ? "btn-primary" : "btn-outline"}`}
                >
                  {step.num}. {step.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Step 1: Update Slug */}
        {currentStep === 1 && (
          <div className="card bg-base-100 shadow border border-base-300">
            <div className="card-body gap-4">
              <h2 className="text-2xl font-semibold">Update Artist Slug</h2>
              <p className="text-sm text-base-content/70">
                Your slug is part of your artist URL. It must be unique and cannot be changed frequently.
              </p>
              <RegisterSlug
                domain="artist"
                domainLabel="Artist"
                reserveEndpoint={`/api/artist/reserve-slug`}
                updateEndpoint={(id) => `/api/artist/${id}/update-slug`}
                checkEndpoint={(candidateSlug, currentId) =>
                  `/api/artist/check-slug/${encodeURIComponent(candidateSlug)}${currentId ? `?excludeId=${encodeURIComponent(currentId)}` : ""}`
                }
                progressApi={{
                  getProgress: () => ({ slug: artistData?.path, entityId: artistId }),
                  setProgress: () => {},
                  markStepComplete: () => {},
                }}
                titleFieldLabel="Artist Display Name"
                titlePlaceholder="Enter artist name"
                slugDescription="Artist slug creates a dedicated artist profile URL."
              />
              <div className="flex gap-2">
                <button onClick={() => setCurrentStep(2)} className="btn btn-primary">
                  Continue to Profile
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Step 2: Profile */}
        {currentStep === 2 && (
          <div className="card bg-base-100 shadow border border-base-300">
            <div className="card-body gap-4">
              <h2 className="text-2xl font-semibold">Profile Information</h2>
              <p className="text-sm text-base-content/70">Update your profile details.</p>

              <div className="rounded-box border border-base-300 bg-base-200/40 p-4 space-y-4">
                <h3 className="font-semibold text-base-content">Profile Details</h3>

                <div className="form-control w-full">
                  <div className="label">
                    <span className="label-text">Title (H1)</span>
                  </div>
                  <TTTitleLine
                    value={profileTitle}
                    onChange={setProfileTitle}
                    headingLevel={1}
                    placeholder="Artist or group title"
                  />
                </div>

                <div className="form-control w-full">
                  <div className="label">
                    <span className="label-text">Byline (H2)</span>
                  </div>
                  <TTTitleLine
                    value={profileByline}
                    onChange={setProfileByline}
                    headingLevel={2}
                    placeholder="Short byline"
                  />
                </div>

                <div className="form-control w-full">
                  <div className="label">
                    <span className="label-text">Biography</span>
                  </div>
                  <TTArticle
                    value={profileBiography}
                    onChange={setProfileBiography}
                    actionPreset="none"
                    minHeight={220}
                  />
                </div>

                <div className="form-control w-full">
                  <div className="label">
                    <span className="label-text">Statement</span>
                  </div>
                  <TTArticle
                    value={profileStatement}
                    onChange={setProfileStatement}
                    actionPreset="none"
                    minHeight={240}
                  />
                </div>

                <label className="form-control w-full">
                  <div className="label">
                    <span className="label-text">SEO Tags</span>
                  </div>
                  <input
                    type="text"
                    className="input input-bordered w-full"
                    value={profileSeoTags}
                    onChange={(event) => setProfileSeoTags(event.target.value)}
                    placeholder="abstract art, mixed media, surrealism"
                  />
                </label>
              </div>

              {profileFormError && (
                <div className="alert alert-error">
                  <span>{profileFormError}</span>
                </div>
              )}

              <div className="flex gap-2">
                <button onClick={() => setCurrentStep(1)} className="btn btn-ghost">
                  Back to Slug
                </button>
                <button
                  onClick={async () => {
                    if (!artistId) {
                      setProfileFormError("Artist ID is missing.")
                      return
                    }

                    const titleText = profileTitle.trim()
                    if (!titleText) {
                      setProfileFormError("Title is required.")
                      return
                    }

                    setProfileFormError("")
                    setIsSavingProfileForm(true)

                    try {
                      const response = await fetch(`/api/artist/byID/${artistId}`, {
                        method: "PUT",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({
                          title: profileTitle,
                          byline: profileByline.trim() || null,
                          biography: profileBiography.trim() || null,
                          statement: profileStatement.trim() || null,
                          seoTags: profileSeoTags.trim() || null,
                        }),
                      })

                      if (!response.ok) {
                        const errorText = await response.text()
                        setProfileFormError(errorText || `Unable to save profile (${response.status}).`)
                        return
                      }

                      setCurrentStep(3)
                    } catch (error) {
                      setProfileFormError(error.message || "Unable to save profile details.")
                    } finally {
                      setIsSavingProfileForm(false)
                    }
                  }}
                  disabled={isSavingProfileForm}
                  className="btn btn-primary"
                >
                  {isSavingProfileForm ? "Saving..." : "Continue to Business Details"}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Step 3: Business Details */}
        {currentStep === 3 && (
          <div className="card bg-base-100 shadow border border-base-300">
            <div className="card-body gap-4">
              <h2 className="text-2xl font-semibold">Business Details</h2>
              <p className="text-sm text-base-content/70">Update your location and business information.</p>

              <div className="rounded-box border border-base-300 bg-base-200/40 p-4 space-y-4">
                <h3 className="font-semibold text-base-content">Location & Business</h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <label className="form-control w-full">
                    <div className="label">
                      <span className="label-text">City</span>
                    </div>
                    <input
                      type="text"
                      className="input input-bordered w-full"
                      value={city}
                      onChange={(event) => setCity(event.target.value)}
                      placeholder="City"
                    />
                  </label>

                  <label className="form-control w-full">
                    <div className="label">
                      <span className="label-text">State / Province</span>
                    </div>
                    <input
                      type="text"
                      className="input input-bordered w-full"
                      value={stateOrProvince}
                      onChange={(event) => setStateOrProvince(event.target.value)}
                      placeholder="State or Region"
                    />
                  </label>

                  <label className="form-control w-full">
                    <div className="label">
                      <span className="label-text">Zip / Postal Code</span>
                    </div>
                    <input
                      type="text"
                      className="input input-bordered w-full"
                      value={zipCode}
                      onChange={(event) => setZipCode(event.target.value)}
                      placeholder="Zip / Postal Code"
                    />
                  </label>

                  <label className="form-control w-full">
                    <div className="label">
                      <span className="label-text">Country</span>
                    </div>
                    <input
                      type="text"
                      className="input input-bordered w-full"
                      value={country}
                      onChange={(event) => setCountry(event.target.value)}
                      placeholder="Country"
                    />
                  </label>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <label className="form-control w-full">
                    <div className="label">
                      <span className="label-text">Business Entity Type</span>
                    </div>
                    <select
                      className="select select-bordered w-full"
                      value={businessEntityType}
                      onChange={(event) => setBusinessEntityType(event.target.value)}
                    >
                      <option value="">Select business entity</option>
                      <option value="sole-proprietorship">Sole Proprietorship</option>
                      <option value="llc">LLC</option>
                      <option value="corporation">Corporation</option>
                      <option value="partnership">Partnership</option>
                      <option value="nonprofit">Nonprofit</option>
                      <option value="other">Other</option>
                    </select>
                  </label>

                  <label className="form-control w-full">
                    <div className="label">
                      <span className="label-text">Formally Incorporated</span>
                    </div>
                    <select
                      className="select select-bordered w-full"
                      value={incorporationStatus}
                      onChange={(event) => setIncorporationStatus(event.target.value)}
                    >
                      <option value="">Select incorporation status</option>
                      <option value="true">Yes</option>
                      <option value="false">No</option>
                    </select>
                  </label>
                </div>

                {incorporationStatus === "true" && (
                  <label className="form-control w-full">
                    <div className="label">
                      <span className="label-text">Year Incorporated</span>
                    </div>
                    <input
                      type="number"
                      min="1800"
                      max={new Date().getFullYear()}
                      step="1"
                      className="input input-bordered w-full"
                      placeholder={`e.g. ${new Date().getFullYear() - 5}`}
                      value={incorporatedYear}
                      onChange={(event) => setIncorporatedYear(event.target.value)}
                    />
                    <div className="label">
                      <span className="label-text-alt">Optional — four-digit year your entity was formally incorporated.</span>
                    </div>
                  </label>
                )}
              </div>

              {profileFormError && (
                <div className="alert alert-error">
                  <span>{profileFormError}</span>
                </div>
              )}

              <div className="flex gap-2">
                <button onClick={() => setCurrentStep(2)} className="btn btn-ghost">
                  Back to Profile
                </button>
                <button
                  onClick={async () => {
                    if (!artistId) {
                      setProfileFormError("Artist ID is missing.")
                      return
                    }

                    if (!city.trim()) {
                      setProfileFormError("City is required.")
                      return
                    }

                    if (!country.trim()) {
                      setProfileFormError("Country is required.")
                      return
                    }

                    if (!stateOrProvince.trim()) {
                      setProfileFormError("State or province is required.")
                      return
                    }

                    if (!zipCode.trim()) {
                      setProfileFormError("Zip or postal code is required.")
                      return
                    }

                    if (!businessEntityType) {
                      setProfileFormError("Business entity type is required.")
                      return
                    }

                    if (!incorporationStatus) {
                      setProfileFormError("Incorporation status is required.")
                      return
                    }

                    const isIncorporated = incorporationStatus === "true"
                    const parsedYear = incorporatedYear ? Number(incorporatedYear) : null
                    const validYear = parsedYear && parsedYear >= 1800 && parsedYear <= new Date().getFullYear() ? parsedYear : null

                    if (isIncorporated && incorporatedYear && !validYear) {
                      setProfileFormError("Incorporated year must be a valid 4-digit year.")
                      return
                    }

                    setProfileFormError("")
                    setIsSavingProfileForm(true)

                    try {
                      const response = await fetch(`/api/artist/byID/${artistId}`, {
                        method: "PUT",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({
                          city: city.trim(),
                          country: country.trim(),
                          stateOrProvince: stateOrProvince.trim(),
                          zipCode: zipCode.trim(),
                          businessEntityType,
                          isFormallyIncorporated: isIncorporated,
                          incorporatedYear: isIncorporated ? validYear : null,
                        }),
                      })

                      if (!response.ok) {
                        const errorText = await response.text()
                        setProfileFormError(errorText || `Unable to save business details (${response.status}).`)
                        return
                      }

                      setCurrentStep(4)
                    } catch (error) {
                      setProfileFormError(error.message || "Unable to save business details.")
                    } finally {
                      setIsSavingProfileForm(false)
                    }
                  }}
                  disabled={isSavingProfileForm}
                  className="btn btn-primary"
                >
                  {isSavingProfileForm ? "Saving..." : "Continue to Media"}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Step 4: Media */}
        {currentStep === 4 && (
          <div className="card bg-base-100 shadow border border-base-300">
            <div className="card-body gap-4">
              <h2 className="text-2xl font-semibold">Profile, Cover, Logo & Gallery</h2>
              <p className="text-sm text-base-content/70">Manage owner profile, business logo, cover image, and gallery items separately.</p>
              {artistId && (
                <div className="space-y-4">
                  <GalleryManager
                    artistID={artistId}
                    storagePrefix={`platformpics/artistcontent/${artistId}/`}
                    allowMultipleGalleryItems
                  />
                  <GalleryManager
                    entityType="artist"
                    entityId={artistId}
                    entityLabel={`Artist: ${artistId}`}
                    folderKind="logo"
                    title="Artist Logo Manager"
                    allowVideo={false}
                    basePrefix={`platformpics/artists/${artistId}/logo/`}
                    lockedRootPrefix={`platformpics/artists/${artistId}/`}
                    singleImageMode
                    allowDeleteSingleImage
                  />
                </div>
              )}
              <div className="flex gap-2">
                <button onClick={() => setCurrentStep(3)} className="btn btn-ghost">
                  Back to Business Details
                </button>
                <button onClick={() => setCurrentStep(5)} className="btn btn-primary">
                  Continue to Private Contacts
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Step 5: Private Contacts */}
        {currentStep === 5 && (
          <div className="card bg-base-100 shadow border border-base-300">
            <div className="card-body gap-4">
              <h2 className="text-2xl font-semibold">Private Contacts (Business)</h2>
              <p className="text-sm text-base-content/70">These are required for internal operations and won't be shown publicly.</p>
              <div className="space-y-4">
                <AddressForm scope="private" artistID={artistId} onContactsChange={setPrivateAddressContacts} existingContacts={privateAddressContacts} />
                <EmailForm scope="private" artistID={artistId} onContactsChange={setPrivateEmailContacts} existingContacts={privateEmailContacts} />
                <PhoneForm scope="private" artistID={artistId} onContactsChange={setPrivatePhoneContacts} existingContacts={privatePhoneContacts} />
                <UrlLinksForm scope="private" artistID={artistId} onContactsChange={setPrivateUrlContacts} existingContacts={privateUrlContacts} />
              </div>
              <div className="flex gap-2">
                <button onClick={() => setCurrentStep(4)} className="btn btn-ghost">
                  Back to Media
                </button>
                <button onClick={() => setCurrentStep(6)} className="btn btn-primary">
                  Continue to Public Contacts
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Step 6: Public Contacts */}
        {currentStep === 6 && (
          <div className="card bg-base-100 shadow border border-base-300">
            <div className="card-body gap-4">
              <h2 className="text-2xl font-semibold">Public Contacts</h2>
              <p className="text-sm text-base-content/70">These will be visible on your public profile.</p>
              
              <div className="tabs tabs-bordered">
                {[
                  { key: "address", label: "Address", component: AddressForm, state: publicAddressContacts, setState: setPublicAddressContacts },
                  { key: "email", label: "Email", component: EmailForm, state: publicEmailContacts, setState: setPublicEmailContacts },
                  { key: "phone", label: "Phone", component: PhoneForm, state: publicPhoneContacts, setState: setPublicPhoneContacts },
                  { key: "social", label: "Social", component: SocialHandlesForm, state: publicSocialContacts, setState: setPublicSocialContacts },
                  { key: "urls", label: "URLs", component: UrlLinksForm, state: publicUrlContacts, setState: setPublicUrlContacts },
                ].map(tab => (
                  <button
                    key={tab.key}
                    onClick={() => setContactsTab(tab.key)}
                    className={`tab ${contactsTab === tab.key ? "tab-active" : ""}`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>

              <div>
                {contactsTab === "address" && <AddressForm scope="secondary" artistID={artistId} onContactsChange={setPublicAddressContacts} existingContacts={publicAddressContacts} />}
                {contactsTab === "email" && <EmailForm scope="secondary" artistID={artistId} onContactsChange={setPublicEmailContacts} existingContacts={publicEmailContacts} />}
                {contactsTab === "phone" && <PhoneForm scope="secondary" artistID={artistId} onContactsChange={setPublicPhoneContacts} existingContacts={publicPhoneContacts} />}
                {contactsTab === "social" && <SocialHandlesForm scope="secondary" artistID={artistId} onContactsChange={setPublicSocialContacts} existingContacts={publicSocialContacts} />}
                {contactsTab === "urls" && <UrlLinksForm scope="secondary" artistID={artistId} onContactsChange={setPublicUrlContacts} existingContacts={publicUrlContacts} />}
              </div>

              <div className="flex gap-2">
                <button onClick={() => setCurrentStep(5)} className="btn btn-ghost">
                  Back to Private Contacts
                </button>
                <Link href={`/portal/artist/${artistData?.path || ""}`} className="btn btn-success">
                  Done - Back to Profile
                </Link>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
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

  console.error(`[ArtistEdit getServerSideProps] Starting with slug: "${slug}", normalized: "${normalizedSlug}"`)

  try {    
    console.error(`[ArtistEdit] Fetching from: /artist/${encodeURIComponent(normalizedSlug)}`)
    const artistResponse = await serverFetch(`/artist/${encodeURIComponent(normalizedSlug)}`)
    console.error(`[ArtistEdit] API response status: ${artistResponse.status}`)
    
    if (!artistResponse.ok) {
      const text = await artistResponse.text()
      console.error(`[ArtistEdit] API error response body: ${text}`)
    }
    
    const artistData = artistResponse.ok ? await artistResponse.json() : null
    const artistId = artistData?.id || artistData?.ID || artistData?.artistID || artistData?.ArtistID || null
    console.error(`[ArtistEdit] Extracted artistId: "${artistId}"`)

    if (!artistId) {
      console.error(`[ArtistEdit] No artistId found, returning notFound`)
      return { notFound: true }
    }

    console.error(`[ArtistEdit] Success! Returning props with artistId: ${artistId}`)
    return {
      props: { artistId, artistData: artistData || {} },
    }
  } catch (error) {
    console.error(`[ArtistEdit] Error caught:`, error)
    return { notFound: true }
  }
}
