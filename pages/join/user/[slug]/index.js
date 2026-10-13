import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import JoinPageShell from "@/components/join/common/join-page-shell";
import UserPrivateContactsStep from "@/components/forms/onboarding/users/UserPrivateContactsStep";
import UserProfileMediaStep from "@/components/forms/onboarding/users/UserProfileMediaStep";
import UserCoreFields from "@/components/join/workflows/user/user-core-fields";
import UserPrivacyFields from "@/components/join/workflows/user/user-privacy-fields";
import ContentPreferences from "@/pages/portal/user/preferences/content";

function getRequestOrigin(req) {
  const forwardedProto = String(req?.headers?.["x-forwarded-proto"] || "").split(",")[0].trim();
  const forwardedHost = String(req?.headers?.["x-forwarded-host"] || "").trim();
  const host = forwardedHost || String(req?.headers?.host || "").trim();

  if (!host) {
    return null;
  }

  const protocol = forwardedProto || (process.env.NODE_ENV === "development" ? "http" : "https");
  return `${protocol}://${host}`;
}

async function getSessionFromRequest(context) {
  const origin = getRequestOrigin(context?.req);
  if (!origin) {
    return null;
  }

  try {
    const response = await fetch(`${origin}/api/auth/session`, {
      headers: {
        cookie: context?.req?.headers?.cookie || "",
      },
    });

    if (!response.ok) {
      return null;
    }

    return await response.json();
  } catch {
    return null;
  }
}

function getWizardStep(rawStep) {
  const parsed = Number(rawStep || 2);
  if (parsed >= 2 && parsed <= 7) {
    return parsed;
  }

  return 2;
}

function buildUserJoinHref(step, username, userId) {
  const normalizedUsername = String(username || "").trim().toLowerCase();
  if (!normalizedUsername) {
    return "/join/user?step=2";
  }

  const idSegment = userId ? `&id=${encodeURIComponent(String(userId))}` : "";
  return `/join/user/${encodeURIComponent(normalizedUsername)}?step=${step}${idSegment}`;
}

function normalizeDateForInput(value) {
  const raw = String(value || "").trim();
  if (!raw) {
    return "";
  }

  if (raw.includes("T")) {
    return raw.slice(0, 10);
  }

  return raw;
}

function normalizeOptionalText(value) {
  const trimmed = String(value || "").trim();
  return trimmed ? trimmed : null;
}

function normalizeDateForApi(value) {
  const trimmed = String(value || "").trim();
  if (!trimmed) {
    return null;
  }

  return `${trimmed}T00:00:00.000Z`;
}

function mapUserToFormState(userData) {
  return {
    userID: Number(userData?.userID || userData?.UserID || 0),
    emailOne: String(userData?.emailOne || userData?.EmailOne || ""),
    emailTwo: String(userData?.emailTwo || userData?.EmailTwo || ""),
    firstName: String(userData?.firstName || userData?.FirstName || ""),
    famName: String(userData?.famName || userData?.FamName || ""),
    username: String(userData?.username || userData?.Username || "").toLowerCase(),
    artistInGoodStanding: Boolean(userData?.artistInGoodStanding || userData?.ArtistInGoodStanding),
    bannedDate: normalizeDateForInput(userData?.bannedDate || userData?.BannedDate),
    bannedReason: String(userData?.bannedReason || userData?.BannedReason || ""),
    birthDate: normalizeDateForInput(userData?.birthDate || userData?.BirthDate),
    boardValidated: Boolean(userData?.boardValidated || userData?.BoardValidated),
    companyName: String(userData?.companyName || userData?.CompanyName || ""),
    companyTitle: String(userData?.companyTitle || userData?.CompanyTitle || ""),
    joined: normalizeDateForInput(userData?.joined || userData?.Joined),
    membershipBanned: Boolean(userData?.membershipBanned || userData?.MembershipBanned),
    moderator: Boolean(userData?.moderator || userData?.Moderator),
    nationality: String(userData?.nationality || userData?.Nationality || ""),
    preferredName: String(userData?.preferredName || userData?.PreferredName || ""),
    hideFromPublic: Boolean(userData?.hideFromPublic || userData?.HideFromPublic),
    isPublished: Boolean(userData?.isPublished || userData?.IsPublished),
    isModerationBlocked: Boolean(userData?.isModerationBlocked || userData?.IsModerationBlocked),
    deathDate: normalizeDateForInput(userData?.deathDate || userData?.DeathDate),
    gender: String(userData?.gender || userData?.Gender || ""),
    galleryID: userData?.galleryID ?? userData?.GalleryID ?? null,
    coverPicID: userData?.coverPicID ?? userData?.CoverPicID ?? null,
    profilePicID: userData?.profilePicID ?? userData?.ProfilePicID ?? null,
  };
}

function mapPreferenceToFormState(preference) {
  return {
    userPreferenceID: Number(preference?.userPreferenceID || preference?.UserPreferenceID || 0),
    userID: Number(preference?.userID || preference?.UserID || 0),
    metricOrImperial: String(preference?.metricOrImperial || preference?.MetricOrImperial || "Metric"),
    themePreference: String(preference?.themePreference || preference?.ThemePreference || "Light"),
  };
}
function mapPrivacyToFormState(privacy) {
  return {
    userPrivacyID: Number(privacy?.userPrivacyID || privacy?.UserPrivacyID || 0),
    userID: Number(privacy?.userID || privacy?.UserID || 0),
    hideProfileFromPublic: Boolean(privacy?.hideProfileFromPublic || privacy?.HideProfileFromPublic),
    hidingFrom_NameAndDescription: String(privacy?.hidingFrom_NameAndDescription || privacy?.HidingFrom_NameAndDescription || ""),
    hidingFromAbuser: Boolean(privacy?.hidingFromAbuser || privacy?.HidingFromAbuser),
  };
}

export default function JoinUserSlugPage({
  currentStep,
  userId,
  routeUsername,
  sessionUser,
  userData,
  userPreference,
  userPrivacy,
  userSettings,
}) {
  const [userForm, setUserForm] = useState(mapUserToFormState(userData || {}));
  const [privacyForm, setPrivacyForm] = useState(mapPrivacyToFormState(userPrivacy || {}));
  const [addressContacts, setAddressContacts] = useState([]);
  const [emailContacts, setEmailContacts] = useState([]);
  const [phoneContacts, setPhoneContacts] = useState([]);
  const [socialContacts, setSocialContacts] = useState([]);
  const [urlContacts, setUrlContacts] = useState([]);
  const [loadingContacts, setLoadingContacts] = useState(false);
  const [contactError, setContactError] = useState("");

  const [profileError, setProfileError] = useState("");
  const [privacyError, setPrivacyError] = useState("");
  const [publishError, setPublishError] = useState("");

  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [isSavingPrivacy, setIsSavingPrivacy] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);

  const resolvedUserId = Number(userId || userForm.userID || 0);
  const resolvedUsername = String(routeUsername || userForm.username || "").trim().toLowerCase();
  const userContentPrefix = useMemo(() => (
    resolvedUserId > 0 ? `platformpics/user/${resolvedUserId}/` : ""
  ), [resolvedUserId]);
  const userProfilePrefix = useMemo(() => (
    userContentPrefix ? `${userContentPrefix}profile/` : ""
  ), [userContentPrefix]);
  const userCoverPrefix = useMemo(() => (
    userContentPrefix ? `${userContentPrefix}cover/` : ""
  ), [userContentPrefix]);

  const totalUserContacts = addressContacts.length + emailContacts.length + phoneContacts.length + socialContacts.length + urlContacts.length;

  const stepCompletionMap = useMemo(() => ({
    2: Boolean(userForm.emailOne && userForm.username),
    3: totalUserContacts > 0,
    4: Boolean(privacyForm.userPrivacyID),
    5: Boolean(userForm.profilePicID || userForm.coverPicID),
    6: true,
    7: Boolean(userForm.isPublished),
  }), [privacyForm.userPrivacyID, totalUserContacts, userForm.coverPicID, userForm.emailOne, userForm.isPublished, userForm.profilePicID, userForm.username]);

  const percentComplete = useMemo(() => {
    const steps = [2, 3, 4, 5, 6, 7];
    const completed = steps.filter((step) => Boolean(stepCompletionMap[step])).length;
    return Math.round((completed / steps.length) * 100);
  }, [stepCompletionMap]);
  const refreshUserContacts = async () => {
    if (!resolvedUserId) {
      return;
    }

    setLoadingContacts(true);
    try {
      const response = await fetch(`/api/contact/user/${resolvedUserId}?includePrivate=true`);
      if (!response.ok) {
        return;
      }

      const data = await response.json();
      const rows = Array.isArray(data?.contacts) ? data.contacts : [];
      const isPrivateRow = (contact) => contact?.isPrivate === true || String(contact?.isPrivate || "").trim().toLowerCase() === "true";
      const visibleRows = rows.filter((contact) => isPrivateRow(contact));

      setAddressContacts(visibleRows.filter((contact) => String(contact?.contactType || "").toLowerCase() === "address"));
      setEmailContacts(visibleRows.filter((contact) => String(contact?.contactType || "").toLowerCase() === "email"));
      setPhoneContacts(visibleRows.filter((contact) => String(contact?.contactType || "").toLowerCase() === "phone"));
      setUrlContacts(visibleRows.filter((contact) => String(contact?.contactType || "").toLowerCase() === "url" && String(contact?.category || "").toLowerCase() === "website"));
      setSocialContacts(visibleRows.filter((contact) => String(contact?.contactType || "").toLowerCase() === "url" && String(contact?.category || "").toLowerCase() !== "website"));
    } catch {
      // no-op
    } finally {
      setLoadingContacts(false);
    }
  };

  useEffect(() => {
    if (currentStep !== 3 || !resolvedUserId) {
      return;
    }

    refreshUserContacts();
  }, [currentStep, resolvedUserId]);


  const pageMetaData = {
    title: "Join User",
    description: "Complete user profile, preferences, and privacy setup.",
    keywords: "join, user, onboarding",
    robots: "noindex, nofollow",
    og: {
      title: "Join User",
      description: "Complete user profile, preferences, and privacy setup.",
    },
  };

  const saveProfile = async () => {
    if (!resolvedUserId) {
      setProfileError("Missing user ID. Return to /join/user and reserve your username first.");
      return;
    }

    const requiredEmail = String(userForm.emailOne || "").trim();
    if (!requiredEmail) {
      setProfileError("Primary email is required.");
      return;
    }

    const requiredUsername = String(userForm.username || "").trim().toLowerCase();
    if (!requiredUsername) {
      setProfileError("Username is required.");
      return;
    }

    setProfileError("");
    setIsSavingProfile(true);

    try {
      const payload = {
        userID: resolvedUserId,
        emailOne: requiredEmail,
        emailTwo: normalizeOptionalText(userForm.emailTwo),
        firstName: normalizeOptionalText(userForm.firstName),
        famName: normalizeOptionalText(userForm.famName),
        username: requiredUsername,
        artistInGoodStanding: Boolean(userForm.artistInGoodStanding),
        bannedDate: normalizeDateForApi(userForm.bannedDate),
        bannedReason: normalizeOptionalText(userForm.bannedReason),
        birthDate: normalizeDateForApi(userForm.birthDate),
        boardValidated: Boolean(userForm.boardValidated),
        companyName: normalizeOptionalText(userForm.companyName),
        companyTitle: normalizeOptionalText(userForm.companyTitle),
        joined: normalizeDateForApi(userForm.joined) || new Date().toISOString(),
        membershipBanned: Boolean(userForm.membershipBanned),
        moderator: Boolean(userForm.moderator),
        nationality: normalizeOptionalText(userForm.nationality),
        preferredName: normalizeOptionalText(userForm.preferredName),
        hideFromPublic: Boolean(userForm.hideFromPublic),
        isPublished: Boolean(userForm.isPublished),
        isModerationBlocked: Boolean(userForm.isModerationBlocked),
        deathDate: normalizeDateForApi(userForm.deathDate),
        gender: normalizeOptionalText(userForm.gender),
        galleryID: userForm.galleryID,
        coverPicID: userForm.coverPicID,
        profilePicID: userForm.profilePicID,
      };

      const response = await fetch(`/api/user-details/${resolvedUserId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const message = await response.text();
        setProfileError(message || `Unable to save user profile (${response.status}).`);
        return;
      }

      window.location.href = buildUserJoinHref(3, resolvedUsername, resolvedUserId);
    } catch (error) {
      setProfileError(error?.message || "Unable to save user profile.");
    } finally {
      setIsSavingProfile(false);
    }
  };

  const savePrivacy = async () => {
    if (!privacyForm.userPrivacyID) {
      setPrivacyError("User privacy row is missing. Please reload this page.");
      return;
    }

    setPrivacyError("");
    setIsSavingPrivacy(true);

    try {
      const payload = {
        userPrivacyID: privacyForm.userPrivacyID,
        hideProfileFromPublic: Boolean(privacyForm.hideProfileFromPublic),
        hidingFrom_NameAndDescription: String(privacyForm.hidingFrom_NameAndDescription || "").trim(),
        hidingFromAbuser: Boolean(privacyForm.hidingFromAbuser),
        userID: privacyForm.userID || resolvedUserId,
      };

      const response = await fetch(`/api/userprivacy/${privacyForm.userPrivacyID}?viewerUserId=${encodeURIComponent(String(resolvedUserId))}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const message = await response.text();
        setPrivacyError(message || `Unable to save user privacy (${response.status}).`);
        return;
      }

      window.location.href = buildUserJoinHref(5, resolvedUsername, resolvedUserId);
    } catch (error) {
      setPrivacyError(error?.message || "Unable to save user privacy.");
    } finally {
      setIsSavingPrivacy(false);
    }
  };

  const publishUser = async () => {
    if (!resolvedUserId) {
      setPublishError("Missing user ID. Return to /join/user and reserve your username first.");
      return;
    }

    setPublishError("");
    setIsPublishing(true);

    try {
      const payload = {
        userID: resolvedUserId,
        emailOne: String(userForm.emailOne || "").trim(),
        emailTwo: normalizeOptionalText(userForm.emailTwo),
        firstName: normalizeOptionalText(userForm.firstName),
        famName: normalizeOptionalText(userForm.famName),
        username: String(userForm.username || "").trim().toLowerCase(),
        artistInGoodStanding: Boolean(userForm.artistInGoodStanding),
        bannedDate: normalizeDateForApi(userForm.bannedDate),
        bannedReason: normalizeOptionalText(userForm.bannedReason),
        birthDate: normalizeDateForApi(userForm.birthDate),
        boardValidated: Boolean(userForm.boardValidated),
        companyName: normalizeOptionalText(userForm.companyName),
        companyTitle: normalizeOptionalText(userForm.companyTitle),
        joined: normalizeDateForApi(userForm.joined) || new Date().toISOString(),
        membershipBanned: Boolean(userForm.membershipBanned),
        moderator: Boolean(userForm.moderator),
        nationality: normalizeOptionalText(userForm.nationality),
        preferredName: normalizeOptionalText(userForm.preferredName),
        hideFromPublic: Boolean(userForm.hideFromPublic),
        isPublished: true,
        isModerationBlocked: Boolean(userForm.isModerationBlocked),
        deathDate: normalizeDateForApi(userForm.deathDate),
        gender: normalizeOptionalText(userForm.gender),
        galleryID: userForm.galleryID,
        coverPicID: userForm.coverPicID,
        profilePicID: userForm.profilePicID,
      };

      const response = await fetch(`/api/user-details/${resolvedUserId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const message = await response.text();
        setPublishError(message || `Unable to publish user profile (${response.status}).`);
        return;
      }

      setUserForm((previous) => ({ ...previous, isPublished: true }));
      window.location.href = "/user";
    } catch (error) {
      setPublishError(error?.message || "Unable to publish user profile.");
    } finally {
      setIsPublishing(false);
    }
  };

  const missingBaseData = !resolvedUserId || !resolvedUsername;

  useMemo(() => {
    return null;
  }, []);

  if (!missingBaseData && !loadingContacts && resolvedUserId > 0 && totalUserContacts === 0) {
    // no-op placeholder for stable render ordering
  }

  return (
    <JoinPageShell
      title="Join as a User"
      description="Complete profile, preference, and privacy setup before publishing your account."
      canonicalSlug="join/user"
      metadata={pageMetaData}
      steps={[
        {
          href: buildUserJoinHref(2, resolvedUsername, resolvedUserId),
          label: "Profile",
          isActive: currentStep === 2,
          isWarning: currentStep !== 2 && !stepCompletionMap[2],
        },
        {
          href: buildUserJoinHref(3, resolvedUsername, resolvedUserId),
          label: "Contacts",
          isActive: currentStep === 3,
          isWarning: currentStep !== 3 && !stepCompletionMap[3],
        },
        {
          href: buildUserJoinHref(4, resolvedUsername, resolvedUserId),
          label: "Privacy",
          isActive: currentStep === 4,
          isWarning: currentStep !== 4 && !stepCompletionMap[4],
        },
        {
          href: buildUserJoinHref(5, resolvedUsername, resolvedUserId),
          label: "Profile Media",
          isActive: currentStep === 5,
          isWarning: currentStep !== 5 && !stepCompletionMap[5],
        },
        {
          href: buildUserJoinHref(6, resolvedUsername, resolvedUserId),
          label: "Content",
          isActive: currentStep === 6,
          isWarning: currentStep !== 6 && !stepCompletionMap[6],
        },
        {
          href: buildUserJoinHref(7, resolvedUsername, resolvedUserId),
          label: "Review",
          isActive: currentStep === 7,
          isWarning: currentStep !== 7 && !stepCompletionMap[7],
        },
      ]}
      badge={resolvedUserId ? `User ID: ${resolvedUserId}` : null}
      progress={percentComplete}
    >
      {missingBaseData ? (
        <div className="alert alert-warning">
          <span>Could not resolve user slug or user ID. Start at /join/user and reserve your username first.</span>
        </div>
      ) : null}

      {!missingBaseData && currentStep === 2 ? (
        <div className="card bg-base-100 shadow border border-base-300">
          <div className="card-body gap-4">
            <div>
              <h2 className="card-title">Step 2: Profile Fields</h2>
              <p className="text-sm text-base-content/70">Set the public and personal details for your user profile. Username and registered email stay locked after reservation.</p>
            </div>

            <UserCoreFields formState={userForm} onChange={setUserForm} />

            {profileError ? (
              <div className="alert alert-error">
                <span>{profileError}</span>
              </div>
            ) : null}

            <div className="flex gap-2 justify-between flex-wrap">
              <Link href="/join/user?step=2" className="btn btn-sm btn-outline">Back to Username</Link>
              <button type="button" className="btn btn-sm btn-primary" onClick={saveProfile} disabled={isSavingProfile}>
                {isSavingProfile ? "Saving..." : "Continue to Preferences"}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {!missingBaseData && currentStep === 3 ? (
        <UserPrivateContactsStep
          userId={resolvedUserId}
          loadingContacts={loadingContacts}
          addressContacts={addressContacts}
          emailContacts={emailContacts}
          phoneContacts={phoneContacts}
          socialContacts={socialContacts}
          urlContacts={urlContacts}
          refreshContacts={refreshUserContacts}
          contactError={contactError}
          setContactError={setContactError}
          totalContacts={totalUserContacts}
          backHref={buildUserJoinHref(2, resolvedUsername, resolvedUserId)}
          continueHref={buildUserJoinHref(4, resolvedUsername, resolvedUserId)}
        />
      ) : null}

      {!missingBaseData && currentStep === 4 ? (
        <div className="card bg-base-100 shadow border border-base-300">
          <div className="card-body gap-4">
            <div>
              <h2 className="card-title">Step 4: Privacy Settings</h2>
              <p className="text-sm text-base-content/70">Configure profile visibility and safety settings.</p>
            </div>

            <UserPrivacyFields privacy={privacyForm} onChange={setPrivacyForm} />

            {privacyError ? (
              <div className="alert alert-error">
                <span>{privacyError}</span>
              </div>
            ) : null}

            <div className="flex gap-2 justify-between flex-wrap">
              <Link href={buildUserJoinHref(3, resolvedUsername, resolvedUserId)} className="btn btn-sm btn-outline">Back to Contacts</Link>
              <button type="button" className="btn btn-sm btn-primary" onClick={savePrivacy} disabled={isSavingPrivacy}>
                {isSavingPrivacy ? "Saving..." : "Continue to Profile Media"}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {!missingBaseData && currentStep === 5 ? (
        <UserProfileMediaStep
          sessionUser={sessionUser}
          userId={resolvedUserId}
          userProfilePrefix={userProfilePrefix}
          userCoverPrefix={userCoverPrefix}
          backHref={buildUserJoinHref(4, resolvedUsername, resolvedUserId)}
          continueHref={buildUserJoinHref(6, resolvedUsername, resolvedUserId)}
        />
      ) : null}

      {!missingBaseData && currentStep === 6 ? (
        <div className="card bg-base-100 shadow border border-base-300">
          <div className="card-body gap-4">
            <div>
              <h2 className="card-title">Step 6: Content Preferences</h2>
              <p className="text-sm text-base-content/70">Set your content moderation and visibility preferences here, then continue to review.</p>
            </div>

            <ContentPreferences embedded />

            <div className="flex gap-2 justify-between flex-wrap">
              <Link href={buildUserJoinHref(5, resolvedUsername, resolvedUserId)} className="btn btn-sm btn-outline">Back to Profile Media</Link>
              <button type="button" className="btn btn-sm btn-primary" onClick={() => { window.location.href = buildUserJoinHref(7, resolvedUsername, resolvedUserId); }}>
                Continue to Review
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {!missingBaseData && currentStep === 7 ? (
        <div className="card bg-base-100 shadow border border-base-300">
          <div className="card-body gap-4">
            <div>
              <h2 className="card-title">Step 7: Review and Publish</h2>
              <p className="text-sm text-base-content/70">Review your setup and publish when ready.</p>
            </div>

            <div className="rounded-box border border-base-300 bg-base-200/40 p-4 space-y-2 text-sm">
              <div><span className="font-semibold">Username:</span> {resolvedUsername}</div>
              <div><span className="font-semibold">Primary email:</span> {userForm.emailOne || "Missing"}</div>
              <div><span className="font-semibold">Preferred name:</span> {userForm.preferredName || "Not set"}</div>
              <div><span className="font-semibold">Profile picture ID:</span> {userForm.profilePicID || "Not selected"}</div>
              <div><span className="font-semibold">Cover picture ID:</span> {userForm.coverPicID || "Not selected"}</div>
              <div><span className="font-semibold">Saved contacts:</span> {totalUserContacts}</div>
              <div><span className="font-semibold">Hide profile from public:</span> {privacyForm.hideProfileFromPublic ? "Yes" : "No"}</div>
              <div><span className="font-semibold">Has settings row:</span> {userSettings ? "Yes" : "No"}</div>
              <div><span className="font-semibold">Published:</span> {userForm.isPublished ? "Yes" : "No"}</div>
            </div>

            <div className="rounded-box border border-base-300 bg-base-200/40 p-4">
              <h3 className="font-semibold mb-2">Step Completion</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm">
                {[2, 3, 4, 5, 6].map((step) => {
                  const labels = {
                    2: "Profile",
                    3: "Contacts",
                    4: "Privacy",
                    5: "Profile Media",
                    6: "Content",
                  };
                  const done = Boolean(stepCompletionMap[step]);
                  return (
                    <div key={step} className="flex items-center justify-between rounded border border-base-300 px-2 py-1">
                      <span>{labels[step]}</span>
                      <span className={`badge badge-xs ${done ? "badge-success" : "badge-neutral"}`}>{done ? "Done" : "Pending"}</span>
                    </div>
                  );
                })}
              </div>
            </div>

            {publishError ? (
              <div className="alert alert-error">
                <span>{publishError}</span>
              </div>
            ) : null}

            <div className="flex gap-2 justify-between flex-wrap">
              <Link href={buildUserJoinHref(6, resolvedUsername, resolvedUserId)} className="btn btn-sm btn-outline">Back to Content Preferences</Link>
              <button
                type="button"
                className="btn btn-sm btn-success"
                onClick={publishUser}
                disabled={isPublishing || userForm.isPublished}
              >
                {isPublishing ? "Publishing..." : userForm.isPublished ? "Published" : "Publish User"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </JoinPageShell>
  );
}

export async function getUserJoinServerProps(context, routeSlug = null) {
  const session = await getSessionFromRequest(context);

  if (!session?.user?.id) {
    return {
      redirect: {
        destination: `/api/auth/signin?callbackUrl=${encodeURIComponent(context.resolvedUrl || "/join/user")}`,
        permanent: false,
      },
    };
  }

  const currentStep = getWizardStep(context.query?.step);
  const viewerUserId = Number(session?.user?.id || 0);

  let userId = Number(context.query?.id || 0);
  let userData = null;
  let userPreference = null;
  let userPrivacy = null;
  let userSettings = null;

  const normalizedRouteSlug = String(routeSlug || "").trim().toLowerCase();

  if (normalizedRouteSlug) {
    try {
      const response = viewerUserId > 0
        ? await fetch(`/api/user-details/by-username/${encodeURIComponent(normalizedRouteSlug)}/private?viewerUserId=${viewerUserId}`)
        : await fetch(`/api/user-details/by-username/${encodeURIComponent(normalizedRouteSlug)}`);
      if (response.ok) {
        userData = await response.json();
        userId = Number(userData?.userID || userData?.UserID || 0);
      }
    } catch {
      // no-op
    }
  }

  if (!userData && userId > 0) {
    try {
      const response = viewerUserId > 0
        ? await fetch(`/api/user-details/${userId}/private?viewerUserId=${viewerUserId}`)
        : await fetch(`/api/user-details/${userId}`);
      if (response.ok) {
        userData = await response.json();
      }
    } catch {
      // no-op
    }
  }

  if (userId > 0) {
    try {
      const contactsResponse = await fetch(`/api/contact/user/${userId}?includePrivate=true`);
      if (contactsResponse.ok) {
        await contactsResponse.json();
      }
    } catch {
      // no-op
    }

    try {
      const preferenceResponse = await fetch(`/api/userpreference/by-user/${userId}`);
      if (preferenceResponse.ok) {
        userPreference = await preferenceResponse.json();
      }
    } catch {
      // no-op
    }

    try {
      const privacyResponse = await fetch(`/api/userprivacy/by-user/${userId}?viewerUserId=${encodeURIComponent(String(viewerUserId || userId))}`);
      if (privacyResponse.ok) {
        userPrivacy = await privacyResponse.json();
      }
    } catch {
      // no-op
    }

    try {
      const settingsResponse = await fetch(`/api/usersettings/by-user/${userId}`);
      if (settingsResponse.ok) {
        userSettings = await settingsResponse.json();
      }
    } catch {
      // no-op
    }
  }

  return {
    props: {
      sessionUser: session?.user || null,
      currentStep,
      userId: userId > 0 ? userId : null,
      routeUsername: normalizedRouteSlug,
      userData,
      userPreference,
      userPrivacy,
      userSettings,
    },
  };
}

export async function getServerSideProps(context) {
  const routeSlug = String(context?.params?.slug || "").trim().toLowerCase();
  return getUserJoinServerProps(context, routeSlug);
}
