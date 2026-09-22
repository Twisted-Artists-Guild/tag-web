/* This file is part of the Twisted Artists Guild project.

 Copyright (C) 2025 Twisted Artists Guild

 Licensed under the GNU General Public License v3.0
 (https://www.gnu.org/licenses/gpl-3.0.en.html).

 This software comes with NO WARRANTY; see the license for details.

 Open source · low-profit · human-first*/
import DynaFormDB from "@/components/widgets/DynaFormDB";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/pages/api/auth/[...nextauth]";
import { isAdmin, isArtist, isStaff } from "@/utils/authHelpers";
import React, { useMemo } from "react";
import TagSEO from "@/components/TagSEO";
import ArtistContextNav from "@/components/portal/ArtistContextNav";
import GalleryManager from "@/components/gallery/GalleryManager";
import ListingCard from "@/components/cards/card_listing";
import serverFetch from "@/libs/serverFetch"

const formName = "ListingForm1";

export default function UpdateListingForm2(props) {
    const enhancedMetadata = useMemo(() => {
        const base = Array.isArray(props.metadataProp)
            ? props.metadataProp[0]
            : props.metadataProp;

        if (!base || Object.keys(base).length === 0 || !props.listingId) {
            return null;
        }

        return {
            ...base,
            FromURL: "/portal/artist/listing/update/[slug]",
            redirectURL: `/portal/artist/listing/${props.listingId}`,
            APIURL: `/api/listing/byID/${props.listingId}`
        };
    }, [props.metadataProp, props.listingId]);

    if (props.loadError) {
        return (
            <div className="p-6">
                <div className="alert alert-error">
                    <span>{props.loadError}</span>
                </div>
            </div>
        );
    }

    if (!enhancedMetadata || !props.listingdata) {
        return (
            <div className="p-6">
                <div className="alert alert-warning">
                    <span>Listing editor is waiting for required data (metadata or listing payload).</span>
                </div>
            </div>
        );
    }

    const listingRecord = Array.isArray(props.listingdata) ? props.listingdata[0] : props.listingdata;
    const artistId = props.artistId || listingRecord?.artistID;

    const previewListing = listingRecord
        ? {
            ...listingRecord,
            path: listingRecord?.path || listingRecord?.Path || String(props.listingId || ""),
            artist: {
                ...(listingRecord?.artist || {}),
                path: props.artistSlug || listingRecord?.artist?.path || "",
                title: listingRecord?.artist?.title || "Artist",
                profilePic: listingRecord?.artist?.profilePic || {},
            },
        }
        : null;

    return (
        <div className="p-4 space-y-6">
            <TagSEO
                metadataProp={{
                    title: "Update Listing",
                    description: "Update an existing artist listing.",
                    robots: "noindex, nofollow",
                    keywords: "artist portal, update listing",
                    og: {
                        title: "Update Listing",
                        description: "Update an existing artist listing.",
                    },
                }}
                canonicalSlug="portal/artist/[slug]/listing/update/[L_slug]"
            />
            <ArtistContextNav />
            {props.listingId ? (
                <GalleryManager
                    entityType="listing"
                    entityId={props.listingId}
                    entityLabel={`Listing #${props.listingId}`}
                    currentUser={props.currentUser}
                />
            ) : (
                <div className="alert alert-warning">
                    <span>Gallery manager unavailable: listingId is missing.</span>
                </div>
            )}

            {previewListing && (
                <div className="rounded-box border border-base-300 bg-base-100 p-3">
                    <div className="mb-2 text-sm font-semibold text-base-content/80">Listing Preview (Gallery-Aware)</div>
                        
                            <ListingCard listing={previewListing} panelSize="full" showGalleryThumbnails />
                        
                </div>
            )}
            <DynaFormDB request="update" metadataProp={enhancedMetadata} fieldsProp={enhancedMetadata.forms_fields} formData={props.listingdata} />
        </div>
    );
}

export async function getServerSideProps(context) {
    const artistSlug = context.params?.slug || context.query?.slug;
    const listingSlugOrId = context.params?.L_slug || context.query?.L_slug || context.query?.id;

    const session = await getServerSession(context.req, context.res, authOptions);

    if (!session?.user) {
        return {
            redirect: {
                destination: `/api/auth/signin?callbackUrl=${encodeURIComponent(`/portal/artist/${artistSlug || ""}/listing/update/${listingSlugOrId || ""}`)}`,
                permanent: false,
            },
        };
    }

    const userId = session.user.id || null;
    let hasLinkedArtist = false;

    if (userId && !isArtist(session) && !isStaff(session) && !isAdmin(session)) {
        try {
            const linkedResponse = await serverFetch(`/linker_usertoartist/byUserID/${userId}`);
            if (linkedResponse.ok) {
                const linkedArtists = await linkedResponse.json();
                hasLinkedArtist = Array.isArray(linkedArtists) && linkedArtists.length > 0;
            }
        } catch (error) {
            console.error("Unable to verify linked artists for listing update:", error.message);
        }
    }

    if (!isArtist(session) && !isStaff(session) && !isAdmin(session) && !hasLinkedArtist) {
        return {
            notFound: true,
        };
    }

    if (!listingSlugOrId) {
        return {
            notFound: true,
        };
    }
    let data = {};
    let metadata = {};
    let artistId = null;
    let listingId = null;
    let loadError = null;

    const parseNumericId = (value) => {
        const numeric = Number(value);
        return Number.isInteger(numeric) && numeric > 0 ? numeric : null;
    };

    try {
        const numericListingId = parseNumericId(listingSlugOrId);

        if (numericListingId) {
            listingId = numericListingId;
            const byIdResponse = await serverFetch(`/listing/byID/${listingId}`);
            if (byIdResponse.ok) {
                data = await byIdResponse.json();
            } else {
                console.error(`Failed to fetch listing by ID ${listingId}: ${byIdResponse.status} ${byIdResponse.statusText}`);
                loadError = `Failed to fetch listing by ID ${listingId}: ${byIdResponse.status} ${byIdResponse.statusText}`;
            }
        } else {
            if (!artistSlug || artistSlug === "undefined") {
                loadError = "Missing artist slug in route. Open this editor from a valid artist portal URL.";
            }

            let byPathResponse = await serverFetch(`/listing/artist/${artistSlug}/listing/${listingSlugOrId}`);

            if (byPathResponse.ok) {
                data = await byPathResponse.json();
                const listingRecordFromPath = Array.isArray(data) ? data[0] : data;
                listingId = listingRecordFromPath?.listingID || listingRecordFromPath?.ListingID || null;

                if (listingId) {
                    const byIdResponse = await serverFetch(`/listing/byID/${listingId}`);
                    if (byIdResponse.ok) {
                        data = await byIdResponse.json();
                    }
                }
            } else {
                console.error(`Failed to fetch listing by slug/path ${listingSlugOrId}: ${byPathResponse.status} ${byPathResponse.statusText}`);
                loadError = `Failed to fetch listing by slug/path ${listingSlugOrId}: ${byPathResponse.status} ${byPathResponse.statusText}`;
            }
        }

        const listingRecord = Array.isArray(data) ? data[0] : data;
        listingId = listingId || listingRecord?.listingID || listingRecord?.ListingID || null;
        artistId = listingRecord?.artistID || null;

        if (!listingId && !loadError) {
            loadError = "Could not resolve listingId from route or payload.";
        }

        let res2 = await serverFetch(`/formsmetadata/${formName}`);

        // Backward compatibility with older endpoint naming.
        if (!res2.ok) {
            res2 = await serverFetch(`/forms_metadata/${formName}`);
        }

        if (res2.ok) {
            metadata = await res2.json();
        }
    } catch (error) {
        console.error("Error fetching form meta or field data:", error);
        loadError = error.message || "Unknown error while loading listing editor data.";
    }
    return {
        props: {
            listingdata: data,
            artistId,
            artistSlug,
            listingId,
            metadataProp: metadata,
            loadError,
            currentUser: session.user
                ? {
                                        id: session.user.id || "",
                    name: session.user.name || "",
                    email: session.user.email || "",
                    username: session.user.username || "",
                  }
                : null,
        }
    };
}

