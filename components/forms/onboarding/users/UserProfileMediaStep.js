import GalleryManager from "@/components/gallery/GalleryManager"
import OnboardingStepActions from "@/components/forms/onboarding/common/OnboardingStepActions"
import OnboardingStepCard from "@/components/forms/onboarding/common/OnboardingStepCard"

export default function UserProfileMediaStep({
  sessionUser,
  userId,
  userProfilePrefix,
  userCoverPrefix,
  backHref,
  continueHref,
}) {
  return (
    <OnboardingStepCard
      title="Step 5: Profile Media Editor"
      description="Upload and manage media for your user account, then choose which images should serve as your profile and cover photos."
    >
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        <GalleryManager
          entityType="user"
          entityId={userId}
          entityLabel={`User: ${userId}`}
          currentUser={sessionUser}
          folderKind="profile"
          title="Profile Picture Uploader"
          allowVideo={false}
          basePrefix={userProfilePrefix}
          singleImageMode
        />

        <GalleryManager
          entityType="user"
          entityId={userId}
          entityLabel={`User: ${userId}`}
          currentUser={sessionUser}
          folderKind="cover"
          title="Cover Picture Uploader"
          allowVideo={false}
          basePrefix={userCoverPrefix}
          singleImageMode
        />
      </div>

      <OnboardingStepActions
        backHref={backHref}
        backLabel="Back to Privacy"
        continueLabel="Continue to Content Preferences"
        onContinue={() => {
          window.location.href = continueHref
        }}
      />
    </OnboardingStepCard>
  )
}
