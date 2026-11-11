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
import React, { useMemo, useState, useRef, useCallback } from "react";
import TagSEO from "@/components/TagSEO";
import ArtistContextNav from "@/components/portal/ArtistContextNav";
import serverFetch from "@/libs/serverFetch";
import CostCalculator from "@/components/listings/CostCalculator";
import ListingSelector, { fetchArtistListings } from "@/components/listings/listing-selector";
import ListingMediaManager from "@/components/listings/listing-media-manager";
import { IoCalculatorOutline, IoChevronDownOutline, IoChevronUpOutline } from "react-icons/io5";

const formName = "ListingForm1";

/**
 * Component for updating user details.
 * @param {Object} props
 * @param {Object} props.data
 * @returns {JSX.Element}
 */
export default function CreateListingForm1(props) {
    const [showCalculator, setShowCalculator] = useState(false);
    const [costBreakdownData, setCostBreakdownData] = useState(null);
    const [savedListing, setSavedListing] = useState(null);
    const [saveError, setSaveError] = useState("");
    const costCalculatorRef = useRef(null);
    const listingId = savedListing?.listingID || savedListing?.ListingID || savedListing?.id || null;

    const enhancedMetadata = useMemo(() => {
        const base = Array.isArray(props.metadataProp)
            ? props.metadataProp[0]
            : props.metadataProp;

        if (!base || Object.keys(base).length === 0) {
            return null;
        }

        return {
            ...base,
            FromURL: `/portal/artist/${encodeURIComponent(props.artistSlug)}/listing/create`,
            redirectURL: "",
            APIURL: listingId ? `/api/listing/byID/${listingId}` : "/api/listing",
        };
    }, [props.metadataProp, props.artistSlug, listingId]);

    /**
     * Called by CostCalculator whenever a calculation is performed.
     * Stores the full breakdown payload so we can save it after listing creation.
     */
    const handleCostDataReady = useCallback((pricingResult, breakdownPayload) => {
        setCostBreakdownData(breakdownPayload);
    }, []);

    /**
     * Post-submit hook — called by DynaFormDB after successful listing creation.
     * Keeps the saved listing on this page and unlocks its media tools.
     * @param {Object} responseData - The API response from listing creation
     */
    const handlePostSubmit = useCallback(async (responseData) => {
        if (savedListing) return;

        const newListingId = Number(responseData?.listingID || responseData?.ListingID || responseData?.id);
        if (!Number.isSafeInteger(newListingId) || newListingId <= 0) {
            console.error("The created listing response did not contain a valid listing ID.");
            setSavedListing(responseData || {});
            setSaveError("The listing was saved, but its ID was not returned. Open it from your artist portal before continuing; do not create it again.");
            return;
        }

        setSavedListing({ ...responseData, listingID: newListingId });
        if (!costBreakdownData) return;

        try {
            const payload = {
                ...costBreakdownData,
                listingID: newListingId,
            };

            const res = await fetch('/api/ListingCostBreakdown', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            });

            if (!res.ok) {
                console.error("Failed to save cost breakdown for new listing:", await res.text());
                setSaveError("Your listing was saved, but the cost breakdown could not be saved. Use the calculator below to try saving it again.");
            } else if (process.env.NODE_ENV === 'development') {
                console.log("✅ Cost breakdown saved for listing", newListingId);
            }
        } catch (err) {
            console.error("Error saving cost breakdown:", err);
            setSaveError("Your listing was saved, but the cost breakdown could not be saved. Use the calculator below to try saving it again.");
        }
    }, [costBreakdownData, savedListing]);

    return (
        <div className="p-4">
            <TagSEO
                metadataProp={{
                    title: "Create Listing",
                    description: "Create a new artist listing.",
                    robots: "noindex, nofollow",
                    keywords: "artist portal, create listing",
                    og: {
                        title: "Create Listing",
                        description: "Create a new artist listing.",
                    },
                }}
                canonicalSlug="portal/artist/[slug]/listing/create"
            />
            <ArtistContextNav />
            <ListingSelector
                artistSlug={props.artistSlug}
                listings={props.listings}
                error={props.listingsError}
                listingId={listingId}
                currentListing={savedListing}
            />
            {listingId && (
                <div className="alert alert-success mb-4" role="status">Listing saved. Profile, cover, and gallery management are now available below.</div>
            )}
            {saveError && <div className="alert alert-error mb-4" role="alert">{saveError}</div>}
            {enhancedMetadata && (!savedListing || listingId) ? (
                <DynaFormDB
                    request={listingId ? "update" : "add"}
                    metadataProp={enhancedMetadata}
                    fieldsProp={enhancedMetadata.forms_fields}
                    formData={savedListing}
                    onPostSubmit={handlePostSubmit}
                />
            ) : !savedListing ? (
                <div className="p-10 text-center"><span className="loading loading-ghost loading-lg"></span></div>
            ) : null}

            {/* Cost & Margin Calculator Section */}
            <div className="mt-6">
                <button
                    type="button"
                    className="btn btn-outline btn-secondary w-full justify-between text-lg"
                    onClick={() => setShowCalculator(!showCalculator)}
                >
                    <span className="flex items-center gap-2">
                        <IoCalculatorOutline /> Cost & Margin Calculator
                    </span>
                    {showCalculator ? <IoChevronUpOutline /> : <IoChevronDownOutline />}
                </button>

                {showCalculator && (
                    <div className="mt-4 p-4 bg-base-100 rounded-box border border-base-300 shadow-sm">
                        <p className="text-sm text-base-content/60 mb-4">
                            {listingId ? "Update and save the cost breakdown for this listing below." : "Use the calculator below to determine your pricing. The cost breakdown will be saved automatically when you submit the listing above."}
                        </p>
                        <CostCalculator
                            ref={costCalculatorRef}
                            listingId={listingId}
                            onPriceCalculated={handleCostDataReady}
                            saveMode={listingId ? "immediate" : "deferred"}
                        />
                    </div>
                )}
            </div>
            <ListingMediaManager listingId={listingId} currentUser={props.currentUser} />
        </div>
    );
}

export async function getServerSideProps(context) {
    const artistSlug = context.params.slug;
    const session = await getServerSession(context.req, context.res, authOptions);

    if (!session?.user) {
        return {
            redirect: {
                destination: `/api/auth/signin?callbackUrl=${encodeURIComponent("/portal/artist/listing/create")}`,
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
            console.error("Unable to verify linked artists for listing create:", error.message);
        }
    }

    if (!isArtist(session) && !isStaff(session) && !isAdmin(session) && !hasLinkedArtist) {
        return {
            notFound: true,
        };
    }

    let metadata = {};
    try {
        let res = await serverFetch(`/formsmetadata/${formName}`);

        // Backward compatibility with older endpoint naming.
        if (!res.ok) {
            res = await serverFetch(`/forms_metadata/${formName}`);
        }

        if (res.ok) {
            metadata = await res.json();
        }
    } catch (error) {
        console.error("Error fetching form meta:", error);
    }

    let listings = [];
    let listingsError = null;
    try {
        const artistResponse = await serverFetch(`/artist/${encodeURIComponent(artistSlug)}`);
        if (!artistResponse.ok) throw new Error(`Artist request failed (${artistResponse.status}).`);
        const artist = await artistResponse.json();
        listings = await fetchArtistListings(artist?.artistID || artist?.ArtistID);
    } catch (error) {
        console.error("Unable to load listings for the listing creation page:", error);
        listingsError = "Existing listings could not be loaded. You can still create a new listing.";
    }

    return {
        props: {
            metadataProp: metadata,
            artistSlug,
            listings,
            listingsError,
            currentUser: {
                id: session.user.id || "",
                name: session.user.name || "",
                username: session.user.username || "",
            },
        }
    };
}

