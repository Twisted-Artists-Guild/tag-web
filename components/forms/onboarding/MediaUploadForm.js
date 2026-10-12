import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import GalleryManager from "@/components/gallery/GalleryManager";

export default function MediaUploadForm({
  artistID,
  artistLabel,
  sessionUser,
  activeProfileFile,
  activeCoverFile,
  artistMediaRoot,
  logoPrefix,
  galleryPrefix,
  profilePrefix,
  coverPrefix,
  mediaFeedback,
  isSaving,
  onSaveMediaSelection,
  onProfileFilesChanged,
  onCoverFilesChanged,
  onContinue,
  backHref,
  backLabel = "Back to Business Contact Info",
  continueLabel = "Continue to Public Contacts",
  galleryItems = [],
}) {
  const [activeManager, setActiveManager] = useState("");

  const toggleManager = (managerKey) => {
    setActiveManager(activeManager === managerKey ? "" : managerKey);
  };

  return (
    <div className="card bg-base-100 shadow border border-base-300">
      <div className="card-body gap-4">
        <div>
          <h2 className="card-title">Profile Media Editor</h2>
          <p className="text-sm text-base-content/70">Manage media in standardized folders. Anything in the folder root is active; anything moved into a timestamped subfolder is archived.</p>
        </div>

        <div className="space-y-4">
          <div className="rounded-box border border-base-300 bg-base-200/40 p-4 space-y-3">
            <h3 className="font-semibold text-base-content">Business Logo</h3>
            <p className="text-sm text-base-content/70">Upload a brand logo separately from the owner profile photo. Replacing the active logo archives the previous version.</p>
            <GalleryManager
              entityType="artist"
              entityId={artistID}
              entityLabel={artistLabel}
              currentUser={sessionUser}
              folderKind="logo"
              title="Artist Logo Manager"
              allowVideo={false}
              basePrefix={logoPrefix}
              lockedRootPrefix={artistMediaRoot}
              singleImageMode
              allowDeleteSingleImage
            />
          </div>

          <div className="rounded-box border border-base-300 bg-base-200/40 p-4 space-y-3">
            <h3 className="font-semibold text-base-content">Active Profile Photo</h3>
            {activeProfileFile ? (
              <>
                <div className="relative h-48 rounded-box overflow-hidden bg-base-100 border border-base-300">
                  <Image src={activeProfileFile.url} alt="Active profile" fill className="object-contain" sizes="(max-width: 768px) 100vw, 50vw" />
                </div>
                <div className="text-xs text-base-content/70">
                  {activeProfileFile.source === "selected" ? `Saved selection: ${activeProfileFile.name}` : `Current root file: ${activeProfileFile.name}`}
                </div>
                <div className="flex justify-end gap-2">
                  <button type="button" className="btn btn-xs btn-outline" onClick={() => toggleManager("profile")}>
                    {activeManager === "profile" ? "Close Editor" : "Open Profile Editor"}
                  </button>
                </div>
              </>
            ) : (
              <div className="rounded-box border border-dashed border-base-300 bg-base-100 h-48 p-3 flex flex-col items-center justify-center gap-2 text-center">
                <div className="text-sm text-base-content/70">No active profile photo yet.</div>
                <button type="button" className="btn btn-xs btn-primary" onClick={() => toggleManager("profile")}>
                  {activeManager === "profile" ? "Close Editor" : "Upload Profile Photo"}
                </button>
              </div>
            )}

            {activeManager === "profile" && (
              <div className="rounded-box border border-base-300 bg-base-200/30 p-4 mt-3">
                <GalleryManager
                  entityType="artist"
                  entityId={artistID}
                  entityLabel={artistLabel}
                  currentUser={sessionUser}
                  folderKind="profile"
                  title="Profile Photo Manager"
                  allowVideo={false}
                  basePrefix={profilePrefix}
                  lockedRootPrefix={artistMediaRoot}
                  singleImageMode
                  onFilesChanged={onProfileFilesChanged}
                />
              </div>
            )}
          </div>

          <div className="rounded-box border border-base-300 bg-base-200/40 p-4 space-y-3">
            <h3 className="font-semibold text-base-content">Active Cover Photo</h3>
            {activeCoverFile ? (
              <>
                <div className="relative h-48 rounded-box overflow-hidden bg-base-100 border border-base-300">
                  <Image src={activeCoverFile.url} alt="Active cover" fill className="object-contain" sizes="(max-width: 768px) 100vw, 50vw" />
                </div>
                <div className="text-xs text-base-content/70">
                  {activeCoverFile.source === "selected" ? `Saved selection: ${activeCoverFile.name}` : `Current root file: ${activeCoverFile.name}`}
                </div>
                <div className="flex justify-end gap-2">
                  <button type="button" className="btn btn-xs btn-outline" onClick={() => toggleManager("cover")}>
                    {activeManager === "cover" ? "Close Editor" : "Open Cover Editor"}
                  </button>
                </div>
              </>
            ) : (
              <div className="rounded-box border border-dashed border-base-300 bg-base-100 h-48 p-3 flex flex-col items-center justify-center gap-2 text-center">
                <div className="text-sm text-base-content/70">No active cover photo yet.</div>
                <button type="button" className="btn btn-xs btn-primary" onClick={() => toggleManager("cover")}>
                  {activeManager === "cover" ? "Close Editor" : "Upload Cover Photo"}
                </button>
              </div>
            )}

            {activeManager === "cover" && (
              <div className="rounded-box border border-base-300 bg-base-200/30 p-4 mt-3">
                <GalleryManager
                  entityType="artist"
                  entityId={artistID}
                  entityLabel={artistLabel}
                  currentUser={sessionUser}
                  folderKind="cover"
                  title="Cover Photo Manager"
                  allowVideo={false}
                  basePrefix={coverPrefix}
                  lockedRootPrefix={artistMediaRoot}
                  singleImageMode
                  onFilesChanged={onCoverFilesChanged}
                />
              </div>
            )}
          </div>

          <div className="rounded-box border border-base-300 bg-base-200/40 p-4 space-y-3">
            <div>
              <h3 className="font-semibold text-base-content">Gallery</h3>
              <p className="text-xs text-base-content/70">{galleryItems.length} item{galleryItems.length !== 1 ? "s" : ""} in gallery</p>
            </div>

            {galleryItems.length > 0 ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                {galleryItems.slice(0, 8).map((item, idx) => {
                  const thumbUrl = item.picture?.thumbnailURL || item.picture?.url || item.video?.thumbnailURL;
                  return thumbUrl ? (
                    <div key={`${item.galleryItemID}-${idx}`} className="relative aspect-square rounded-md overflow-hidden bg-base-300 border border-base-300">
                      <Image src={thumbUrl} alt={`Gallery item ${idx + 1}`} fill className="object-cover" sizes="80px" />
                    </div>
                  ) : null;
                })}
              </div>
            ) : (
              <div className="text-sm text-base-content/60 text-center py-4">No gallery items yet.</div>
            )}

            <div className="flex justify-end">
              <button type="button" className="btn btn-xs btn-outline" onClick={() => toggleManager("gallery")}>
                {activeManager === "gallery" ? "Close Editor" : "Open Gallery Editor"}
              </button>
            </div>

            {activeManager === "gallery" && (
              <div className="rounded-box border border-base-300 bg-base-200/30 p-4 mt-3">
                <h3 className="font-semibold text-base-content mb-2">Gallery Media Tools</h3>
                <p className="text-sm text-base-content/70 mb-3">Root files in the gallery folder are active gallery entries. Archive older gallery media with the archive button.</p>
                <GalleryManager
                  entityType="artist"
                  entityId={artistID}
                  entityLabel={artistLabel}
                  currentUser={sessionUser}
                  folderKind="gallery"
                  title="Gallery Media Manager"
                  basePrefix={galleryPrefix}
                  lockedRootPrefix={artistMediaRoot}
                />
              </div>
            )}
          </div>
        </div>

        {mediaFeedback.message && (
          <div className={`alert ${mediaFeedback.type === "error" ? "alert-error" : "alert-success"}`}>
            <span>{mediaFeedback.message}</span>
          </div>
        )}

        <div className="flex gap-2 justify-between flex-wrap">
          <Link href={backHref} className="btn btn-sm btn-outline">{backLabel}</Link>
          <div className="flex gap-2">
            <button type="button" className="btn btn-sm btn-primary" onClick={onSaveMediaSelection} disabled={isSaving}>
              {isSaving ? "Saving..." : "Sync Active Profile + Cover"}
            </button>
            <button
              type="button"
              className="btn btn-sm btn-success"
              onClick={onContinue}
            >
              {continueLabel}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
