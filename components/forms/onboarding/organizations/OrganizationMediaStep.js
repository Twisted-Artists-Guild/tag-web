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
}) {
  const entityLabel = `${context}: ${entitySlug || entityId}`
  const titlePrefix = `${context.charAt(0).toUpperCase()}${context.slice(1)}`
  const logoPrefix = profilePrefix
    ? profilePrefix.replace(/profile\/?$/i, "logo/")
    : `platformpics/${context}content/${entityId}/logo/`

  return (
    <OnboardingStepCard
      title="Step 5: Media and Gallery"
      description={`Uploader/content manager parity with artist, rooted at /platformpics/${context}content/{ID}.`}
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
        allowVideo
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
