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
import CostCalculator from "@/components/listings/CostCalculator";
import ListingMediaManager from "@/components/listings/listing-media-manager";
import serverFetch from "@/libs/serverFetch"
import ListingSelector, { fetchArtistListings } from "@/components/listings/listing-selector";

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
            FromURL: `/portal/artist/${encodeURIComponent(props.artistSlug)}/listing/update/${props.listingId}`,
            redirectURL: `/portal/artist/${encodeURIComponent(props.artistSlug)}`,
            APIURL: `/api/listing/byID/${props.listingId}`
        };
    }, [props.metadataProp, props.listingId, props.artistSlug]);

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
            <ListingSelector
                artistSlug={props.artistSlug}
                listingId={props.listingId}
                currentListing={listingRecord}
                listings={props.listings}
                error={props.listingsError}
            />
            <DynaFormDB request="update" metadataProp={enhancedMetadata} fieldsProp={enhancedMetadata.forms_fields} formData={props.listingdata} />
            <details className="rounded-box border border-base-300 bg-base-100">
                <summary className="cursor-pointer p-4 text-lg font-semibold">Cost &amp; Margin Calculator</summary>
                <div className="p-4">
                    <p className="text-sm text-base-content/60 mb-4">
                        Update and save the cost breakdown for this listing below.
                    </p>
                    <CostCalculator key={props.listingId} listingId={props.listingId} saveMode="immediate" />
                </div>
            </details>
            <ListingMediaManager listingId={props.listingId} currentUser={props.currentUser} />
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
        artistId = listingRecord?.artistID || listingRecord?.ArtistID || null;

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
    let listings = [];
    let listingsError = null;
    if (artistId) {
        try {
            listings = await fetchArtistListings(artistId);
        } catch (error) {
            console.error("Unable to load listings for the listing editor:", error);
            listings = [];
            listingsError = "Other listings could not be loaded. You can still edit this listing or create a new one.";
        }
    }

    return {
        props: {
            listingdata: data,
            artistId,
            artistSlug,
            listingId,
            metadataProp: metadata,
            loadError,
            listings,
            listingsError,
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

