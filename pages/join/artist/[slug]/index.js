import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";

import TagSEO from "@/components/TagSEO";
import ProfileForm from "@/components/forms/onboarding/artists/ProfileForm";
import BusinessDetailsForm from "@/components/forms/onboarding/artists/BusinessDetailsForm";
import PrivateContactsForm from "@/components/forms/onboarding/artists/PrivateContactsForm";
import MediaUploadForm from "@/components/forms/onboarding/MediaUploadForm";
import PublicContactsForm from "@/components/forms/onboarding/artists/PublicContactsForm";
import ReviewAndPublishForm from "@/components/forms/onboarding/ReviewAndPublishForm";
import {
  getArtistRegistrationProgress,
  setArtistRegistrationProgress,
  ARTIST_REGISTRATION_STEPS,
  markWorkflowStepComplete,
} from "@/utils/onboarding/artistWorkflow";

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
  const parsed = Number(rawStep || 1);
  if (parsed >= 1 && parsed <= 8) {
    return parsed;
  }
  return 1;
}

function buildArtistJoinHref(step, slug) {
  const normalizedSlug = String(slug || "").trim().toLowerCase();
  if (normalizedSlug) {
    return `/join/artist/${encodeURIComponent(normalizedSlug)}?step=${step}`;
  }
  return `/join/artist?step=${step}`;
}

function extractPlainText(value) {
  return String(value || "")
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function validateSeoTags(value) {
  const raw = String(value || "").trim();
  if (!raw) {
    return { isValid: true, normalized: "" };
  }

  if (!raw.includes(",")) {
    return {
      isValid: false,
      message: "SEO tags must be comma-separated (example: abstract art, mixed media, surrealism).",
    };
  }

  const segments = raw.split(",").map((segment) => segment.trim());
  if (segments.some((segment) => !segment)) {
    return {
      isValid: false,
      message: "SEO tags cannot contain empty values. Remove extra commas and keep one tag per comma.",
    };
  }

  return {
    isValid: true,
    normalized: segments.join(", "),
  };
}

export default function JoinArtistIndexPage({ sessionUser, currentStep, artistId, artistData, pictures }) {
  const initialProgress = typeof window !== "undefined" ? (getArtistRegistrationProgress?.() || {}) : {};
  const initialArtistSlug = String(artistData?.path || artistData?.Path || initialProgress.slug || "").trim().toLowerCase();
  const initialArtistTitle = String(artistData?.title || artistData?.Title || "").trim();
  const initialArtistByline = String(artistData?.byline || artistData?.Byline || "").trim();
  const initialArtistBiography = String(artistData?.biography || artistData?.Biography || "").trim();
  const initialArtistStatement = String(artistData?.statement || artistData?.Statement || "").trim();
  const initialArtistSeoTags = String(artistData?.seoTags || artistData?.SEOTags || "").trim();
  const initialArtistCity = String(artistData?.city || artistData?.City || "").trim();
  const initialArtistCountry = String(artistData?.country || artistData?.Country || "").trim();
  const initialArtistRegion = String(artistData?.stateOrProvince || artistData?.StateOrProvince || "").trim();
  const initialArtistZipCode = String(artistData?.zipCode || artistData?.ZipCode || artistData?.postalCode || artistData?.PostalCode || "").trim();
  const initialArtistBusinessEntityType = String(artistData?.businessEntityType || artistData?.BusinessEntityType || "").trim();
  const initialArtistIncorporatedYear = String(artistData?.incorporatedYear || artistData?.IncorporatedYear || "").trim();
  const initialArtistIncorporatedFlag =
    typeof artistData?.isFormallyIncorporated === "boolean"
      ? artistData.isFormallyIncorporated
      : typeof artistData?.IsFormallyIncorporated === "boolean"
        ? artistData.IsFormallyIncorporated
        : null;
  const [resolvedArtistId] = useState(artistId || initialProgress.entityId || null);
  const [resolvedArtistSlug] = useState(initialArtistSlug || "");
        const [profileTitle, setProfileTitle] = useState(initialProgress.title || initialArtistTitle || "");
        const [profileByline, setProfileByline] = useState(initialArtistByline || "");
        const [profileBiography, setProfileBiography] = useState(initialArtistBiography || "");
        const [profileStatement, setProfileStatement] = useState(initialArtistStatement || "");
        const [profileSeoTags, setProfileSeoTags] = useState(initialArtistSeoTags || "");
        const [city, setCity] = useState(initialProgress.city || initialArtistCity || "");
        const [stateOrProvince, setStateOrProvince] = useState(initialProgress.stateOrProvince || initialArtistRegion || "");
        const [zipCode, setZipCode] = useState(initialProgress.zipCode || initialArtistZipCode || "");
        const [country, setCountry] = useState(initialProgress.country || initialArtistCountry || "USA");
  const [businessEntityType, setBusinessEntityType] = useState(initialProgress.businessEntityType || initialArtistBusinessEntityType || "");
  const [incorporationStatus, setIncorporationStatus] = useState(
    initialProgress.incorporationStatus ||
    (initialArtistIncorporatedFlag === null ? "" : initialArtistIncorporatedFlag ? "true" : "false") ||
    ""
  );
  const [incorporatedYear, setIncorporatedYear] = useState(initialProgress.incorporatedYear || initialArtistIncorporatedYear || "");
  const [profileFormError, setProfileFormError] = useState("");
  const [isSavingProfileForm, setIsSavingProfileForm] = useState(false);
  const [profileFiles, setProfileFiles] = useState([]);
  const [coverFiles, setCoverFiles] = useState([]);
  const [blobBackedMediaRoot, setBlobBackedMediaRoot] = useState("");
  const [mediaFeedback, setMediaFeedback] = useState({ type: "", message: "" });
  const [isSavingMedia, setIsSavingMedia] = useState(false);

  const [contactsTab, setContactsTab] = useState("public-address");
  const [publicSocialContacts, setPublicSocialContacts] = useState([]);
  const [publicUrlContacts, setPublicUrlContacts] = useState([]);
  const [publicEmailContacts, setPublicEmailContacts] = useState([]);
  const [publicPhoneContacts, setPublicPhoneContacts] = useState([]);
  const [publicAddressContacts, setPublicAddressContacts] = useState([]);
  const [privateEmailContacts, setPrivateEmailContacts] = useState([]);
  const [privatePhoneContacts, setPrivatePhoneContacts] = useState([]);
  const [privateAddressContacts, setPrivateAddressContacts] = useState([]);
  const [privateUrlContacts, setPrivateUrlContacts] = useState([]);
  const [loadingContacts, setLoadingContacts] = useState(false);
  const [privateContactRequirementError, setPrivateContactRequirementError] = useState("");

  const [workflowSummary, setWorkflowSummary] = useState(null);
  const [loadingWorkflowSummary, setLoadingWorkflowSummary] = useState(false);
  const [isPublishingProfile, setIsPublishingProfile] = useState(false);
  const [publishFeedback, setPublishFeedback] = useState("");

  const workflowCompletionMap = useMemo(() => {
    const rows = Array.isArray(workflowSummary?.steps) ? workflowSummary.steps : [];
    return rows.reduce((acc, step) => {
      const key = String(step?.stepKey || "").trim().toLowerCase();
      if (key) {
        acc[key] = Boolean(step?.isCompleted);
      }
      return acc;
    }, {});
  }, [workflowSummary]);

  const businessAddressContacts = useMemo(
    () => privateAddressContacts,
    [privateAddressContacts]
  );

  const businessPhoneContacts = useMemo(
    () => privatePhoneContacts,
    [privatePhoneContacts]
  );

  const businessEmailContacts = useMemo(
    () => privateEmailContacts,
    [privateEmailContacts]
  );

  const businessUrlContacts = useMemo(
    () => privateUrlContacts,
    [privateUrlContacts]
  );

  const businessContactCardComplete = useMemo(
    () => businessAddressContacts.length > 0 && businessPhoneContacts.length > 0 && businessEmailContacts.length > 0,
    [businessAddressContacts.length, businessPhoneContacts.length, businessEmailContacts.length]
  );

  const stepCompletionMap = useMemo(() => {
    const hasProfileDraft = Boolean(extractPlainText(profileTitle)) && Boolean(extractPlainText(profileByline) || extractPlainText(profileBiography));
    const hasBusinessDetails = Boolean(
      String(city || "").trim() &&
      String(stateOrProvince || "").trim() &&
      String(zipCode || "").trim() &&
      String(country || "").trim() &&
      String(businessEntityType || "").trim() &&
      String(incorporationStatus || "").trim()
    );
    const hasBusinessContacts = businessContactCardComplete || Boolean(workflowCompletionMap.private_contacts);
    const hasSelectedMedia = Boolean(
      artistData?.profilePicID ||
      artistData?.ProfilePicID ||
      artistData?.coverPicID ||
      artistData?.CoverPicID
    );
    const isPublished = Boolean(workflowSummary?.isPublished || workflowSummary?.IsPublished || artistData?.isPublished || artistData?.IsPublished);

    return {
      3: hasProfileDraft || Boolean(workflowCompletionMap.added_bio),
      4: hasBusinessDetails,
      5: hasSelectedMedia || Boolean(workflowCompletionMap.uploaded_photos),
      6: hasBusinessContacts,
      7: true,
      8: isPublished,
    };
  }, [
    artistData?.CoverPicID,
    artistData?.IsPublished,
    artistData?.ProfilePicID,
    artistData?.coverPicID,
    artistData?.isPublished,
    artistData?.profilePicID,
    businessEntityType,
    businessContactCardComplete,
    city,
    country,
    incorporationStatus,
    profileBiography,
    profileByline,
    profileTitle,
    stateOrProvince,
    workflowCompletionMap,
    workflowSummary?.IsPublished,
    workflowSummary?.isPublished,
    zipCode,
  ]);

  const postSlugPercentComplete = useMemo(() => {
    const postSlugSteps = [3, 4, 5, 6, 7];
    const completedCount = postSlugSteps.filter((step) => Boolean(stepCompletionMap?.[step])).length;
    return Math.round((completedCount / postSlugSteps.length) * 100);
  }, [stepCompletionMap]);

  const hasLiveArtist = Boolean(resolvedArtistId);
  const activeStep = hasLiveArtist ? Math.min(Math.max(currentStep, 3), 8) : 3;
  const showMissingIndicators = Boolean(resolvedArtistId) && !loadingWorkflowSummary;

  /**
   * Helper to mark a workflow step complete and navigate to the next step.
   * @param {string} stepKey - Step key from ARTIST_WORKFLOW_STEPS
   * @param {number} nextStep - Next step number to navigate to (0 = finish and go to portal)
   */
  const completeStepAndContinue = async (stepKey, nextStep) => {
    if (resolvedArtistId && stepKey) {
      await markWorkflowStepComplete(resolvedArtistId, stepKey);
    }

    const targetUrl = nextStep === 0 ? "/portal/artist" : buildArtistJoinHref(nextStep, resolvedArtistSlug);
    window.location.href = targetUrl;
  };

  const publishArtistProfile = async () => {
    if (!resolvedArtistId) {
      setPublishFeedback("Artist profile is missing an ID. Return to step 3 and try again.");
      return;
    }

    setIsPublishingProfile(true);
    setPublishFeedback("");

    try {
      const response = await fetch(`/api/workflows/artist/${resolvedArtistId}/publish`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          isPublished: true,
          enforceRequiredSteps: false,
        }),
      });

      if (!response.ok) {
        const message = await response.text();
        setPublishFeedback(message || "Unable to publish artist profile yet. Complete all required steps first.");
        return;
      }

      const portalUrl = resolvedArtistSlug ? `/portal/artist/${encodeURIComponent(resolvedArtistSlug)}` : "/portal/artist";
      window.location.href = portalUrl;
    } catch (error) {
      setPublishFeedback(error?.message || "Unable to publish artist profile yet.");
    } finally {
      setIsPublishingProfile(false);
    }
  };

  const pageMetaData = {
    title: "Join Artist",
    description: "Artist onboarding wizard with slug registration first and packeted DynaForm updates after.",
    keywords: "join, artist, registration",
    robots: "noindex, nofollow",
    og: {
      title: "Join Artist",
      description: "Artist onboarding wizard with slug registration first and packeted DynaForm updates after.",
    },
  };

  const pictureByUrl = useMemo(() => {
    const safePictures = Array.isArray(pictures) ? pictures : [];
    return safePictures.reduce((acc, picture) => {
      const url = String(picture?.url || picture?.URL || picture?.normalizedURL || picture?.NormalizedURL || "").trim().toLowerCase();
      if (url) {
        acc[url] = picture;
      }
      return acc;
    }, {});
  }, [pictures]);

  const pictureById = useMemo(() => {
    const safePictures = Array.isArray(pictures) ? pictures : [];
    return safePictures.reduce((acc, picture) => {
      const id = Number(picture?.pictureID || picture?.PictureID || 0);
      if (id > 0) {
        acc[id] = picture;
      }
      return acc;
    }, {});
  }, [pictures]);

  const knownArtistMediaUrls = useMemo(() => {
    const canonicalRoot = resolvedArtistId ? `platformpics/artists/${resolvedArtistId}/` : "";
    const legacyRoot = resolvedArtistId ? `platformpics/artistcontent/${resolvedArtistId}/` : "";

    const urlCandidates = [
      artistData?.profilePicURL,
      artistData?.ProfilePicURL,
      artistData?.coverPicURL,
      artistData?.CoverPicURL,
      artistData?.profilePictureURL,
      artistData?.ProfilePictureURL,
      artistData?.coverPictureURL,
      artistData?.CoverPictureURL,
      artistData?.profilePic,
      artistData?.ProfilePic,
      artistData?.coverPic,
      artistData?.CoverPic,
    ];

    const selectedProfilePicId = Number(artistData?.profilePicID || artistData?.ProfilePicID || 0);
    const selectedCoverPicId = Number(artistData?.coverPicID || artistData?.CoverPicID || 0);

    if (selectedProfilePicId > 0) {
      const selectedProfilePic = pictureById[selectedProfilePicId];
      urlCandidates.push(selectedProfilePic?.url, selectedProfilePic?.URL);
    }

    if (selectedCoverPicId > 0) {
      const selectedCoverPic = pictureById[selectedCoverPicId];
      urlCandidates.push(selectedCoverPic?.url, selectedCoverPic?.URL);
    }

    const safePictures = Array.isArray(pictures) ? pictures : [];
    safePictures.forEach((picture) => {
      const normalizedUrl = String(picture?.url || picture?.URL || "").trim().toLowerCase();
      if (!normalizedUrl) {
        return;
      }

      if ((canonicalRoot && normalizedUrl.includes(canonicalRoot)) || (legacyRoot && normalizedUrl.includes(legacyRoot))) {
        urlCandidates.push(normalizedUrl);
      }
    });

    return [...new Set(
      urlCandidates
        .map((value) => String(value || "").trim().toLowerCase())
        .filter(Boolean)
    )];
  }, [
    artistData?.CoverPic,
    artistData?.CoverPicURL,
    artistData?.CoverPictureURL,
    artistData?.CoverPicID,
    artistData?.ProfilePic,
    artistData?.ProfilePicURL,
    artistData?.ProfilePictureURL,
    artistData?.ProfilePicID,
    artistData?.coverPic,
    artistData?.coverPicURL,
    artistData?.coverPictureURL,
    artistData?.coverPicID,
    artistData?.profilePic,
    artistData?.profilePicURL,
    artistData?.profilePictureURL,
    artistData?.profilePicID,
    pictures,
    resolvedArtistId,
    pictureById,
  ]);

  const artistMediaRoot = useMemo(() => {
    if (!resolvedArtistId) {
      return "";
    }

    if (blobBackedMediaRoot) {
      return blobBackedMediaRoot;
    }

    const canonicalRoot = `platformpics/artists/${resolvedArtistId}/`;
    const legacyRoot = `platformpics/artistcontent/${resolvedArtistId}/`;
    const canonicalMatches = knownArtistMediaUrls.filter((url) => url.includes(canonicalRoot)).length;
    const legacyMatches = knownArtistMediaUrls.filter((url) => url.includes(legacyRoot)).length;
    const usesLegacyRoot = legacyMatches > canonicalMatches;

    return usesLegacyRoot ? legacyRoot : canonicalRoot;
  }, [blobBackedMediaRoot, knownArtistMediaUrls, resolvedArtistId]);

  useEffect(() => {
    if (!resolvedArtistId || activeStep !== 5) {
      return;
    }

    const canonicalRoot = `platformpics/artists/${resolvedArtistId}/`;
    const legacyRoot = `platformpics/artistcontent/${resolvedArtistId}/`;
    let isCancelled = false;

    const inspectRoot = async (prefix) => {
      try {
        const response = await fetch(`/api/image/list?container=tagpictures&startPrefix=${encodeURIComponent(prefix)}&prefix=${encodeURIComponent(prefix)}`);
        if (!response.ok) {
          return { hasContent: false, score: 0 };
        }

        const data = await response.json();
        const files = Array.isArray(data?.files) ? data.files : [];
        const directories = Array.isArray(data?.directories) ? data.directories : [];
        const score = files.length + (directories.length * 2);
        return { hasContent: score > 0, score };
      } catch {
        return { hasContent: false, score: 0 };
      }
    };

    const detectBlobBackedRoot = async () => {
      const [canonical, legacy] = await Promise.all([
        inspectRoot(canonicalRoot),
        inspectRoot(legacyRoot),
      ]);

      if (isCancelled) {
        return;
      }

      if (canonical.hasContent && !legacy.hasContent) {
        setBlobBackedMediaRoot(canonicalRoot);
        return;
      }

      if (legacy.hasContent && !canonical.hasContent) {
        setBlobBackedMediaRoot(legacyRoot);
        return;
      }

      if (canonical.hasContent && legacy.hasContent) {
        setBlobBackedMediaRoot(canonical.score >= legacy.score ? canonicalRoot : legacyRoot);
        return;
      }

      // If neither root currently has content, default to canonical.
      setBlobBackedMediaRoot(canonicalRoot);
    };

    detectBlobBackedRoot();

    return () => {
      isCancelled = true;
    };
  }, [activeStep, resolvedArtistId]);

  const galleryPrefix = useMemo(() => {
    if (!artistMediaRoot) return "";
    return `${artistMediaRoot}gallery/`;
  }, [artistMediaRoot]);

  const profilePrefix = useMemo(() => {
    if (!artistMediaRoot) return "";
    return `${artistMediaRoot}profile/`;
  }, [artistMediaRoot]);

  const coverPrefix = useMemo(() => {
    if (!artistMediaRoot) return "";
    return `${artistMediaRoot}cover/`;
  }, [artistMediaRoot]);

  const logoPrefix = useMemo(() => {
    if (!artistMediaRoot) return "";
    return `${artistMediaRoot}logo/`;
  }, [artistMediaRoot]);

  const getMostRecentActiveFile = (files) => {
    const safeFiles = Array.isArray(files) ? files : [];
    if (!safeFiles.length) {
      return null;
    }

    return [...safeFiles].sort((a, b) => {
      const aTime = new Date(a?.lastModified || 0).getTime();
      const bTime = new Date(b?.lastModified || 0).getTime();
      return bTime - aTime;
    })[0];
  };

  const activeProfileFile = useMemo(() => getMostRecentActiveFile(profileFiles), [profileFiles]);
  const activeCoverFile = useMemo(() => getMostRecentActiveFile(coverFiles), [coverFiles]);

  const selectedProfileFile = useMemo(() => {
    const profilePicId = Number(artistData?.profilePicID || artistData?.ProfilePicID || 0);
    if (!profilePicId) {
      return null;
    }

    const picture = pictureById[profilePicId];
    const url = String(picture?.url || picture?.URL || "").trim();
    if (!url) {
      return null;
    }

    return {
      name: url.split("/").pop() || `picture-${profilePicId}`,
      url,
      persistedPictureId: profilePicId,
      source: "selected",
    };
  }, [artistData?.ProfilePicID, artistData?.profilePicID, pictureById]);

  const selectedCoverFile = useMemo(() => {
    const coverPicId = Number(artistData?.coverPicID || artistData?.CoverPicID || 0);
    if (!coverPicId) {
      return null;
    }

    const picture = pictureById[coverPicId];
    const url = String(picture?.url || picture?.URL || "").trim();
    if (!url) {
      return null;
    }

    return {
      name: url.split("/").pop() || `picture-${coverPicId}`,
      url,
      persistedPictureId: coverPicId,
      source: "selected",
    };
  }, [artistData?.CoverPicID, artistData?.coverPicID, pictureById]);

  const resolvedActiveProfileFile = activeProfileFile || selectedProfileFile;
  const resolvedActiveCoverFile = activeCoverFile || selectedCoverFile;

  const activeProfilePictureId = useMemo(() => {
    if (!resolvedActiveProfileFile?.url) {
      return null;
    }

    const picture = pictureByUrl[String(resolvedActiveProfileFile.url).trim().toLowerCase()];
    return picture?.pictureID || picture?.PictureID || resolvedActiveProfileFile?.persistedPictureId || null;
  }, [pictureByUrl, resolvedActiveProfileFile]);

  const activeCoverPictureId = useMemo(() => {
    if (!resolvedActiveCoverFile?.url) {
      return null;
    }

    const picture = pictureByUrl[String(resolvedActiveCoverFile.url).trim().toLowerCase()];
    return picture?.pictureID || picture?.PictureID || resolvedActiveCoverFile?.persistedPictureId || null;
  }, [pictureByUrl, resolvedActiveCoverFile]);

  const refreshMediaFolderFiles = useCallback(async (prefix, setFiles) => {
    if (!prefix) {
      setFiles([]);
      return;
    }

    try {
      const response = await fetch(`/api/image/list?container=tagpictures&startPrefix=${encodeURIComponent(prefix)}&prefix=${encodeURIComponent(prefix)}`);
      if (!response.ok) {
        return;
      }

      const data = await response.json();
      const nextFiles = Array.isArray(data?.files) ? data.files : [];
      setFiles(nextFiles);
    } catch {
      // no-op
    }
  }, []);

  useEffect(() => {
    if (!resolvedArtistId || activeStep !== 5) {
      return;
    }

    refreshMediaFolderFiles(profilePrefix, setProfileFiles);
    refreshMediaFolderFiles(coverPrefix, setCoverFiles);
  }, [activeStep, coverPrefix, profilePrefix, refreshMediaFolderFiles, resolvedArtistId]);

  const refreshArtistContacts = useCallback(async () => {
    if (!resolvedArtistId) {
      return;
    }

    setLoadingContacts(true);
    try {
      const r = await fetch(`/api/contact/artist/${resolvedArtistId}?includePrivate=true`);
      if (!r.ok) {
        return;
      }

      const data = await r.json();
      const rows = Array.isArray(data.contacts) ? data.contacts : [];
      const isPrivateRow = (contact) => contact?.isPrivate === true || String(contact?.isPrivate || "").trim().toLowerCase() === "true";
      const secondaryRows = rows.filter((c) => !isPrivateRow(c));
      const internalRows = rows.filter((c) => isPrivateRow(c));

      setPublicPhoneContacts(secondaryRows.filter((c) => String(c?.contactType || "").toLowerCase() === "phone"));
      setPublicEmailContacts(secondaryRows.filter((c) => String(c?.contactType || "").toLowerCase() === "email"));
      setPublicAddressContacts(secondaryRows.filter((c) => String(c?.contactType || "").toLowerCase() === "address"));
      setPublicUrlContacts(secondaryRows.filter((c) => String(c?.contactType || "").toLowerCase() === "url" && String(c?.category || "").toLowerCase() === "website"));
      setPublicSocialContacts(secondaryRows.filter((c) => String(c?.contactType || "").toLowerCase() === "url" && String(c?.category || "").toLowerCase() !== "website"));

      setPrivatePhoneContacts(internalRows.filter((c) => String(c?.contactType || "").toLowerCase() === "phone"));
      setPrivateEmailContacts(internalRows.filter((c) => String(c?.contactType || "").toLowerCase() === "email"));
      setPrivateAddressContacts(internalRows.filter((c) => String(c?.contactType || "").toLowerCase() === "address"));
      setPrivateUrlContacts(internalRows.filter((c) => String(c?.contactType || "").toLowerCase() === "url" && String(c?.category || "").toLowerCase() === "website"));
    } catch {
      // no-op
    } finally {
      setLoadingContacts(false);
    }
  }, [resolvedArtistId]);

  useEffect(() => {
    if (activeStep !== 6 && activeStep !== 7) {
      return;
    }

    const refreshHandle = setTimeout(() => {
      refreshArtistContacts();
    }, 0);

    return () => clearTimeout(refreshHandle);
  }, [activeStep, refreshArtistContacts]);

  useEffect(() => {
    if (!resolvedArtistId) {
      return;
    }

    let ignore = false;
    const loadWorkflowSummary = async () => {
      setLoadingWorkflowSummary(true);
      try {
        const response = await fetch(`/api/workflows/artist/${resolvedArtistId}?workflowName=default`);
        if (!response.ok) {
          return;
        }

        const data = await response.json();
        if (!ignore) {
          setWorkflowSummary(data);
        }
      } catch {
        // no-op
      } finally {
        if (!ignore) {
          setLoadingWorkflowSummary(false);
        }
      }
    };

    loadWorkflowSummary();
    return () => {
      ignore = true;
    };
  }, [activeStep, resolvedArtistId]);

  const saveMediaSelection = async () => {
    if (!resolvedArtistId) {
      setMediaFeedback({ type: "error", message: "Artist ID is missing." });
      return;
    }

    setIsSavingMedia(true);
    setMediaFeedback({ type: "", message: "" });

    try {
      const response = await fetch(`/api/artist/byID/${resolvedArtistId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ProfilePicID: activeProfilePictureId || null,
          CoverPicID: activeCoverPictureId || null,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        setMediaFeedback({
          type: "error",
          message: errorText || `Unable to save media fields (${response.status}).`,
        });
        return;
      }

      setMediaFeedback({ type: "success", message: "Active profile and cover media synced from folders." });
    } catch (error) {
      setMediaFeedback({ type: "error", message: error.message || "Unable to save media selections." });
    } finally {
      setIsSavingMedia(false);
    }
  };

  return (
    <div className="min-h-screen bg-base-200 p-4 md:p-8">
      <TagSEO metadataProp={pageMetaData} canonicalSlug="join/artist" />

      <div className="max-w-5xl mx-auto space-y-6">
        <div className="card bg-base-100 shadow-lg border border-base-300">
          <div className="card-body gap-3">
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <h1 className="text-3xl font-bold text-base-content">Join as an Artist</h1>
              <Link href="/join" className="btn btn-sm btn-ghost">Back to Join</Link>
            </div>
            <p className="text-base-content/70">
              Artist post-slug setup: Step 3 complete profile, Step 4 add business details, Step 5 set profile and gallery media, Step 6 add business contact information, Step 7 configure public contacts, then Step 8 review and publish.
            </p>
          </div>
        </div>

        <div className="card bg-base-100 shadow border border-base-300">
          <div className="card-body gap-3">
            <div className="flex gap-2 flex-wrap">
              <Link href={buildArtistJoinHref(3, resolvedArtistSlug)} className={`btn btn-sm ${activeStep === 3 ? "btn-primary" : (showMissingIndicators && !stepCompletionMap[3]) ? "btn-warning btn-outline animate-pulse" : "btn-outline"}`}>
                 Profile
              </Link>
              <Link href={buildArtistJoinHref(4, resolvedArtistSlug)} className={`btn btn-sm ${activeStep === 4 ? "btn-primary" : (showMissingIndicators && !stepCompletionMap[4]) ? "btn-warning btn-outline animate-pulse" : "btn-outline"}`}>
                 Business Details
              </Link>
              <Link href={buildArtistJoinHref(5, resolvedArtistSlug)} className={`btn btn-sm ${activeStep === 5 ? "btn-primary" : (showMissingIndicators && !stepCompletionMap[5]) ? "btn-warning btn-outline animate-pulse" : "btn-outline"}`}>
                  Profile Media
              </Link>
              <Link href={buildArtistJoinHref(6, resolvedArtistSlug)} className={`btn btn-sm ${activeStep === 6 ? "btn-primary" : (showMissingIndicators && !stepCompletionMap[6]) ? "btn-warning btn-outline animate-pulse" : "btn-outline"}`}>
                  Business Contacts
              </Link>
              <Link href={buildArtistJoinHref(7, resolvedArtistSlug)} className={`btn btn-sm ${activeStep === 7 ? "btn-primary" : (showMissingIndicators && !stepCompletionMap[7]) ? "btn-warning btn-outline animate-pulse" : "btn-outline"}`}>
                 Public Contacts
              </Link>
              <Link href={buildArtistJoinHref(8, resolvedArtistSlug)} className={`btn btn-sm ${activeStep === 8 ? "btn-primary" : (showMissingIndicators && !stepCompletionMap[8]) ? "btn-warning btn-outline animate-pulse" : "btn-outline"}`}>
                 Review &amp; Publish
              </Link>
              {resolvedArtistId && <span className="badge badge-info">Artist ID: {resolvedArtistId}</span>}
            </div>

            {resolvedArtistId && (
              <>
                {loadingWorkflowSummary ? (
                  <div className="text-sm text-base-content/60">Loading progress…</div>
                ) : (
                  <>
                    <progress
                      className="progress progress-primary w-full"
                      value={postSlugPercentComplete}
                      max="100"
                    />
                    <div className="text-xs text-base-content/70">
                      {postSlugPercentComplete}% complete
                    </div>
                  </>
                )}
              </>
            )}
          </div>
        </div>

        {activeStep === 3 && resolvedArtistId && (
          <ProfileForm
            profileTitle={profileTitle}
            profileByline={profileByline}
            profileBiography={profileBiography}
            profileStatement={profileStatement}
            profileSeoTags={profileSeoTags}
            isSaving={isSavingProfileForm}
            error={profileFormError}
            onTitleChange={setProfileTitle}
            onBylineChange={setProfileByline}
            onBiographyChange={setProfileBiography}
            onStatementChange={setProfileStatement}
            onSeoTagsChange={setProfileSeoTags}
            onSave={async () => {
              if (!resolvedArtistId) {
                return;
              }

              const titleText = extractPlainText(profileTitle);
              if (!titleText) {
                setProfileFormError("Title is required.");
                return;
              }

              const seoValidation = validateSeoTags(profileSeoTags);
              if (!seoValidation.isValid) {
                setProfileFormError(seoValidation.message);
                return;
              }

              setProfileFormError("");
              setIsSavingProfileForm(true);

              try {
                const response = await fetch(`/api/artist/byID/${resolvedArtistId}`, {
                  method: "PUT",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({
                    title: profileTitle,
                    byline: profileByline.trim() || null,
                    biography: profileBiography.trim() || null,
                    statement: profileStatement.trim() || null,
                    seoTags: seoValidation.normalized || null,
                  }),
                });

                if (!response.ok) {
                  const errorText = await response.text();
                  setProfileFormError(errorText || `Unable to save profile (${response.status}).`);
                  return;
                }

                window.location.href = buildArtistJoinHref(4, resolvedArtistSlug);
              } catch (error) {
                setProfileFormError(error.message || "Unable to save profile details.");
              } finally {
                setIsSavingProfileForm(false);
              }
            }}
            backHref="/join/artist?step=2"
          />
        )}

        {activeStep === 4 && resolvedArtistId && (
          <BusinessDetailsForm
            city={city}
            stateOrProvince={stateOrProvince}
            zipCode={zipCode}
            country={country}
            businessEntityType={businessEntityType}
            incorporationStatus={incorporationStatus}
            incorporatedYear={incorporatedYear}
            isSaving={isSavingProfileForm}
            error={profileFormError}
            onCityChange={setCity}
            onStateChange={setStateOrProvince}
            onZipChange={setZipCode}
            onCountryChange={setCountry}
            onEntityTypeChange={setBusinessEntityType}
            onIncorporationStatusChange={setIncorporationStatus}
            onIncorporatedYearChange={setIncorporatedYear}
            onSave={async () => {
              if (!resolvedArtistId) {
                return;
              }

              const trimmedCountry = country.trim();
              const trimmedCity = city.trim();
              const trimmedStateOrProvince = stateOrProvince.trim();
              const trimmedZipCode = zipCode.trim();

              if (!incorporationStatus) {
                setProfileFormError("Incorporation status is required.");
                return;
              }

              if (!trimmedCity) {
                setProfileFormError("City is required.");
                return;
              }

              if (!trimmedCountry) {
                setProfileFormError("Country is required.");
                return;
              }

              if (!trimmedStateOrProvince) {
                setProfileFormError("State or province is required.");
                return;
              }

              if (!trimmedZipCode) {
                setProfileFormError("Zip or postal code is required.");
                return;
              }

              if (!businessEntityType) {
                setProfileFormError("Business entity type is required.");
                return;
              }

              const isIncorporated = incorporationStatus === "true";
              const parsedYear = incorporatedYear ? Number(incorporatedYear) : null;
              const validYear = parsedYear && parsedYear >= 1800 && parsedYear <= new Date().getFullYear() ? parsedYear : null;

              if (isIncorporated && incorporatedYear && !validYear) {
                setProfileFormError("Incorporated year must be a valid 4-digit year.");
                return;
              }

              setProfileFormError("");
              setIsSavingProfileForm(true);

              setArtistRegistrationProgress({
                title: extractPlainText(profileTitle),
                city: trimmedCity,
                country: trimmedCountry,
                stateOrProvince: trimmedStateOrProvince,
                zipCode: trimmedZipCode,
                businessEntityType,
                incorporationStatus,
                incorporatedYear: incorporatedYear || "",
              });

              try {
                const response = await fetch(`/api/artist/byID/${resolvedArtistId}`, {
                  method: "PUT",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({
                    city: trimmedCity,
                    country: trimmedCountry,
                    stateOrProvince: trimmedStateOrProvince,
                    zipCode: trimmedZipCode,
                    businessEntityType,
                    isFormallyIncorporated: isIncorporated,
                    incorporatedYear: isIncorporated ? validYear : null,
                  }),
                });

                if (!response.ok) {
                  const errorText = await response.text();
                  setProfileFormError(errorText || `Unable to save business details (${response.status}).`);
                  return;
                }

                window.location.href = buildArtistJoinHref(5, resolvedArtistSlug);
              } catch (error) {
                setProfileFormError(error.message || "Unable to save business details.");
              } finally {
                setIsSavingProfileForm(false);
              }
            }}
            backHref={buildArtistJoinHref(3, resolvedArtistSlug)}
          />
        )}

        {activeStep === 5 && resolvedArtistId && (
          <MediaUploadForm
            artistID={resolvedArtistId}
            artistLabel={`Artist: ${resolvedArtistId}`}
            sessionUser={sessionUser}
            activeProfileFile={resolvedActiveProfileFile}
            activeCoverFile={resolvedActiveCoverFile}
            artistMediaRoot={artistMediaRoot}
            logoPrefix={logoPrefix}
            galleryPrefix={galleryPrefix}
            profilePrefix={profilePrefix}
            coverPrefix={coverPrefix}
            mediaFeedback={mediaFeedback}
            isSaving={isSavingMedia}
            onSaveMediaSelection={saveMediaSelection}
            onProfileFilesChanged={setProfileFiles}
            onCoverFilesChanged={setCoverFiles}
            onContinue={() => completeStepAndContinue(ARTIST_REGISTRATION_STEPS.MEDIA_SETUP, 6)}
            backHref={buildArtistJoinHref(4, resolvedArtistSlug)}
            backLabel="Back to Business Details"
            continueLabel="Continue to Business Contacts"
            galleryItems={Array.isArray(artistData?.gallery?.galleryItems) ? artistData.gallery.galleryItems : []}
          />
        )}

        {activeStep === 6 && resolvedArtistId && (
          <PrivateContactsForm
            artistID={resolvedArtistId}
            businessAddressContacts={businessAddressContacts}
            businessPhoneContacts={businessPhoneContacts}
            businessEmailContacts={businessEmailContacts}
            businessUrlContacts={businessUrlContacts}
            loading={loadingContacts}
            error={privateContactRequirementError}
            onRefresh={refreshArtistContacts}
            onContinue={() => {
              setPrivateContactRequirementError("");
              completeStepAndContinue(ARTIST_REGISTRATION_STEPS.PRIVATE_CONTACTS, 7);
            }}
            backHref={buildArtistJoinHref(5, resolvedArtistSlug)}
            backLabel="Back to Profile Media"
            continueLabel="Continue to Public Contacts"
          />
        )}

        {activeStep === 7 && resolvedArtistId && (
          <PublicContactsForm
            artistID={resolvedArtistId}
            contactsTab={contactsTab}
            onTabChange={setContactsTab}
            publicAddressContacts={publicAddressContacts}
            publicEmailContacts={publicEmailContacts}
            publicPhoneContacts={publicPhoneContacts}
            publicSocialContacts={publicSocialContacts}
            publicUrlContacts={publicUrlContacts}
            loading={loadingContacts}
            onRefresh={refreshArtistContacts}
            onContinue={() => completeStepAndContinue(ARTIST_REGISTRATION_STEPS.PUBLIC_CONTACTS, 8)}
            backHref={buildArtistJoinHref(6, resolvedArtistSlug)}
            backLabel="Back to Business Contacts"
          />
        )}

        {activeStep === 8 && resolvedArtistId && (
          <ReviewAndPublishForm
            profileTitle={profileTitle}
            artistSlug={resolvedArtistSlug}
            businessAddressContacts={businessAddressContacts}
            businessPhoneContacts={businessPhoneContacts}
            businessEmailContacts={businessEmailContacts}
            publicAddressContacts={publicAddressContacts}
            publicEmailContacts={publicEmailContacts}
            publicPhoneContacts={publicPhoneContacts}
            publicSocialContacts={publicSocialContacts}
            publicUrlContacts={publicUrlContacts}
            postSlugPercentComplete={postSlugPercentComplete}
            isPublishing={isPublishingProfile}
            publishFeedback={publishFeedback}
            isPublished={stepCompletionMap[8]}
            stepCompletionMap={stepCompletionMap}
            onPublish={publishArtistProfile}
            backHref={buildArtistJoinHref(7, resolvedArtistSlug)}
            extractPlainText={extractPlainText}
          />
        )}
      </div>
    </div>
  );
}

export async function getArtistJoinServerProps(context, routeSlug = null, options = {}) {
  const session = await getSessionFromRequest(context);

  if (!session?.user?.id) {
    return {
      redirect: {
        destination: `/api/auth/signin?callbackUrl=${encodeURIComponent(context.resolvedUrl || "/join/artist")}`,
        permanent: false,
      },
    };
  }

  const strictPreSlugFlow = Boolean(options?.strictPreSlugFlow);
  const currentStep = getWizardStep(context.query?.step);
  let artistId = strictPreSlugFlow ? 0 : Number(context.query?.id || 0);
  const normalizedRouteSlug = String(routeSlug || "").trim().toLowerCase();
  const sessionUserId = Number(session?.user?.id || 0);

  let artistData = null;
  let pictures = [];

  try {
    const picturesResponse = await fetch(`/api/picture`);
    if (picturesResponse.ok) {
      pictures = await picturesResponse.json();
    }
  } catch (error) {
    console.error("Unable to load pictures:", error.message);
  }

  if (normalizedRouteSlug) {
    try {
      const response = await fetch(`/api/artist/${encodeURIComponent(normalizedRouteSlug)}`);
      if (response.ok) {
        artistData = await response.json();
        artistId = Number(artistData?.artistID || artistData?.ArtistID || 0);
      }
    } catch {
      // no-op
    }
  }

  if (!strictPreSlugFlow && !artistData && !(artistId > 0) && Number.isFinite(sessionUserId) && sessionUserId > 0) {
    try {
      const linkedResponse = await fetch(`/api/linker_usertoartist/byUserID/${sessionUserId}`);
      if (linkedResponse.ok) {
        const linkedArtists = await linkedResponse.json();
        const rows = Array.isArray(linkedArtists) ? linkedArtists : [];
        const latestArtistId = rows
          .map((artist) => Number(artist?.artistID || artist?.ArtistID || 0))
          .filter((value) => Number.isFinite(value) && value > 0)
          .sort((a, b) => b - a)[0];

        if (latestArtistId) {
          artistId = latestArtistId;
        }
      }
    } catch {
      // no-op
    }
  }

  if (!strictPreSlugFlow && !artistData && artistId > 0) {
    try {
      const response = await fetch(`/api/artist/byID/${artistId}`);
      if (response.ok) {
        artistData = await response.json();
      }
    } catch (error) {
      console.error("Unable to load artist by ID:", error.message);
    }
  }

  return {
    props: {
      sessionUser: session?.user || null,
      currentStep,
      artistId: artistId > 0 ? artistId : null,
      artistData,
      pictures,
    },
  };
}

export async function getServerSideProps(context) {
  const routeSlug = String(context?.params?.slug || "").trim().toLowerCase();
  return getArtistJoinServerProps(context, routeSlug, { strictPreSlugFlow: false });
}
