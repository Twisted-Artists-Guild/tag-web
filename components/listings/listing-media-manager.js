import GalleryManager from "@/components/gallery/GalleryManager";

export default function ListingMediaManager({ listingId, currentUser }) {
    const rootPrefix = `platformpics/listing/${listingId}/`;

    return (
        <div className="mt-6 space-y-6">
            <details className="rounded-box border border-base-300 bg-base-100" open={Boolean(listingId)}>
                <summary className="cursor-pointer p-4 text-lg font-semibold">Profile &amp; Cover Pictures</summary>
                <div className="p-4">
                    {listingId ? (
                        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
                            {["profile", "cover"].map((folderKind) => (
                                <GalleryManager
                                    key={`${listingId}-${folderKind}`}
                                    entityType="listing"
                                    entityId={listingId}
                                    entityLabel={`Listing #${listingId}`}
                                    currentUser={currentUser}
                                    folderKind={folderKind}
                                    title={`${folderKind === "profile" ? "Profile" : "Cover"} Picture Uploader`}
                                    allowVideo={false}
                                    basePrefix={`${rootPrefix}${folderKind}/`}
                                    lockedRootPrefix={rootPrefix}
                                    singleImageMode
                                />
                            ))}
                        </div>
                    ) : (
                        <p>Save the listing above to unlock profile and cover uploads.</p>
                    )}
                </div>
            </details>
            <details className="rounded-box border border-base-300 bg-base-100" open={Boolean(listingId)}>
                <summary className="cursor-pointer p-4 text-lg font-semibold">Listing Gallery</summary>
                <div className="p-4">
                    {listingId ? (
                        <GalleryManager
                            key={`${listingId}-gallery`}
                            entityType="listing"
                            entityId={listingId}
                            entityLabel={`Listing #${listingId}`}
                            currentUser={currentUser}
                            folderKind="gallery"
                            title="Listing Gallery Manager"
                            basePrefix={`${rootPrefix}gallery/`}
                            lockedRootPrefix={rootPrefix}
                            allowVideo
                        />
                    ) : (
                        <p>Save the listing above to unlock its gallery.</p>
                    )}
                </div>
            </details>
        </div>
    );
}
