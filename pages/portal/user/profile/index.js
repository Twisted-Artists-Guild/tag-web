/* This file is part of the Twisted Artists Guild project.

 Copyright (C) 2025 Twisted Artists Guild

 Licensed under the GNU General Public License v3.0
 (https://www.gnu.org/licenses/gpl-3.0.en.html).

 This software comes with NO WARRANTY; see the license for details.

 Open source · low-profit · human-first*/

import { useEffect, useMemo, useState } from "react"
import { getServerSession } from "next-auth/next"
import Link from "next/link"

import { authOptions } from "@/pages/api/auth/[...nextauth]"
import RegisterSlug from "@/components/forms/onboarding/register-slug"
import UserContextNav from "@/components/portal/UserContextNav"
import UserPrivateContactsStep from "@/components/forms/onboarding/users/UserPrivateContactsStep"
import UserProfileMediaStep from "@/components/forms/onboarding/users/UserProfileMediaStep"
import TagSEO from "@/components/TagSEO"
import serverFetch from "@/libs/serverFetch"

function getPortalStep(rawStep) {
  const parsed = Number(rawStep || 1)
  if (parsed >= 1 && parsed <= 4) {
    return parsed
  }

  return 1
}

function buildProfileTabHref(step) {
  return `/portal/user/profile?step=${step}`
}

function resolveUsername(userData) {
  return String(
    userData?.username
      || userData?.Username
      || userData?.handle
      || userData?.Handle
      || "",
  ).trim().toLowerCase()
}

function mapUserToProfile(userData) {
  return {
    preferredName: String(userData?.preferredName || userData?.PreferredName || ""),
    companyTitle: String(userData?.companyTitle || userData?.CompanyTitle || ""),
    nationality: String(userData?.nationality || userData?.Nationality || ""),
  }
}

export async function getServerSideProps(context) {
  const session = await getServerSession(context.req, context.res, authOptions)

  if (!session?.user) {
    return {
      redirect: {
        destination: `/api/auth/signin?callbackUrl=${encodeURIComponent("/portal/user/profile")}`,
        permanent: false,
      },
    }
  }

  const userId = Number(session.user.id || 0)
  if (!Number.isFinite(userId) || userId <= 0) {
    return {
      redirect: {
        destination: "/portal/user",
        permanent: false,
      },
    }
  }

  const currentStep = getPortalStep(context.query?.step)

  try {
    const userResponse = await serverFetch(`/user-details/${userId}/private?viewerUserId=${encodeURIComponent(String(userId))}`)
    const userData = userResponse.ok ? await userResponse.json() : null

    return {
      props: {
        currentStep,
        sessionUser: session.user,
        userId,
        userData: userData || {},
      },
    }
  } catch {
    return {
      props: {
        currentStep,
        sessionUser: session.user,
        userId,
        userData: {},
      },
    }
  }
}

export default function UserProfilePage({ currentStep, userId, userData, sessionUser }) {
  const [profileData, setProfileData] = useState(mapUserToProfile(userData || {}))
  const [profileError, setProfileError] = useState("")
  const [isSavingProfile, setIsSavingProfile] = useState(false)
  const [loadingContacts, setLoadingContacts] = useState(false)
  const [contactError, setContactError] = useState("")
  const [addressContacts, setAddressContacts] = useState([])
  const [emailContacts, setEmailContacts] = useState([])
  const [phoneContacts, setPhoneContacts] = useState([])
  const [socialContacts, setSocialContacts] = useState([])
  const [urlContacts, setUrlContacts] = useState([])

  const normalizedUsername = resolveUsername(userData)
  const totalContacts = addressContacts.length + emailContacts.length + phoneContacts.length + socialContacts.length + urlContacts.length

  const stepCompletionMap = useMemo(() => ({
    1: Boolean(normalizedUsername),
    2: Boolean(String(profileData.preferredName || "").trim() || String(profileData.companyTitle || "").trim()),
    3: true,
    4: totalContacts > 0,
  }), [normalizedUsername, profileData.companyTitle, profileData.preferredName, totalContacts])

  const progressPercent = useMemo(() => {
    const steps = [1, 2, 3, 4]
    const completeCount = steps.filter((step) => Boolean(stepCompletionMap[step])).length
    return Math.round((completeCount / steps.length) * 100)
  }, [stepCompletionMap])

  const refreshUserContacts = async () => {
    if (!userId) {
      return
    }

    setLoadingContacts(true)
    try {
      const response = await fetch(`/api/contact/user/${userId}?includePrivate=true`)
      if (!response.ok) {
        return
      }

      const data = await response.json()
      const rows = Array.isArray(data?.contacts) ? data.contacts : []
      const isPrivateRow = (contact) => contact?.isPrivate === true || String(contact?.isPrivate || "").trim().toLowerCase() === "true"
      const privateRows = rows.filter((contact) => isPrivateRow(contact))

      setAddressContacts(privateRows.filter((contact) => String(contact?.contactType || "").toLowerCase() === "address"))
      setEmailContacts(privateRows.filter((contact) => String(contact?.contactType || "").toLowerCase() === "email"))
      setPhoneContacts(privateRows.filter((contact) => String(contact?.contactType || "").toLowerCase() === "phone"))
      setUrlContacts(privateRows.filter((contact) => String(contact?.contactType || "").toLowerCase() === "url" && String(contact?.category || "").toLowerCase() === "website"))
      setSocialContacts(privateRows.filter((contact) => String(contact?.contactType || "").toLowerCase() === "url" && String(contact?.category || "").toLowerCase() !== "website"))
    } finally {
      setLoadingContacts(false)
    }
  }

  useEffect(() => {
    if (currentStep !== 4 || !userId) {
      return
    }

    refreshUserContacts()
  }, [currentStep, userId])

  const saveProfile = async () => {
    if (!userId) {
      setProfileError("Missing user ID.")
      return
    }

    setProfileError("")
    setIsSavingProfile(true)

    try {
      const response = await fetch(`/api/user-details/${userId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          preferredName: String(profileData.preferredName || "").trim() || null,
          companyTitle: String(profileData.companyTitle || "").trim() || null,
          nationality: String(profileData.nationality || "").trim() || null,
        }),
      })

      if (!response.ok) {
        const message = await response.text()
        setProfileError(message || `Unable to save profile (${response.status}).`)
        return
      }

      window.location.href = buildProfileTabHref(3)
    } finally {
      setIsSavingProfile(false)
    }
  }

  return (
    <>
      <TagSEO title="Profile - User Portal" description="Edit user profile with shared onboarding modules." canonicalSlug="portal/user/profile" />
      <UserContextNav />

      <div className="min-h-screen bg-base-200 p-4 md:p-8">
        <div className="max-w-5xl mx-auto space-y-6">
          <div className="card bg-base-100 shadow-lg border border-base-300">
            <div className="card-body gap-3">
              <div className="flex items-center justify-between gap-3 flex-wrap">
                <h1 className="text-3xl font-bold text-base-content">Profile</h1>
                <Link href="/portal/user" className="btn btn-sm btn-ghost">Back to Dashboard</Link>
              </div>
              <p className="text-base-content/70">Profile tab now uses the same real edit modules used by onboarding.</p>
            </div>
          </div>

          <div className="card bg-base-100 shadow border border-base-300">
            <div className="card-body gap-3">
              <div className="flex gap-2 flex-wrap items-center">
                {[1, 2, 3, 4].map((step) => {
                  const labelMap = {
                    1: "Username",
                    2: "Profile",
                    3: "Media",
                    4: "Private Contacts",
                  }
                  const isActive = currentStep === step
                  const isWarning = !isActive && !stepCompletionMap[step]
                  const stateClass = isActive ? "btn-primary" : isWarning ? "btn-warning btn-outline animate-pulse" : "btn-outline"

                  return (
                    <Link key={step} href={buildProfileTabHref(step)} className={`btn btn-sm ${stateClass}`}>
                      {labelMap[step]}
                    </Link>
                  )
                })}
                <span className="badge badge-info">User ID: {userId}</span>
              </div>

              <progress className="progress progress-primary w-full" value={progressPercent} max="100" />
              <div className="text-xs text-base-content/70">{progressPercent}% complete</div>
            </div>
          </div>

          {currentStep === 1 ? (
            <div className="card bg-base-100 shadow border border-base-300">
              <div className="card-body gap-4">
                <div>
                  <h2 className="card-title">Step 1: Update Username</h2>
                  <p className="text-sm text-base-content/70">Update username using the same slug reservation component used in join.</p>
                </div>

                <RegisterSlug
                  domain="user"
                  domainLabel="User"
                  reserveEndpoint={`/api/user/reserve-username`}
                  updateEndpoint={(id) => `/api/user/${id}/update-username`}
                  checkEndpoint={(candidateUsername) => `/api/user/check-username/${encodeURIComponent(candidateUsername)}?excludeId=${encodeURIComponent(String(userId))}`}
                  currentSlug={normalizedUsername}
                  entityId={userId}
                  progressApi={{
                    getProgress: () => ({ slug: normalizedUsername, entityId: userId }),
                    setProgress: () => {},
                    markStepComplete: () => {},
                  }}
                />

                <div className="flex gap-2 justify-end">
                  <Link href={buildProfileTabHref(2)} className="btn btn-sm btn-primary">Continue to Profile</Link>
                </div>
              </div>
            </div>
          ) : null}

          {currentStep === 2 ? (
            <div className="card bg-base-100 shadow border border-base-300">
              <div className="card-body gap-4">
                <div>
                  <h2 className="card-title">Step 2: Profile</h2>
                  <p className="text-sm text-base-content/70">Edit profile fields that map to user details.</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <label className="form-control w-full">
                    <div className="label"><span className="label-text">Preferred Name</span></div>
                    <input
                      type="text"
                      className="input input-bordered w-full"
                      value={profileData.preferredName}
                      onChange={(event) => setProfileData((prev) => ({ ...prev, preferredName: event.target.value }))}
                    />
                  </label>

                  <label className="form-control w-full">
                    <div className="label"><span className="label-text">Company Title</span></div>
                    <input
                      type="text"
                      className="input input-bordered w-full"
                      value={profileData.companyTitle}
                      onChange={(event) => setProfileData((prev) => ({ ...prev, companyTitle: event.target.value }))}
                    />
                  </label>

                  <label className="form-control w-full md:col-span-2">
                    <div className="label"><span className="label-text">Nationality</span></div>
                    <input
                      type="text"
                      className="input input-bordered w-full"
                      value={profileData.nationality}
                      onChange={(event) => setProfileData((prev) => ({ ...prev, nationality: event.target.value }))}
                    />
                  </label>
                </div>

                {profileError ? (
                  <div className="alert alert-error"><span>{profileError}</span></div>
                ) : null}

                <div className="flex gap-2 justify-between flex-wrap">
                  <Link href={buildProfileTabHref(1)} className="btn btn-sm btn-outline">Back to Username</Link>
                  <button type="button" className="btn btn-sm btn-primary" disabled={isSavingProfile} onClick={saveProfile}>
                    {isSavingProfile ? "Saving..." : "Continue to Media"}
                  </button>
                </div>
              </div>
            </div>
          ) : null}

          {currentStep === 3 ? (
            <UserProfileMediaStep
              sessionUser={sessionUser}
              userId={userId}
              userProfilePrefix={`platformpics/user/${userId}/profile/`}
              userCoverPrefix={`platformpics/user/${userId}/cover/`}
              backHref={buildProfileTabHref(2)}
              continueHref={buildProfileTabHref(4)}
            />
          ) : null}

          {currentStep === 4 ? (
            <UserPrivateContactsStep
              userId={userId}
              loadingContacts={loadingContacts}
              addressContacts={addressContacts}
              emailContacts={emailContacts}
              phoneContacts={phoneContacts}
              socialContacts={socialContacts}
              urlContacts={urlContacts}
              refreshContacts={refreshUserContacts}
              contactError={contactError}
              setContactError={setContactError}
              totalContacts={totalContacts}
              backHref={buildProfileTabHref(3)}
              continueHref="/portal/user"
            />
          ) : null}
        </div>
      </div>
    </>
  )
}
