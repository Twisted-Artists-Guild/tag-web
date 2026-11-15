import GalleryManager from "@/components/gallery/GalleryManager"
import OnboardingStepActions from "@/components/forms/onboarding/common/OnboardingStepActions"
import OnboardingStepCard from "@/components/forms/onboarding/common/OnboardingStepCard"

export default function OrganizationMediaStep({
  context,
  entityId,
  entitySlug,
  sessionUser,
  profilePrefix,
  coverPrefix,
  galleryPrefix,
  setProfileFiles,
  setCoverFiles,
  setLogoFiles,
  setGalleryFiles,
  backHref,
  backLabel = "Back to Primary Contacts",
  continueHref,
  continueLabel = "Continue to Public Contacts",
  title = "Step 5: Media and Gallery",
}) {
  const entityLabel = `${context}: ${entitySlug || entityId}`
  const titlePrefix = `${context.charAt(0).toUpperCase()}${context.slice(1)}`
  const logoPrefix = profilePrefix
    ? profilePrefix.replace(/profile\/?$/i, "logo/")
    : `platformpics/${context}/${entityId}/logo/`
  // Only venues can save an active profile and cover picture so far, so only they get "Set Active" on those two.
  const isVenue = context === "venue"

  return (
    <OnboardingStepCard
      title={title}
      description={isVenue
        ? "Add your venue's pictures. JPG, PNG, GIF or WebP, up to 10 MB each (logos up to 5 MB). To change the profile or cover picture, upload a new one or select one and choose Set Active."
        : `Manage ${context} media under platformpics/${context}/{ID}.`}
    >
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        <GalleryManager
          entityType={context}
          entityId={entityId}
          entityLabel={entityLabel}
          currentUser={sessionUser}
          folderKind="profile"
          title={`${titlePrefix} Profile Picture`}
          allowVideo={false}
          basePrefix={profilePrefix}
          singleImageMode={isVenue}
          onFilesChanged={setProfileFiles}
        />

        <GalleryManager
          entityType={context}
          entityId={entityId}
          entityLabel={entityLabel}
          currentUser={sessionUser}
          folderKind="cover"
          title={`${titlePrefix} Cover Picture`}
          allowVideo={false}
          basePrefix={coverPrefix}
          singleImageMode={isVenue}
          onFilesChanged={setCoverFiles}
        />
      </div>

      <GalleryManager
        entityType={context}
        entityId={entityId}
        entityLabel={entityLabel}
        currentUser={sessionUser}
        folderKind="logo"
        title={`${titlePrefix} Logo`}
        allowVideo={false}
        basePrefix={logoPrefix}
        singleImageMode
        allowDeleteSingleImage
        onFilesChanged={setLogoFiles}
      />

      <GalleryManager
        entityType={context}
        entityId={entityId}
        entityLabel={entityLabel}
        currentUser={sessionUser}
        folderKind="gallery"
        title={`${titlePrefix} Gallery`}
        allowVideo={!isVenue}
        basePrefix={galleryPrefix}
        onFilesChanged={setGalleryFiles}
      />

      <OnboardingStepActions
        backHref={backHref}
        backLabel={backLabel}
        continueLabel={continueLabel}
        onContinue={() => {
          window.location.href = continueHref
        }}
      />
    </OnboardingStepCard>
  )
}
