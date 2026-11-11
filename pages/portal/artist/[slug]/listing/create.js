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
    const costCalculatorRef = useRef(null);

    const enhancedMetadata = useMemo(() => {
        const base = Array.isArray(props.metadataProp)
            ? props.metadataProp[0]
            : props.metadataProp;

        if (!base || Object.keys(base).length === 0) {
            return null;
        }

        return {
            ...base,
            FromURL: "/portal/artist/listing/create.js",
            redirectURL: "/portal/artist/listing/",
            APIURL: `/api/listing`
        };
    }, [props.metadataProp]);

    /**
     * Called by CostCalculator whenever a calculation is performed.
     * Stores the full breakdown payload so we can save it after listing creation.
     */
    const handleCostDataReady = useCallback((pricingResult, breakdownPayload) => {
        setCostBreakdownData(breakdownPayload);
    }, []);

    /**
     * Post-submit hook — called by DynaFormDB after successful listing creation.
     * Saves the cost breakdown linked to the newly created listing.
     * @param {Object} responseData - The API response from listing creation
     */
    const handlePostSubmit = useCallback(async (responseData) => {
        if (!costBreakdownData) return; // No cost data to save

        const newListingId = responseData?.listingID || responseData?.ListingID || responseData?.id;
        if (!newListingId) {
            console.warn("Could not extract ListingID from response to save cost breakdown");
            return;
        }

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
            } else if (process.env.NODE_ENV === 'development') {
                console.log("✅ Cost breakdown saved for listing", newListingId);
            }
        } catch (err) {
            console.error("Error saving cost breakdown:", err);
        }
    }, [costBreakdownData]);

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
            />
            {enhancedMetadata ? (
                <DynaFormDB
                    request="add"
                    metadataProp={enhancedMetadata}
                    fieldsProp={enhancedMetadata.forms_fields}
                    formData={null}
                    onPostSubmit={handlePostSubmit}
                />
            ) : (
                <div className="p-10 text-center"><span className="loading loading-ghost loading-lg"></span></div>
            )}

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
                            Use the calculator below to determine your pricing. The cost breakdown will be saved automatically when you submit the listing above.
                        </p>
                        <CostCalculator
                            ref={costCalculatorRef}
                            listingId={null}
                            onPriceCalculated={handleCostDataReady}
                            saveMode="deferred"
                        />
                    </div>
                )}
            </div>
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
        }
    };
}

